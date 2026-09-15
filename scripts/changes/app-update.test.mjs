import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { runCommand } from './process.mjs'
import { updateApplication } from './app-update.mjs'

const PACKAGE_NAME = 'brutalist-design-system'

function integrity(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`
}

function packageTarball(manifest) {
  const contents = Buffer.from(JSON.stringify(manifest))
  const header = Buffer.alloc(512)
  header.write('package/package.json')
  header.write('0000644\0', 100)
  header.write('0000000\0', 108)
  header.write('0000000\0', 116)
  header.write(`${contents.length.toString(8).padStart(11, '0')}\0`, 124)
  header.write('00000000000\0', 136)
  header.fill(0x20, 148, 156)
  header.write('0', 156)
  header.write('ustar\0', 257)
  header.write('00', 263)
  const checksum = header.reduce((sum, byte) => sum + byte, 0)
  header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148)
  return gzipSync(Buffer.concat([header, contents, Buffer.alloc((512 - contents.length % 512) % 512), Buffer.alloc(1024)]))
}

async function fixture({ requestId = 'app-1' } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'ds-app-update-'))
  const appPath = join(root, 'app')
  const dataDir = join(root, 'data')
  const packagePath = join(dataDir, 'releases', '0.1.0-change.1', 'package.tgz')
  const originalPackage = Buffer.from(`${JSON.stringify({
    name: 'consumer-app',
    private: true,
    scripts: { typecheck: 'node check-types.mjs', build: 'node build.mjs' },
    devDependencies: { [PACKAGE_NAME]: '0.1.0' },
  }, null, 2)}\n`)
  const originalLock = Buffer.from(`${JSON.stringify({
    name: 'consumer-app',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': { name: 'consumer-app', devDependencies: { [PACKAGE_NAME]: '0.1.0' } },
      [`node_modules/${PACKAGE_NAME}`]: { version: '0.1.0', dev: true },
    },
  }, null, 2)}\n`)
  const tarball = packageTarball({ name: PACKAGE_NAME, version: '0.1.0-change.1' })
  await mkdir(join(appPath, 'src'), { recursive: true })
  await mkdir(join(appPath, 'node_modules', PACKAGE_NAME), { recursive: true })
  await mkdir(dirname(packagePath), { recursive: true })
  await mkdir(join(dataDir, 'requests'), { recursive: true })
  await writeFile(join(appPath, 'package.json'), originalPackage)
  await writeFile(join(appPath, 'package-lock.json'), originalLock)
  await writeFile(join(appPath, 'src', 'user-work.txt'), 'original\n')
  await writeFile(join(appPath, 'node_modules', PACKAGE_NAME, 'package.json'), JSON.stringify({ name: PACKAGE_NAME, version: '0.1.0' }))
  await writeFile(packagePath, tarball)
  await writeFile(join(dataDir, 'requests', `${requestId}.json`), JSON.stringify({ input: { requestId, installedVersion: '0.1.0', component: 'Button', change: 'Change it' }, status: 'ready' }))
  await runCommand('git', ['init', '-b', 'main'], { cwd: appPath })
  await runCommand('git', ['config', 'user.name', 'App Test'], { cwd: appPath })
  await runCommand('git', ['config', 'user.email', 'app@example.invalid'], { cwd: appPath })
  await runCommand('git', ['add', 'package.json', 'package-lock.json', 'src/user-work.txt'], { cwd: appPath })
  await runCommand('git', ['commit', '-m', 'fixture'], { cwd: appPath })
  await writeFile(join(appPath, 'src', 'user-work.txt'), 'unsaved user work\n')

  const release = {
    version: '0.1.0-change.1',
    packagePath,
    integrity: integrity(tarball),
    sourceCommit: 'candidate-commit',
    summary: 'Changed Button.',
  }
  const config = { appPath, checkScripts: ['typecheck', 'build'], masterBranch: 'main', agentExecutable: 'codex', agentTimeoutMs: 1800000 }
  return { root, appPath, dataDir, requestId, originalPackage, originalLock, release, config }
}

async function installVersion(appPath, release) {
  const manifestPath = join(appPath, 'package.json')
  const lockPath = join(appPath, 'package-lock.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  manifest.devDependencies[PACKAGE_NAME] = `file:${release.packagePath}`
  const lock = JSON.parse(await readFile(lockPath, 'utf8'))
  lock.packages[''].devDependencies[PACKAGE_NAME] = `file:${release.packagePath}`
  lock.packages[`node_modules/${PACKAGE_NAME}`] = { version: release.version, dev: true, resolved: `file:${release.packagePath}`, integrity: release.integrity }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`)
  await writeFile(join(appPath, 'node_modules', PACKAGE_NAME, 'package.json'), JSON.stringify({ name: PACKAGE_NAME, version: release.version }))
}

