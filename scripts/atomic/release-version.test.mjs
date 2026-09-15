import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { delimiter, join, resolve } from 'node:path'

const run = promisify(execFile)
const root = resolve(import.meta.dirname, '../..')
const builder = resolve(import.meta.dirname, 'build-library.mjs')
const verifier = resolve(import.meta.dirname, 'verify-consumer.mjs')
const artifactManifest = resolve(root, 'dist-atomic-library/package.json')

test('builder preserves the default atomic prerelease version', async () => {
  const env = { ...process.env }
  delete env.DS_RELEASE_VERSION
  await run(process.execPath, [builder], { cwd: root, env })
  const source = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  assert.equal(JSON.parse(await readFile(artifactManifest, 'utf8')).version, `${source.version}-atomic.0`)
})

test('builder applies an explicit validated release version', async () => {
  await run(process.execPath, [builder], { cwd: root, env: { ...process.env, DS_RELEASE_VERSION: '0.1.0-change.47' } })
  assert.equal(JSON.parse(await readFile(artifactManifest, 'utf8')).version, '0.1.0-change.47')
})

test('builder rejects an invalid explicit release version', async () => {
  const before = await readFile(artifactManifest, 'utf8')
  await assert.rejects(run(process.execPath, [builder], { cwd: root, env: { ...process.env, DS_RELEASE_VERSION: '0.1.0;touch-invalid' } }), /Invalid release version/)
  assert.equal(await readFile(artifactManifest, 'utf8'), before)
})

test('consumer verifier accepts --keep with exact-tarball mode', async () => {
  const missingTarball = join(root, 'missing-release.tgz')
  await assert.rejects(
    run(process.execPath, [verifier, '--keep', '--tarball', missingTarball], { cwd: root }),
    /Tarball does not exist/,
  )
})

test('exact-tarball verification rejects an installed version mismatch', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ds-verifier-'))
  const bin = join(workspace, 'bin')
  const tarball = join(workspace, 'brutalist-design-system-0.1.0-change.1.tgz')
  const fakeNpmModule = join(bin, 'fake-npm.mjs')
  const fakeNpm = join(bin, process.platform === 'win32' ? 'npm.cmd' : 'npm')
  await mkdir(bin)
  await writeFile(tarball, 'synthetic tarball')
  await writeFile(fakeNpmModule, `
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const [command] = process.argv.slice(2)
if (command === 'pack') {
  process.stdout.write(JSON.stringify([{ name: 'brutalist-design-system', version: '0.1.0-change.1', filename: 'brutalist-design-system-0.1.0-change.1.tgz' }]))
} else if (command === 'install') {
  const packageDir = join(process.cwd(), 'node_modules', 'brutalist-design-system')
  mkdirSync(packageDir, { recursive: true })
  writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'brutalist-design-system', version: '0.1.0-change.2' }))
} else {
  process.exitCode = 2
}
`)
  if (process.platform === 'win32') await writeFile(fakeNpm, `@"${process.execPath}" "%~dp0fake-npm.mjs" %*\r\n`)
  else {
    await writeFile(fakeNpm, `#!/usr/bin/env node\nimport './fake-npm.mjs'\n`)
    await chmod(fakeNpm, 0o755)
  }
  try {
    await assert.rejects(
      run(process.execPath, [verifier, '--tarball', tarball], { cwd: root, env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` } }),
      /Installed 0\.1\.0-change\.2; expected 0\.1\.0-change\.1/,
    )
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})
