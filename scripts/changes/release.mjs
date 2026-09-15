import { COPYFILE_EXCL } from 'node:constants'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { runCommand } from './process.mjs'

const RELEASE_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/

async function integrity(path) {
  return `sha512-${createHash('sha512').update(await readFile(path)).digest('base64')}`
}

function packedFilename(stdout) {
  let value
  try { value = JSON.parse(stdout) } catch { throw new Error('npm pack returned invalid JSON') }
  const filename = value?.[0]?.filename
  if (typeof filename !== 'string' || basename(filename) !== filename || !filename.endsWith('.tgz')) throw new Error('npm pack did not return a safe tarball filename')
  return filename
}

async function publishArtifact(sourcePath, destinationPath, expectedIntegrity) {
  try { await copyFile(sourcePath, destinationPath, COPYFILE_EXCL) }
  catch (error) {
    if (error.code !== 'EEXIST') throw error
    if (await integrity(destinationPath) !== expectedIntegrity) throw new Error('Existing release artifact checksum does not match')
    return
  }
  if (await integrity(destinationPath) !== expectedIntegrity) throw new Error('Published release artifact checksum does not match')
}

async function publishManifest(manifestPath, release) {
  try { await writeFile(manifestPath, `${JSON.stringify(release, null, 2)}\n`, { flag: 'wx', mode: 0o444 }) }
  catch (error) {
    if (error.code !== 'EEXIST') throw error
    let existing
    try { existing = JSON.parse(await readFile(manifestPath, 'utf8')) } catch { throw new Error('Existing release manifest is invalid') }
    if (JSON.stringify(existing) !== JSON.stringify(release)) throw new Error('Existing release manifest conflicts with the staged release')
  }
}

export async function createRelease({ candidateDir, dataDir, store, sourceCommit, summary, run = runCommand }) {
  if (!store || typeof store.reserveVersion !== 'function') throw new TypeError('store.reserveVersion is required')
  if (typeof sourceCommit !== 'string' || !sourceCommit.trim()) throw new TypeError('sourceCommit is required')
  if (typeof summary !== 'string' || !summary.trim()) throw new TypeError('summary is required')
  const candidate = resolve(candidateDir)
  const data = resolve(dataDir)
  const source = JSON.parse(await readFile(join(candidate, 'package.json'), 'utf8'))
  const version = await store.reserveVersion(source.version)
  if (!RELEASE_VERSION.test(version)) throw new Error('Reserved release version is invalid')

  const stagingRoot = join(data, 'release-staging')
  await mkdir(stagingRoot, { recursive: true })
  const stagingDir = await mkdtemp(join(stagingRoot, `${version}-`))
  try {
    await run(process.execPath, [join(candidate, 'scripts', 'atomic', 'build-library.mjs')], {
      cwd: candidate,
      env: { ...process.env, DS_RELEASE_VERSION: version },
      timeoutMs: 20 * 60 * 1000,
    })
    const packed = await run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', stagingDir, './dist-atomic-library'], {
      cwd: candidate,
      env: process.env,
      timeoutMs: 5 * 60 * 1000,
    })
    const filename = packedFilename(packed.stdout)
    const stagedPath = resolve(stagingDir, filename)
    if (dirname(stagedPath) !== stagingDir) throw new Error('npm pack returned a path outside the staging directory')
    const stagedIntegrity = await integrity(stagedPath)
    await run(process.execPath, [join(candidate, 'scripts', 'atomic', 'verify-consumer.mjs'), '--tarball', stagedPath], {
      cwd: candidate,
      env: process.env,
      timeoutMs: 20 * 60 * 1000,
    })
    if (await integrity(stagedPath) !== stagedIntegrity) throw new Error('Release artifact integrity changed during verification')

    const releaseDir = join(data, 'releases', version)
    await mkdir(releaseDir, { recursive: true })
    const packagePath = join(releaseDir, filename)
    const manifestPath = join(releaseDir, 'manifest.json')
    const release = { version, packagePath, integrity: stagedIntegrity, sourceCommit: sourceCommit.trim(), summary: summary.trim(), manifestPath }
    await publishArtifact(stagedPath, packagePath, stagedIntegrity)
    await publishManifest(manifestPath, release)
    if (await integrity(packagePath) !== stagedIntegrity) throw new Error('Release artifact checksum does not match its manifest')
    return release
  } finally {
    await rm(stagingDir, { recursive: true, force: true })
  }
}
