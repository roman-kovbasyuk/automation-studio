import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { join, resolve } from 'node:path'

const run = promisify(execFile)
const root = resolve(import.meta.dirname, '../..')
const builder = resolve(import.meta.dirname, 'build-library.mjs')
const verifier = resolve(import.meta.dirname, 'verify-consumer.mjs')
const artifactManifest = resolve(root, 'dist-atomic-library/package.json')

test('builder preserves the default atomic prerelease version', async () => {
  const env = { ...process.env }
  delete env.DS_RELEASE_VERSION
  await run(process.execPath, [builder], { cwd: root, env })
  assert.equal(JSON.parse(await readFile(artifactManifest, 'utf8')).version, '0.1.0-atomic.0')
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
