import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { runCommand } from './process.mjs'
import { updateApplication } from './app-update.mjs'

const PACKAGE_NAME = 'brutalist-design-system'

function integrity(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`
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
  const tarball = Buffer.from('immutable package bytes')
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
  lock.packages[`node_modules/${PACKAGE_NAME}`] = { version: release.version, dev: true, resolved: `file:${release.packagePath}` }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`)
  await writeFile(join(appPath, 'node_modules', PACKAGE_NAME, 'package.json'), JSON.stringify({ name: PACKAGE_NAME, version: release.version }))
}

function fakeNpm(fixture, { failInstall = false, failCheck, failRestore = false, mutateDuringFailedCheck = false } = {}) {
  const commands = []
  const run = async (file, args, options = {}) => {
    commands.push({ file, args: [...args], cwd: options.cwd })
    if (file === 'git') return runCommand(file, args, options)
    assert.equal(file, 'npm')
    if (args[0] === 'install') {
      await installVersion(fixture.appPath, fixture.release)
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
