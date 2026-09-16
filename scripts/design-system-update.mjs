import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { checkComponentProps, checkStyleBoundary, checkExports, packageHashes, packageName, projectRoot, sha256, upstream, verifyDesignSystem } from './design-system-check.mjs'

// The external repository is read-only. Build in a disposable clone, never a sibling working tree.
const run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: 'inherit' })
const output = (command, args, cwd) => execFileSync(command, args, { cwd, encoding: 'utf8' }).trim()
const args = process.argv.slice(2)
if (args.some(arg => arg !== '--check')) throw new Error('Usage: npm run design-system:update [-- --check]')
const temporary = await mkdtemp(resolve(tmpdir(), 'brutalist-update-'))
const checkout = resolve(temporary, 'upstream')
const snapshot = {}
for (const file of ['package.json', 'package-lock.json']) snapshot[file] = await readFile(resolve(projectRoot, file), 'utf8')
console.log(`Preparing canonical package in ${temporary}`)
run('git', ['clone', '--depth=1', '--branch=main', '--single-branch', upstream, checkout], temporary)
const commit = output('git', ['rev-parse', 'HEAD'], checkout)
run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], checkout)
run('npm', ['run', 'build:library'], checkout)
run('npm', ['run', 'verify:consumer'], checkout)
const dist = resolve(checkout, 'dist-atomic-library')
const candidateExports = Object.keys(await import(pathToFileURL(resolve(dist, 'index.js')).href))
const metadata = JSON.parse(await readFile(resolve(dist, 'package.json'), 'utf8'))
if (metadata.name !== packageName) throw new Error('Unexpected upstream package name')
const packed = JSON.parse(output('npm', ['pack', './dist-atomic-library', '--ignore-scripts', '--json', '--pack-destination', temporary], checkout))[0]
const archive = resolve(temporary, packed.filename)
const artifact = `${packageName}-${metadata.version}-${commit.slice(0, 12)}.tgz`
const provenance = { repository: upstream, commit, version: metadata.version, artifact, sha256: sha256(await readFile(archive)), files: await packageHashes(dist) }
console.log(`Built candidate ${commit}. Artifact: ${archive}. Checking application compatibility before installation.`)
await checkExports(projectRoot, candidateExports)
await checkStyleBoundary(projectRoot, dist)
await checkComponentProps(projectRoot)
if (args.includes('--check')) {
  console.log(`Candidate ${commit} builds and supplies all current imports. No project files changed. Artifact: ${archive}`)
} else {
  for (const [file, before] of Object.entries(snapshot)) {
    if (await readFile(resolve(projectRoot, file), 'utf8') !== before) throw new Error(`${file} changed while preparing the update; refusing to overwrite concurrent work. Rerun the update.`)
  }
  const backup = resolve(temporary, 'consumer-before')
  await mkdir(backup)
  for (const [file, before] of Object.entries(snapshot)) await writeFile(resolve(backup, file), before)
  try { await copyFile(resolve(projectRoot, 'vendor/brutalist-design-system.json'), resolve(backup, 'brutalist-design-system.json')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  await copyFile(archive, resolve(projectRoot, 'vendor', artifact))
  run('npm', ['install', '--save-exact', '--ignore-scripts', '--no-audit', '--no-fund', `./vendor/${artifact}`], projectRoot)
  await writeFile(resolve(projectRoot, 'vendor/brutalist-design-system.json'), `${JSON.stringify(provenance, null, 2)}\n`)
  await verifyDesignSystem()
  console.log(`Installed candidate. Pre-update manifests are in ${backup}. Validation failure leaves this candidate visible for diagnosis; it is not a verified release.`)
  run('npm', ['run', 'test:design-system'], projectRoot)
  run('npm', ['exec', '--', 'vitest', 'run', 'src'], projectRoot)
  run('npm', ['run', 'build'], projectRoot)
  console.log(`Verified design-system refresh complete: ${commit}. Commit the archive, provenance, package.json, and package-lock.json together.`)
}