function fakeNpm(fixture, { failInstall = false, failCheck, failRestore = false, mutateDuringFailedCheck = false, mutateDuringInstall = false, mutateLockDuringInstall = false, forgeDesignSystemEdge = false } = {}) {
  const commands = []
  const run = async (file, args, options = {}) => {
    commands.push({ file, args: [...args], cwd: options.cwd })
    if (file === 'git') return runCommand(file, args, options)
    assert.equal(file, 'npm')
    if (args[0] === 'install') {
      await installVersion(fixture.appPath, fixture.release)
      if (mutateDuringInstall) {
        const manifest = JSON.parse(await readFile(join(fixture.appPath, 'package.json'), 'utf8'))
        manifest.externalEdit = 'preserve me'
        await writeFile(join(fixture.appPath, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
      }
      if (mutateLockDuringInstall) {
        const lock = JSON.parse(await readFile(join(fixture.appPath, 'package-lock.json'), 'utf8'))
        lock.packages['node_modules/external-edit'] = { version: '1.0.0' }
        await writeFile(join(fixture.appPath, 'package-lock.json'), `${JSON.stringify(lock, null, 2)}\n`)
      }
      if (forgeDesignSystemEdge) {
        const lock = JSON.parse(await readFile(join(fixture.appPath, 'package-lock.json'), 'utf8'))
        lock.packages[`node_modules/${PACKAGE_NAME}`].dependencies = { 'external-edit': '1.0.0' }
        lock.packages['node_modules/external-edit'] = { version: '1.0.0' }
        await writeFile(join(fixture.appPath, 'package-lock.json'), `${JSON.stringify(lock, null, 2)}\n`)
      }
      if (failInstall) throw new Error('synthetic npm install failure')
      return { stdout: '', stderr: '' }
    }
    if (args[0] === 'ci') {
      if (failRestore) throw new Error('synthetic npm ci failure')
      await writeFile(join(fixture.appPath, 'node_modules', PACKAGE_NAME, 'package.json'), JSON.stringify({ name: PACKAGE_NAME, version: '0.1.0' }))
      return { stdout: '', stderr: '' }
    }
    if (args[0] === 'run') {
      if (args[1] === failCheck) {
        if (mutateDuringFailedCheck) await writeFile(join(fixture.appPath, 'package.json'), '{"concurrent":true}\n')
        throw new Error(`synthetic ${failCheck} failure`)
      }
      return { stdout: '', stderr: '' }
    }
    throw new Error(`unexpected command: ${file} ${args.join(' ')}`)
  }
  return { commands, run }
}

test('installs the exact release and runs configured app checks in order', async () => {
  const subject = await fixture()
  const npm = fakeNpm(subject)
  try {
    const result = await updateApplication({ ...subject, run: npm.run })
    assert.deepEqual(result, { status: 'installed' })
    assert.deepEqual(npm.commands.filter(({ file }) => file === 'npm').map(({ args }) => args), [
      ['install', '--save-exact', '--ignore-scripts', '--no-audit', '--no-fund', subject.release.packagePath],
      ['run', 'typecheck'],
      ['run', 'build'],
    ])
    assert.equal(JSON.parse(await readFile(join(subject.appPath, 'node_modules', PACKAGE_NAME, 'package.json'), 'utf8')).version, subject.release.version)
    assert.equal(await readFile(join(subject.appPath, 'src', 'user-work.txt'), 'utf8'), 'unsaved user work\n')
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('rejects a package checksum mismatch before touching the app', async () => {
  const subject = await fixture()
  const npm = fakeNpm(subject)
  try {
    subject.release.integrity = integrity('different bytes')
    const result = await updateApplication({ ...subject, run: npm.run })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /PACKAGE_CHECKSUM_MISMATCH/)
    assert.equal(npm.commands.some(({ file }) => file === 'npm'), false)
    assert.deepEqual(await readFile(join(subject.appPath, 'package.json')), subject.originalPackage)
    assert.deepEqual(await readFile(join(subject.appPath, 'package-lock.json')), subject.originalLock)
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('restores exact dependency bytes after an app check fails and preserves unrelated work', async () => {
  const subject = await fixture()
  const npm = fakeNpm(subject, { failCheck: 'build' })
  try {
    const result = await updateApplication({ ...subject, run: npm.run })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /APP_CHECK_FAILED/)
    assert.deepEqual(await readFile(join(subject.appPath, 'package.json')), subject.originalPackage)
    assert.deepEqual(await readFile(join(subject.appPath, 'package-lock.json')), subject.originalLock)
    assert.equal(await readFile(join(subject.appPath, 'src', 'user-work.txt'), 'utf8'), 'unsaved user work\n')
    assert.equal(npm.commands.some(({ args }) => args[0] === 'ci'), true)
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('restores dependency files after npm install fails partway through', async () => {
  const subject = await fixture()
  const npm = fakeNpm(subject, { failInstall: true })
  try {
    const result = await updateApplication({ ...subject, run: npm.run })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /APP_INSTALL_FAILED/)
    assert.deepEqual(await readFile(join(subject.appPath, 'package.json')), subject.originalPackage)
    assert.deepEqual(await readFile(join(subject.appPath, 'package-lock.json')), subject.originalLock)
    assert.equal(npm.commands.some(({ args }) => args[0] === 'ci'), true)
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('fails without mutation when dependency files are dirty or current versions disagree', async () => {
  const dirty = await fixture()
  const dirtyNpm = fakeNpm(dirty)
  try {
    await writeFile(join(dirty.appPath, 'package.json'), Buffer.concat([dirty.originalPackage, Buffer.from(' ')]))
    const result = await updateApplication({ ...dirty, run: dirtyNpm.run })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /DEPENDENCY_FILES_DIRTY/)
    assert.equal(dirtyNpm.commands.some(({ file }) => file === 'npm'), false)
  } finally { await rm(dirty.root, { recursive: true, force: true }) }

  const mismatch = await fixture()
  const mismatchNpm = fakeNpm(mismatch)
  try {
    const installedPath = join(mismatch.appPath, 'node_modules', PACKAGE_NAME, 'package.json')
    await writeFile(installedPath, JSON.stringify({ name: PACKAGE_NAME, version: '9.9.9' }))
    const result = await updateApplication({ ...mismatch, run: mismatchNpm.run })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /CURRENT_VERSION_MISMATCH/)
    assert.equal(mismatchNpm.commands.some(({ file }) => file === 'npm'), false)
  } finally { await rm(mismatch.root, { recursive: true, force: true }) }
})

test('reports dependency restoration failure and retains its recovery journal', async () => {
  const subject = await fixture()
  const npm = fakeNpm(subject, { failCheck: 'build', failRestore: true })
  try {
    const result = await updateApplication({ ...subject, run: npm.run })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /DEPENDENCY_RESTORE_FAILED/)
    const journal = JSON.parse(await readFile(join(subject.dataDir, 'app-updates', subject.requestId, 'journal.json'), 'utf8'))
    assert.equal(journal.phase, 'restore_failed')
    assert.ok(journal.previous.packageJson.data)
    assert.ok(journal.previous.packageLock.data)

    const recovery = fakeNpm(subject)
    const recovered = await updateApplication({ ...subject, run: recovery.run })
    assert.equal(recovered.status, 'failed')
    assert.match(recovered.error, /APP_CHECK_FAILED/)
    assert.equal(recovery.commands.some(({ args }) => args[0] === 'install'), false)
    assert.equal(JSON.parse(await readFile(join(subject.dataDir, 'app-updates', subject.requestId, 'journal.json'), 'utf8')).recoveredAfterInterruption, true)
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('does not overwrite dependency files changed by another writer during checks', async () => {
  const subject = await fixture()
  const npm = fakeNpm(subject, { failCheck: 'typecheck', mutateDuringFailedCheck: true })
  try {
    const result = await updateApplication({ ...subject, run: npm.run })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /ADOPTION_FILE_CONFLICT/)
    assert.equal(await readFile(join(subject.appPath, 'package.json'), 'utf8'), '{"concurrent":true}\n')
    assert.equal(npm.commands.some(({ args }) => args[0] === 'ci'), false)
    const journal = JSON.parse(await readFile(join(subject.dataDir, 'app-updates', subject.requestId, 'journal.json'), 'utf8'))
    assert.equal(journal.phase, 'conflict')
    assert.ok(journal.previous.packageJson.data)
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('recovers an interrupted prior install before accepting the next app update', async () => {
  const previous = await fixture({ requestId: 'previous' })
  try {
    const previousNpm = fakeNpm(previous, { failCheck: 'build', failRestore: true })
    const failed = await updateApplication({ ...previous, run: previousNpm.run })
    assert.match(failed.error, /DEPENDENCY_RESTORE_FAILED/)

    const nextRequestId = 'next'
    await writeFile(join(previous.dataDir, 'requests', `${nextRequestId}.json`), JSON.stringify({ input: { requestId: nextRequestId, installedVersion: '0.1.0', component: 'Button', change: 'Change it again' }, status: 'ready' }))
    const next = { ...previous, requestId: nextRequestId }
    const npm = fakeNpm(next)
    const result = await updateApplication({ ...next, run: npm.run })
    assert.equal(result.status, 'installed')
    const recovered = JSON.parse(await readFile(join(previous.dataDir, 'app-updates', 'previous', 'journal.json'), 'utf8'))
    assert.equal(recovered.phase, 'failed')
    assert.equal(recovered.recoveredAfterInterruption, true)
  } finally { await rm(previous.root, { recursive: true, force: true }) }
})

test('detects a dependency-file edit between validation and journaling', async () => {
  const subject = await fixture()
  const npm = fakeNpm(subject)
  let changed = false
  const run = async (file, args, options) => {
    const result = await npm.run(file, args, options)
    if (!changed && file === 'git' && args[0] === 'status') {
      changed = true
      await writeFile(join(subject.appPath, 'package.json'), '{"concurrent":true}\n')
    }
    return result
  }
  try {
    const result = await updateApplication({ ...subject, run })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /ADOPTION_FILE_CONFLICT/)
    assert.equal(npm.commands.some(({ file }) => file === 'npm'), false)
    assert.equal(await readFile(join(subject.appPath, 'package.json'), 'utf8'), '{"concurrent":true}\n')
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('serializes concurrent updates for the same application', async () => {
  const subject = await fixture()
  let releaseInstall
  const installGate = new Promise((done) => { releaseInstall = done })
  let installs = 0
  const npm = fakeNpm(subject)
  const run = async (file, args, options) => {
    if (file === 'npm' && args[0] === 'install') {
      installs += 1
      if (installs === 1) await installGate
    }
    return npm.run(file, args, options)
  }
  try {
    const first = updateApplication({ ...subject, run })
    while (installs === 0) await new Promise((done) => setTimeout(done, 5))
    const second = updateApplication({ ...subject, run })
    await new Promise((done) => setTimeout(done, 30))
    assert.equal(installs, 1)
    releaseInstall()
    assert.deepEqual(await Promise.all([first, second]), [{ status: 'installed' }, { status: 'installed' }])
    assert.equal(installs, 1)
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('adopts two successive immutable file releases after the app records the first update', async () => {
  const subject = await fixture({ requestId: 'first' })
  try {
    assert.deepEqual(await updateApplication({ ...subject, run: fakeNpm(subject).run }), { status: 'installed' })
    await runCommand('git', ['add', 'package.json', 'package-lock.json'], { cwd: subject.appPath })
    await runCommand('git', ['commit', '-m', 'adopt first release'], { cwd: subject.appPath })

    const requestId = 'second'
    const packagePath = join(subject.dataDir, 'releases', '0.1.0-change.2', 'package.tgz')
    const bytes = packageTarball({ name: PACKAGE_NAME, version: '0.1.0-change.2' })
    await mkdir(dirname(packagePath), { recursive: true })
    await writeFile(packagePath, bytes)
    await writeFile(join(subject.dataDir, 'requests', `${requestId}.json`), JSON.stringify({ input: { requestId, installedVersion: subject.release.version, component: 'Button', change: 'Change it twice' }, status: 'ready' }))
    const second = {
      ...subject,
      requestId,
      release: { ...subject.release, version: '0.1.0-change.2', packagePath, integrity: integrity(bytes) },
    }
    assert.deepEqual(await updateApplication({ ...second, run: fakeNpm(second).run }), { status: 'installed' })
    assert.equal(JSON.parse(await readFile(join(subject.appPath, 'node_modules', PACKAGE_NAME, 'package.json'), 'utf8')).version, '0.1.0-change.2')
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('treats an unrelated package edit made during npm install as an external conflict', async () => {
  const subject = await fixture()
  const npm = fakeNpm(subject, { mutateDuringInstall: true })
  try {
    const result = await updateApplication({ ...subject, run: npm.run })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /ADOPTION_FILE_CONFLICT/)
    assert.equal(JSON.parse(await readFile(join(subject.appPath, 'package.json'), 'utf8')).externalEdit, 'preserve me')
    assert.equal(npm.commands.some(({ args }) => args[0] === 'ci'), false)
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('treats an unrelated lock entry made during npm install as an external conflict', async () => {
  const subject = await fixture()
  const npm = fakeNpm(subject, { mutateLockDuringInstall: true })
  try {
    const result = await updateApplication({ ...subject, run: npm.run })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /ADOPTION_FILE_CONFLICT/)
    const lock = JSON.parse(await readFile(join(subject.appPath, 'package-lock.json'), 'utf8'))
    assert.equal(lock.packages['node_modules/external-edit'].version, '1.0.0')
    assert.equal(npm.commands.some(({ args }) => args[0] === 'ci'), false)
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('does not claim a forged design-system dependency edge and package as install output', async () => {
  const subject = await fixture()
  const npm = fakeNpm(subject, { forgeDesignSystemEdge: true })
  try {
    const result = await updateApplication({ ...subject, run: npm.run })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /ADOPTION_FILE_CONFLICT/)
    const lock = JSON.parse(await readFile(join(subject.appPath, 'package-lock.json'), 'utf8'))
    assert.deepEqual(lock.packages[`node_modules/${PACKAGE_NAME}`].dependencies, { 'external-edit': '1.0.0' })
    assert.equal(lock.packages['node_modules/external-edit'].version, '1.0.0')
    assert.equal(npm.commands.some(({ args }) => args[0] === 'ci'), false)
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('rejects a required release dependency that is missing from node_modules', async () => {
  const subject = await fixture()
  const bytes = packageTarball({ name: PACKAGE_NAME, version: subject.release.version, dependencies: { 'required-fixture': '1.0.0' } })
  subject.release.integrity = integrity(bytes)
  await writeFile(subject.release.packagePath, bytes)
  const npm = fakeNpm(subject)
  const run = async (file, args, options) => {
    const result = await npm.run(file, args, options)
    if (file === 'npm' && args[0] === 'install') {
      const lock = JSON.parse(await readFile(join(subject.appPath, 'package-lock.json'), 'utf8'))
      lock.packages[`node_modules/${PACKAGE_NAME}`].dependencies = { 'required-fixture': '1.0.0' }
      lock.packages['node_modules/required-fixture'] = { version: '1.0.0' }
      await writeFile(join(subject.appPath, 'package-lock.json'), `${JSON.stringify(lock, null, 2)}\n`)
    }
    return result
  }
  try {
    const result = await updateApplication({ ...subject, run })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /ADOPTION_FILE_CONFLICT/)
    assert.equal(JSON.parse(await readFile(join(subject.appPath, 'package-lock.json'), 'utf8')).packages['node_modules/required-fixture'].version, '1.0.0')
    assert.equal(npm.commands.some(({ args }) => args[0] === 'ci'), false)
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

function saved(bytes) {
  return { exists: true, data: bytes.toString('base64'), integrity: integrity(bytes) }
}

async function identities(appPath) {
  const describe = async (name) => {
    const bytes = await readFile(join(appPath, name))
    return { exists: true, size: bytes.length, integrity: integrity(bytes) }
  }
  return { packageJson: await describe('package.json'), packageLock: await describe('package-lock.json') }
}

async function seedInterruptedJournal(subject, { phase, originalIdentity, currentIdentity }) {
  const path = join(subject.dataDir, 'app-updates', 'interrupted', 'journal.json')
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify({
    schemaVersion: 1,
    requestId: 'interrupted',
    appPath: subject.appPath,
    release: { version: subject.release.version, packagePath: subject.release.packagePath, integrity: subject.release.integrity },
    previous: { packageJson: saved(subject.originalPackage), packageLock: saved(subject.originalLock) },
    originalIdentity,
    currentIdentity,
    phase,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }))
}

async function nextRequest(subject) {
  const requestId = 'after-interruption'
  await writeFile(join(subject.dataDir, 'requests', `${requestId}.json`), JSON.stringify({ input: { requestId, installedVersion: '0.1.0', component: 'Button', change: 'Continue after recovery' }, status: 'ready' }))
  return { ...subject, requestId }
}

test('recovers when an install was interrupted after changing only package.json', async () => {
  const subject = await fixture()
  try {
    const originalIdentity = await identities(subject.appPath)
    await installVersion(subject.appPath, subject.release)
    await writeFile(join(subject.appPath, 'package-lock.json'), subject.originalLock)
    await seedInterruptedJournal(subject, { phase: 'installing', originalIdentity, currentIdentity: originalIdentity })
    const next = await nextRequest(subject)
    assert.deepEqual(await updateApplication({ ...next, run: fakeNpm(next).run }), { status: 'installed' })
    const recovered = JSON.parse(await readFile(join(subject.dataDir, 'app-updates', 'interrupted', 'journal.json'), 'utf8'))
    assert.equal(recovered.phase, 'failed')
    assert.equal(recovered.recoveredAfterInterruption, true)
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('resumes a rollback interrupted between restoring package.json and package-lock.json', async () => {
  const subject = await fixture()
  try {
    const originalIdentity = await identities(subject.appPath)
    await installVersion(subject.appPath, subject.release)
    const currentIdentity = await identities(subject.appPath)
    await writeFile(join(subject.appPath, 'package.json'), subject.originalPackage)
    await seedInterruptedJournal(subject, { phase: 'restoring', originalIdentity, currentIdentity })
    const next = await nextRequest(subject)
    assert.deepEqual(await updateApplication({ ...next, run: fakeNpm(next).run }), { status: 'installed' })
    const recovered = JSON.parse(await readFile(join(subject.dataDir, 'app-updates', 'interrupted', 'journal.json'), 'utf8'))
    assert.deepEqual(recovered.restoreProgress, { packageJson: true, packageLock: true })
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('stale-lock reclamation does not admit concurrent app installers', async () => {
  const subject = await fixture()
  let releaseInstall
  const gate = new Promise((done) => { releaseInstall = done })
  let installs = 0
  const npm = fakeNpm(subject)
  const run = async (file, args, options) => {
    if (file === 'npm' && args[0] === 'install') {
      installs += 1
      if (installs === 1) await gate
    }
    return npm.run(file, args, options)
  }
  try {
    const key = createHash('sha256').update(subject.appPath).digest('hex')
    const lock = join(subject.dataDir, 'app-locks', `${key}.lock`)
    await mkdir(dirname(lock), { recursive: true })
    await writeFile(lock, JSON.stringify({ pid: 999_999_999, token: 'stale' }))
    const updates = Array.from({ length: 8 }, () => updateApplication({ ...subject, run }))
    while (installs === 0) await new Promise((done) => setTimeout(done, 5))
    await new Promise((done) => setTimeout(done, 50))
    const concurrentInstalls = installs
    releaseInstall()
    assert.ok((await Promise.all(updates)).every(({ status }) => status === 'installed'))
    assert.equal(concurrentInstalls, 1)
    assert.equal(installs, 1)
  } finally { await rm(subject.root, { recursive: true, force: true }) }
})

test('retries a reclaim guard that is still being initialized and then disappears', async () => {
  const subject = await fixture()
  const key = createHash('sha256').update(subject.appPath).digest('hex')
  const lock = join(subject.dataDir, 'app-locks', `${key}.lock`)
  const guard = `${lock}.reclaim`
  let initialize
  let release
  try {
    await mkdir(dirname(lock), { recursive: true })
    await writeFile(lock, JSON.stringify({ pid: 999_999_999, token: 'stale' }))
    await writeFile(guard, '')
    initialize = setTimeout(() => {
      writeFile(guard, JSON.stringify({ pid: process.pid, token: 'initializing' })).catch(() => {})
    }, 10)
    release = setTimeout(() => { rm(guard, { force: true }).catch(() => {}) }, 50)

    assert.deepEqual(await updateApplication({ ...subject, run: fakeNpm(subject).run }), { status: 'installed' })
  } finally {
    clearTimeout(initialize)
    clearTimeout(release)
    await rm(subject.root, { recursive: true, force: true })
  }
})

test('real npm adopts two successive local tarballs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ds-real-successive-'))
  const appPath = join(root, 'app')
  const dataDir = join(root, 'data')
  const run = (file, args, options = {}) => runCommand(file, args, { ...options, env: { ...process.env, npm_config_cache: join(root, 'npm-cache') } })
  try {
    const releases = []
    for (const version of ['1.0.0', '1.0.1', '1.0.2']) {
      const source = join(root, `package-${version}`)
      const destination = join(root, 'tarballs')
      await mkdir(source, { recursive: true })
      await mkdir(destination, { recursive: true })
      await writeFile(join(source, 'package.json'), JSON.stringify({ name: PACKAGE_NAME, version, type: 'module', exports: './index.js' }))
      await writeFile(join(source, 'index.js'), `export const version = ${JSON.stringify(version)}\n`)
      const packed = JSON.parse((await run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', destination, source], { cwd: root })).stdout)[0]
      const packagePath = join(destination, packed.filename)
      releases.push({ version, packagePath, integrity: integrity(await readFile(packagePath)), sourceCommit: `commit-${version}`, summary: `Release ${version}` })
    }
    await mkdir(appPath, { recursive: true })
    await writeFile(join(appPath, 'package.json'), `${JSON.stringify({ name: 'real-consumer', private: true, scripts: { check: 'node -e "process.exit(0)"' }, devDependencies: { [PACKAGE_NAME]: `file:${releases[0].packagePath}` } }, null, 2)}\n`)
    await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: appPath })
    await run('git', ['init', '-b', 'main'], { cwd: appPath })
    await run('git', ['config', 'user.name', 'App Test'], { cwd: appPath })
    await run('git', ['config', 'user.email', 'app@example.invalid'], { cwd: appPath })
    await run('git', ['add', 'package.json', 'package-lock.json'], { cwd: appPath })
    await run('git', ['commit', '-m', 'initial app'], { cwd: appPath })
    await mkdir(join(dataDir, 'requests'), { recursive: true })
    const config = { appPath, checkScripts: ['check'] }

    for (let index = 1; index < releases.length; index += 1) {
      const requestId = `real-${index}`
      await writeFile(join(dataDir, 'requests', `${requestId}.json`), JSON.stringify({ input: { requestId, installedVersion: releases[index - 1].version, component: 'Button', change: `Release ${index}` }, status: 'ready' }))
      assert.deepEqual(await updateApplication({ config, release: releases[index], dataDir, requestId, run }), { status: 'installed' })
      await run('git', ['add', 'package.json', 'package-lock.json'], { cwd: appPath })
      await run('git', ['commit', '-m', `adopt ${releases[index].version}`], { cwd: appPath })
    }
    assert.equal(JSON.parse(await readFile(join(appPath, 'node_modules', PACKAGE_NAME, 'package.json'), 'utf8')).version, '1.0.2')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('real npm accepts lockfile changes in the adopted package transitive graph', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ds-real-transitive-'))
  const appPath = join(root, 'app')
  const dataDir = join(root, 'data')
  const destination = join(root, 'tarballs')
  const run = (file, args, options = {}) => runCommand(file, args, { ...options, env: { ...process.env, npm_config_cache: join(root, 'npm-cache') } })
  const pack = async (name, version, dependencies = {}) => {
    const source = join(root, `${name.replaceAll('/', '-')}-${version}`)
    await mkdir(source, { recursive: true })
    await mkdir(destination, { recursive: true })
    await writeFile(join(source, 'package.json'), JSON.stringify({ name, version, dependencies }))
    await writeFile(join(source, 'index.js'), `module.exports = ${JSON.stringify(version)}\n`)
    const packed = JSON.parse((await run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', destination, source], { cwd: root })).stdout)[0]
    return join(destination, packed.filename)
  }
  try {
    const transitiveOne = await pack('ds-transitive-fixture', '1.0.0')
    const transitiveTwo = await pack('ds-transitive-fixture', '2.0.0')
    const firstPath = await pack(PACKAGE_NAME, '1.0.0', { 'ds-transitive-fixture': `file:${transitiveOne}` })
    const secondPath = await pack(PACKAGE_NAME, '1.0.1', { 'ds-transitive-fixture': `file:${transitiveTwo}` })
    const release = { version: '1.0.1', packagePath: secondPath, integrity: integrity(await readFile(secondPath)), sourceCommit: 'commit-1.0.1', summary: 'Release 1.0.1' }

    await mkdir(appPath, { recursive: true })
    await writeFile(join(appPath, 'package.json'), `${JSON.stringify({ name: 'real-consumer', private: true, scripts: { check: 'node -e "process.exit(0)"' }, devDependencies: { [PACKAGE_NAME]: `file:${firstPath}` } }, null, 2)}\n`)
    await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: appPath })
    await run('git', ['init', '-b', 'main'], { cwd: appPath })
    await run('git', ['config', 'user.name', 'App Test'], { cwd: appPath })
    await run('git', ['config', 'user.email', 'app@example.invalid'], { cwd: appPath })
    await run('git', ['add', 'package.json', 'package-lock.json'], { cwd: appPath })
    await run('git', ['commit', '-m', 'initial app'], { cwd: appPath })
    await mkdir(join(dataDir, 'requests'), { recursive: true })
    await writeFile(join(dataDir, 'requests', 'transitive.json'), JSON.stringify({ input: { requestId: 'transitive', installedVersion: '1.0.0', component: 'Button', change: 'Change transitive dependency' }, status: 'ready' }))

    assert.deepEqual(await updateApplication({ config: { appPath, checkScripts: ['check'] }, release, dataDir, requestId: 'transitive', run }), { status: 'installed' })
    assert.equal(JSON.parse(await readFile(join(appPath, 'node_modules', 'ds-transitive-fixture', 'package.json'), 'utf8')).version, '2.0.0')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('real npm accepts an omitted optional dependency excluded from the current platform', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ds-real-optional-platform-'))
  const appPath = join(root, 'app')
  const dataDir = join(root, 'data')
  const destination = join(root, 'tarballs')
  const run = (file, args, options = {}) => runCommand(file, args, { ...options, env: { ...process.env, npm_config_cache: join(root, 'npm-cache') } })
  const pack = async (directory, manifest) => {
    const source = join(root, directory)
    await mkdir(source, { recursive: true })
    await mkdir(destination, { recursive: true })
    await writeFile(join(source, 'package.json'), JSON.stringify(manifest))
    await writeFile(join(source, 'index.js'), `module.exports = ${JSON.stringify(manifest.version)}\n`)
    const packed = JSON.parse((await run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', destination, source], { cwd: root })).stdout)[0]
    return join(destination, packed.filename)
  }
  try {
    const excludedOs = process.platform === 'win32' ? 'linux' : 'win32'
    const optionalPath = await pack('optional-package', { name: 'ds-optional-platform-fixture', version: '1.0.0', os: [excludedOs] })
    const firstPath = await pack('design-system-1.0.0', { name: PACKAGE_NAME, version: '1.0.0' })
    const secondPath = await pack('design-system-1.0.1', { name: PACKAGE_NAME, version: '1.0.1', optionalDependencies: { 'ds-optional-platform-fixture': `file:${optionalPath}` } })
    const release = { version: '1.0.1', packagePath: secondPath, integrity: integrity(await readFile(secondPath)), sourceCommit: 'commit-1.0.1', summary: 'Release 1.0.1' }

    await mkdir(appPath, { recursive: true })
    await writeFile(join(appPath, 'package.json'), `${JSON.stringify({ name: 'real-consumer', private: true, scripts: { check: 'node -e "process.exit(0)"' }, devDependencies: { [PACKAGE_NAME]: `file:${firstPath}` } }, null, 2)}\n`)
    await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: appPath })
    await run('git', ['init', '-b', 'main'], { cwd: appPath })
    await run('git', ['config', 'user.name', 'App Test'], { cwd: appPath })
    await run('git', ['config', 'user.email', 'app@example.invalid'], { cwd: appPath })
    await run('git', ['add', 'package.json', 'package-lock.json'], { cwd: appPath })
    await run('git', ['commit', '-m', 'initial app'], { cwd: appPath })
    await mkdir(join(dataDir, 'requests'), { recursive: true })
    await writeFile(join(dataDir, 'requests', 'optional-platform.json'), JSON.stringify({ input: { requestId: 'optional-platform', installedVersion: '1.0.0', component: 'Button', change: 'Add optional platform package' }, status: 'ready' }))

    assert.deepEqual(await updateApplication({ config: { appPath, checkScripts: ['check'] }, release, dataDir, requestId: 'optional-platform', run }), { status: 'installed' })
    const lock = JSON.parse(await readFile(join(appPath, 'package-lock.json'), 'utf8'))
    assert.equal(lock.packages['node_modules/ds-optional-platform-fixture'].optional, true)
    await assert.rejects(readFile(join(appPath, 'node_modules', 'ds-optional-platform-fixture', 'package.json')), { code: 'ENOENT' })
  } finally { await rm(root, { recursive: true, force: true }) }
})
