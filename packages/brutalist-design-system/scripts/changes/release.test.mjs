import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { appendFile, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, isAbsolute, join } from 'node:path'
import { createRelease } from './release.mjs'
import { openStore } from './store.mjs'

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'ds-release-'))
  const candidateDir = join(root, 'candidate')
  const dataDir = join(root, 'data')
  await mkdir(join(candidateDir, 'scripts', 'atomic'), { recursive: true })
  await writeFile(join(candidateDir, 'package.json'), '{"version":"0.1.0"}\n')
  return { root, candidateDir, dataDir }
}

function fakeCommands({ tamperDuringVerification = false, failPack = false, packName = 'brutalist-design-system', packVersion } = {}) {
  const calls = []
  let version
  const run = async (file, args, options = {}) => {
    const call = { file, args: [...args], options }
    calls.push(call)
    if (file === process.execPath && basename(args[0]) === 'build-library.mjs') {
      version = options.env.DS_RELEASE_VERSION
      return { stdout: '', stderr: '' }
    }
    if (file === 'npm' && args[0] === 'pack') {
      if (failPack) throw new Error('pack failed')
      const destination = args[args.indexOf('--pack-destination') + 1]
      const filename = `brutalist-design-system-${version}.tgz`
      await writeFile(join(destination, filename), `archive:${version}`)
      return { stdout: JSON.stringify([{ filename, name: packName, version: packVersion ?? version }]), stderr: '' }
    }
    if (file === process.execPath && basename(args[0]) === 'verify-consumer.mjs') {
      call.tarballBytes = await readFile(args[2])
      if (tamperDuringVerification) await appendFile(args[2], ':tampered')
      return { stdout: 'verified', stderr: '' }
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`)
  }
  return { calls, run }
}

test('createRelease publishes an immutable manifest for the exact verified tarball', async () => {
  const { root, candidateDir, dataDir } = await fixture()
  const commands = fakeCommands()
  try {
    const release = await createRelease({ candidateDir, dataDir, store: openStore(dataDir), sourceCommit: 'abc123', summary: 'Button supports a busy label.', run: commands.run })
    const verifier = commands.calls.find((call) => basename(call.args[0] ?? '') === 'verify-consumer.mjs')
    assert.equal(verifier.args[1], '--tarball')
    assert.ok(isAbsolute(verifier.args[2]))
    assert.equal(basename(verifier.args[2]), basename(release.packagePath))
    assert.deepEqual(verifier.tarballBytes, await readFile(release.packagePath))
    assert.equal(release.version, '0.1.0-change.1')
    assert.equal(release.sourceCommit, 'abc123')
    assert.equal(release.summary, 'Button supports a busy label.')
    assert.equal(release.integrity, `sha512-${createHash('sha512').update(await readFile(release.packagePath)).digest('base64')}`)
    assert.deepEqual(JSON.parse(await readFile(release.manifestPath, 'utf8')), release)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('a failed pack consumes its reserved version', async () => {
  const { root, candidateDir, dataDir } = await fixture()
  try {
    await assert.rejects(createRelease({ candidateDir, dataDir, store: openStore(dataDir), sourceCommit: 'abc123', summary: 'Change', run: fakeCommands({ failPack: true }).run }), /pack failed/)
    assert.equal(await openStore(dataDir).reserveVersion('0.1.0'), '0.1.0-change.2')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('createRelease rejects a tarball changed during verification', async () => {
  const { root, candidateDir, dataDir } = await fixture()
  try {
    await assert.rejects(createRelease({ candidateDir, dataDir, store: openStore(dataDir), sourceCommit: 'abc123', summary: 'Change', run: fakeCommands({ tamperDuringVerification: true }).run }), /integrity|checksum|changed/i)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('createRelease rejects npm pack metadata for another package or version', async () => {
  for (const options of [{ packName: 'other-package' }, { packVersion: '0.1.0-change.999' }]) {
    const { root, candidateDir, dataDir } = await fixture()
    try {
      await assert.rejects(
        createRelease({ candidateDir, dataDir, store: openStore(dataDir), sourceCommit: 'abc123', summary: 'Change', run: fakeCommands(options).run }),
        /package name|package version/i,
      )
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
})

test('recovery publishes a manifest after interruption left only the artifact', async () => {
  const { root, candidateDir, dataDir } = await fixture()
  const store = { reserveVersion: async () => '0.1.0-change.8' }
  try {
    const first = await createRelease({ candidateDir, dataDir, store, sourceCommit: 'abc123', summary: 'Change', run: fakeCommands().run })
    const artifactBefore = await readFile(first.packagePath)
    await unlink(first.manifestPath)
    const recovered = await createRelease({ candidateDir, dataDir, store, sourceCommit: 'abc123', summary: 'Change', run: fakeCommands().run })
    assert.deepEqual(JSON.parse(await readFile(recovered.manifestPath, 'utf8')), recovered)
    assert.deepEqual(await readFile(recovered.packagePath), artifactBefore)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('recovery accepts the same immutable artifact and rejects a modified one', async () => {
  const { root, candidateDir, dataDir } = await fixture()
  const store = { reserveVersion: async () => '0.1.0-change.9' }
  try {
    const first = await createRelease({ candidateDir, dataDir, store, sourceCommit: 'abc123', summary: 'Change', run: fakeCommands().run })
    const recovered = await createRelease({ candidateDir, dataDir, store, sourceCommit: 'abc123', summary: 'Change', run: fakeCommands().run })
    assert.deepEqual(recovered, first)
    await appendFile(first.packagePath, ':modified')
    await assert.rejects(createRelease({ candidateDir, dataDir, store, sourceCommit: 'abc123', summary: 'Change', run: fakeCommands().run }), /integrity|checksum/i)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
