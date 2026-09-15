import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { openStore } from './store.mjs'
import { runCommand } from './process.mjs'
import { drainQueue, processRequest } from './worker.mjs'

const input = { requestId: 'r1', installedVersion: '0.1.0', component: 'Button', change: 'Add an optional busy label.' }

async function fakeFixture() {
  const root = await mkdtemp(join(tmpdir(), 'ds-worker-'))
  const repositoryDir = join(root, 'repository')
  const dataDir = join(root, 'data')
  await mkdir(repositoryDir, { recursive: true })
  const store = openStore(dataDir)
  await store.submit(input)
  return { root, repositoryDir, dataDir, store }
}

function fakeGit({ dirtyAfterCommit = false, failVerify = false, failPromotion = false, stopAfterAdd = false, stopAfterRebase = false } = {}) {
  const commands = []
  let mainHead = 'base-commit'
  let candidateHead = 'base-commit'
  let candidateChanged = false
  let staged = false
  let committed = false
  let addStopped = false
  let rebaseStopped = false
  const run = async (file, args, options = {}) => {
    const command = [file, ...args].join(' ')
    commands.push(command)
    if (file === 'git' && args[0] === 'rev-parse' && args[1] === 'refs/heads/main') return { stdout: `${mainHead}\n`, stderr: '' }
    if (file === 'git' && args[0] === 'branch') return { stdout: 'main\n', stderr: '' }
    if (file === 'git' && args[0] === 'worktree') {
      const candidateDir = args[3]
      await mkdir(join(candidateDir, 'src', 'atomic'), { recursive: true })
      await writeFile(join(candidateDir, 'package.json'), '{"version":"0.1.0"}\n')
      return { stdout: '', stderr: '' }
    }
    if (file === 'npm' && args.join(' ') === 'ci') return { stdout: '', stderr: '' }
    if (file === 'npm' && args.join(' ') === 'run verify') {
      if (failVerify) throw new Error('verification failed')
      return { stdout: '', stderr: '' }
    }
    if (file === 'git' && args[0] === 'status') {
      if (!options.cwd.includes('worktrees')) return { stdout: '', stderr: '' }
      if (dirtyAfterCommit && committed) return { stdout: ' M package.json\n', stderr: '' }
      if (!candidateChanged) return { stdout: '', stderr: '' }
      return { stdout: staged ? 'M  src/atomic/Button.js\n' : ' M src/atomic/Button.js\n', stderr: '' }
    }
    if (file === 'git' && args[0] === 'add') {
      staged = true
      if (stopAfterAdd && !addStopped) { addStopped = true; throw Object.assign(new Error('worker stopped after staging'), { code: 'WORKER_STOPPED' }) }
      return { stdout: '', stderr: '' }
    }
    if (file === 'git' && args.includes('commit')) { candidateHead = 'candidate-commit'; candidateChanged = false; staged = false; committed = true; return { stdout: '', stderr: '' } }
    if (file === 'git' && args[0] === 'diff' && args[1] === '--name-only') return { stdout: candidateHead === 'agent-commit' ? 'package.json\nsrc/atomic/Button.js\n' : 'src/atomic/Button.js\n', stderr: '' }
    if (file === 'git' && args[0] === 'rebase' && args[1] !== '--abort') {
      candidateHead = 'rebased-candidate'
      candidateChanged = false
      staged = false
      committed = true
      if (stopAfterRebase && !rebaseStopped) { rebaseStopped = true; throw Object.assign(new Error('worker stopped after rebase'), { code: 'WORKER_STOPPED' }) }
      return { stdout: '', stderr: '' }
    }
    if (file === 'git' && args[0] === 'rebase' && args[1] === '--abort') return { stdout: '', stderr: '' }
    if (file === 'git' && args[0] === 'merge-base') return { stdout: '', stderr: '' }
    if (file === 'git' && args[0] === 'rev-parse' && args[1] === '--git-path') return { stdout: `${join(options.cwd, '.git', args[2])}\n`, stderr: '' }
    if (file === 'git' && args[0] === 'rev-parse' && args[1] === 'HEAD') return { stdout: `${options.cwd.includes('worktrees') ? candidateHead : mainHead}\n`, stderr: '' }
    if (file === 'git' && args[0] === 'merge') {
      if (failPromotion) throw new Error('fast-forward failed')
      mainHead = args.at(-1)
      return { stdout: '', stderr: '' }
    }
    throw new Error(`unexpected command: ${command}`)
  }
  return {
    commands,
    run,
    changed() { candidateChanged = true },
    committedUnexpectedChange() { candidateHead = 'agent-commit'; committed = true },
    advanceMain() { mainHead = 'advanced-main' },
  }
}

async function successfulRelease({ dataDir, sourceCommit, summary }) {
  const packagePath = join(dataDir, 'releases', '0.1.0-change.1', 'package.tgz')
  await mkdir(dirname(packagePath), { recursive: true })
  await writeFile(packagePath, 'package bytes')
  return {
    version: '0.1.0-change.1',
    packagePath,
    integrity: `sha512-${createHash('sha512').update('package bytes').digest('base64')}`,
    sourceCommit,
    summary,
    manifestPath: join(dirname(packagePath), 'manifest.json'),
  }
}

test('failed agent output never verifies or promotes main', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit()
  try {
    const result = await processRequest({
      ...fixture,
      requestId: 'r1',
      run: git.run,
      implement: async () => ({ outcome: 'failed', summary: 'Could not implement.', error: 'Requirements are ambiguous.' }),
      release: successfulRelease,
    })
    assert.equal(result.status, 'failed')
    assert.equal(git.commands.includes('npm run verify'), false)
    assert.equal(git.commands.some((command) => command.startsWith('git merge --ff-only')), false)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('failed verification never promotes main', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit({ failVerify: true })
  try {
    const result = await processRequest({
      ...fixture,
      requestId: 'r1',
      run: git.run,
      implement: async ({ candidateDir }) => {
        git.changed()
        await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const busy = true\n')
        return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
      },
      release: successfulRelease,
    })
    assert.equal(result.status, 'failed')
    assert.equal(git.commands.some((command) => command.startsWith('git merge --ff-only')), false)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('verification precedes promotion and failed promotion never returns ready', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit({ failPromotion: true })
  try {
    const result = await processRequest({
      ...fixture,
      requestId: 'r1',
      run: git.run,
      implement: async ({ candidateDir }) => {
        git.changed()
        await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const busy = true\n')
        return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
      },
      release: successfulRelease,
    })
    const commands = git.commands
    assert.ok(commands.findIndex((command) => command === 'npm run verify') < commands.findIndex((command) => command.startsWith('git merge --ff-only')))
    assert.equal(result.status, 'failed')
    assert.equal(commands.some((command) => command.startsWith('git reset --hard')), false)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('generated changes outside the allowed scope fail before packaging', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit({ dirtyAfterCommit: true })
  let releases = 0
  try {
    const result = await processRequest({
      ...fixture,
      requestId: 'r1',
      run: git.run,
      implement: async ({ candidateDir }) => {
        git.changed()
        await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const busy = true\n')
        return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
      },
      release: async (options) => { releases += 1; return successfulRelease(options) },
    })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /unexpected|scope|clean/i)
    assert.equal(releases, 0)
    assert.equal(git.commands.some((command) => command.startsWith('git merge --ff-only')), false)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('an agent commit cannot hide an out-of-scope tracked change behind an allowed dirty edit', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit()
  let releases = 0
  try {
    const result = await processRequest({
      ...fixture,
      requestId: 'r1',
      run: git.run,
      implement: async ({ candidateDir }) => {
        git.committedUnexpectedChange()
        git.changed()
        await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const busy = true\n')
        return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
      },
      release: async (options) => { releases += 1; return successfulRelease(options) },
    })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /committed candidate.*unexpected paths.*package\.json/i)
    assert.equal(releases, 0)
    assert.equal(git.commands.includes('npm run verify'), false)
    assert.equal(git.commands.some((command) => command.startsWith('git merge --ff-only')), false)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('a crash after worker-owned git add resumes staging without treating it as agent work', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit({ stopAfterAdd: true })
  let implementations = 0
  try {
    const options = {
      ...fixture,
      requestId: 'r1',
      run: git.run,
      implement: async ({ candidateDir }) => {
        implementations += 1
        git.changed()
        await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const busy = true\n')
        return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
      },
      release: successfulRelease,
    }
    await assert.rejects(processRequest(options), /stopped after staging/)
    const result = await processRequest(options)
    assert.equal(result.status, 'ready')
    assert.equal(implementations, 1)
    assert.equal(git.commands.filter((command) => command.startsWith('git add --')).length, 2)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('a crash after rebase reconciles candidate HEAD without rerunning the rebase or agent', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit({ stopAfterRebase: true })
  let implementations = 0
  let releases = 0
  const release = async (options) => {
    releases += 1
    if (releases === 1) git.advanceMain()
    const built = await successfulRelease(options)
    return { ...built, version: `0.1.0-change.${releases}` }
  }
  try {
    const options = {
      ...fixture,
      requestId: 'r1',
      run: git.run,
      implement: async ({ candidateDir }) => {
        implementations += 1
        git.changed()
        await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const busy = true\n')
        return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
      },
      release,
    }
    await assert.rejects(processRequest(options), /stopped after rebase/)
    const result = await processRequest(options)
    assert.equal(result.status, 'ready')
    assert.equal(implementations, 1)
    assert.equal(releases, 2)
    assert.equal(git.commands.filter((command) => command.startsWith('git rebase advanced-main')).length, 1)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('a stopped worker resumes the packaged phase without invoking the agent twice', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit()
  let implementations = 0
  let releases = 0
  const implement = async ({ candidateDir }) => {
    implementations += 1
    git.changed()
    await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const busy = true\n')
    return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
  }
  const release = async (options) => {
    releases += 1
    if (releases === 1) throw Object.assign(new Error('worker stopped'), { code: 'WORKER_STOPPED' })
    return successfulRelease(options)
  }
  try {
    await assert.rejects(processRequest({ ...fixture, requestId: 'r1', run: git.run, implement, release }), /worker stopped/)
    const result = await processRequest({ ...fixture, requestId: 'r1', run: git.run, implement, release })
    assert.equal(result.status, 'ready')
    assert.equal(implementations, 1)
    assert.equal(releases, 2)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('a failed ready-result write is recovered after promotion without reimplementation or repackaging', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit()
  let implementations = 0
  let releases = 0
  let failReadyOnce = true
  const store = {
    ...fixture.store,
    update: async (id, patch) => {
      if (patch.status === 'ready' && failReadyOnce) {
        failReadyOnce = false
        throw new Error('simulated result publication failure')
      }
      return fixture.store.update(id, patch)
    },
  }
  try {
    const options = {
      ...fixture,
      store,
      requestId: 'r1',
      run: git.run,
      implement: async ({ candidateDir }) => {
        implementations += 1
        git.changed()
        await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const busy = true\n')
        return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
      },
      release: async (releaseOptions) => { releases += 1; return successfulRelease(releaseOptions) },
    }
    const interrupted = await processRequest(options)
    assert.equal(interrupted.status, 'failed')
    assert.match(interrupted.error, /promotion succeeded.*recovery/i)
    const recovered = await processRequest(options)
    assert.equal(recovered.status, 'ready')
    assert.equal(implementations, 1)
    assert.equal(releases, 1)
    assert.equal(git.commands.filter((command) => command.startsWith('git merge --ff-only')).length, 1)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('records successful app adoption separately from package readiness', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit()
  let adoptions = 0
  try {
    const result = await processRequest({
      ...fixture,
      requestId: 'r1',
      run: git.run,
      implement: async ({ candidateDir }) => {
        git.changed()
        await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const busy = true\n')
        return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
      },
      release: successfulRelease,
      adopt: async ({ requestId, release }) => {
        adoptions += 1
        assert.equal(requestId, 'r1')
        assert.equal(release.version, '0.1.0-change.1')
        return { status: 'installed' }
      },
    })
    assert.equal(result.status, 'ready')
    assert.deepEqual(result.adoption, { status: 'installed' })
    assert.equal(adoptions, 1)
  } finally { await rm(fixture.root, { recursive: true, force: true }) }
})

test('keeps a verified package ready when app adoption fails', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit()
  try {
    const result = await processRequest({
      ...fixture,
      requestId: 'r1',
      run: git.run,
      implement: async ({ candidateDir }) => {
        git.changed()
        await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const busy = true\n')
        return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
      },
      release: successfulRelease,
      adopt: async () => ({ status: 'failed', error: 'APP_CHECK_FAILED: build failed' }),
    })
    assert.equal(result.status, 'ready')
    assert.equal(result.version, '0.1.0-change.1')
    assert.deepEqual(result.adoption, { status: 'failed', error: 'APP_CHECK_FAILED: build failed' })
  } finally { await rm(fixture.root, { recursive: true, force: true }) }
})

test('drainQueue claims queued requests under the worker lock in creation order', async () => {
  const fixture = await fakeFixture()
  let lockCalls = 0
  const store = {
    ...fixture.store,
    withWorkerLock: async (fn) => { lockCalls += 1; return fixture.store.withWorkerLock(fn) },
  }
  try {
    await new Promise((done) => setTimeout(done, 5))
    await fixture.store.submit({ ...input, requestId: 'r2' })
    const seen = []
    const results = await drainQueue({
      ...fixture,
      store,
      process: async ({ requestId }) => {
        seen.push(requestId)
        await fixture.store.update(requestId, { status: 'failed', error: 'synthetic completion' })
        return { requestId, status: 'failed', error: 'synthetic completion' }
      },
    })
    assert.deepEqual(seen, ['r1', 'r2'])
    assert.equal(results.length, 2)
    assert.ok(lockCalls >= 2)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('drainQueue resumes a ready package whose app adoption is still pending', async () => {
  const fixture = await fakeFixture()
  try {
    await fixture.store.update('r1', {
      status: 'ready',
      release: await successfulRelease({ dataDir: fixture.dataDir, sourceCommit: 'candidate-commit', summary: 'Button changed.' }),
      candidateCommit: 'candidate-commit',
      adoption: { status: 'pending' },
    })
    const seen = []
    await drainQueue({
      ...fixture,
      process: async ({ requestId }) => {
        seen.push(requestId)
        return fixture.store.update(requestId, { status: 'ready', adoption: { status: 'installed' } })
      },
    })
    assert.deepEqual(seen, ['r1'])
    assert.deepEqual((await fixture.store.get('r1')).adoption, { status: 'installed' })
  } finally { await rm(fixture.root, { recursive: true, force: true }) }
})

test('pending adoption uses its immutable ready package after main advances', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit()
  git.advanceMain()
  const release = await successfulRelease({ dataDir: fixture.dataDir, sourceCommit: 'candidate-commit', summary: 'Button changed.' })
  try {
    await fixture.store.update('r1', { status: 'ready', release, candidateCommit: 'candidate-commit', adoption: { status: 'pending' } })
    const result = await processRequest({
      ...fixture,
      requestId: 'r1',
      run: git.run,
      adopt: async () => ({ status: 'installed' }),
    })
    assert.equal(result.status, 'ready')
    assert.deepEqual(result.adoption, { status: 'installed' })
  } finally { await rm(fixture.root, { recursive: true, force: true }) }
})

test('drainQueue durably fails a ready record whose immutable package is missing', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit()
  const release = await successfulRelease({ dataDir: fixture.dataDir, sourceCommit: 'candidate-commit', summary: 'Button changed.' })
  try {
    await fixture.store.update('r1', { status: 'ready', release, candidateCommit: 'candidate-commit', adoption: { status: 'pending' } })
    await rm(release.packagePath)
    let calls = 0
    const results = await drainQueue({
      ...fixture,
      run: git.run,
      adopt: async () => ({ status: 'installed' }),
      process: async (options) => { calls += 1; return processRequest(options) },
    })
    assert.equal(results.length, 1)
    assert.equal(calls, 1)
    assert.equal(results[0].status, 'failed')
    assert.equal((await fixture.store.get('r1')).status, 'failed')
    assert.equal((await fixture.store.listWorking()).length, 0)
  } finally { await rm(fixture.root, { recursive: true, force: true }) }
})

test('drainQueue recovers an unfinished journal before claiming new work', async () => {
  const fixture = await fakeFixture()
  try {
    await fixture.store.submit({ ...input, requestId: 'r2' })
    const journalsDir = join(fixture.dataDir, 'journals')
    await mkdir(journalsDir, { recursive: true })
    await writeFile(join(journalsDir, 'r2.json'), JSON.stringify({ requestId: 'r2', phase: 'verifying', ownerPid: 999_999_999, updatedAt: new Date().toISOString() }))
    const seen = []
    await drainQueue({
      ...fixture,
      process: async ({ requestId }) => {
        seen.push(requestId)
        await fixture.store.update(requestId, { status: 'failed', error: 'synthetic completion' })
        return { requestId, status: 'failed', error: 'synthetic completion' }
      },
    })
    assert.deepEqual(seen, ['r2', 'r1'])
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('drainQueue stops after the active request and leaves later requests queued', async () => {
  const fixture = await fakeFixture()
  let stopped = false
  try {
    await fixture.store.submit({ ...input, requestId: 'r2' })
    const seen = []
    await drainQueue({
      ...fixture,
      shouldStop: () => stopped,
      process: async ({ requestId }) => {
        seen.push(requestId)
        await fixture.store.update(requestId, { status: 'failed', error: 'synthetic completion' })
        stopped = true
        return { requestId, status: 'failed', error: 'synthetic completion' }
      },
    })
    assert.deepEqual(seen, ['r1'])
    assert.deepEqual((await fixture.store.listWorking()).map(({ requestId }) => requestId), ['r2'])
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('Observatory task lookup does not confuse request r1 with r10', async () => {
  const fixture = await fakeFixture()
  const git = fakeGit()
  await mkdir(join(fixture.repositoryDir, 'observatory'), { recursive: true })
  await writeFile(join(fixture.repositoryDir, 'observatory', 'cli.mjs'), '')
  let addCalls = 0
  let assignedTaskId
  const run = async (file, args, options) => {
    if (file === process.execPath && args[0].endsWith('/observatory/cli.mjs')) {
      if (args[1] === 'list') return { stdout: JSON.stringify([{ id: 'task-r10', description: 'Design-system request ID: r10. [design-system-request:r10]' }]), stderr: '' }
      if (args[1] === 'add') { addCalls += 1; return { stdout: JSON.stringify({ id: 'task-r1' }), stderr: '' } }
      if (args[1] === 'update') return { stdout: JSON.stringify({ id: args[2] }), stderr: '' }
    }
    return git.run(file, args, options)
  }
  try {
    const result = await processRequest({
      ...fixture,
      requestId: 'r1',
      run,
      implement: async ({ candidateDir, taskId }) => {
        assignedTaskId = taskId
        git.changed()
        await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const busy = true\n')
        return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
      },
      release: successfulRelease,
    })
    assert.equal(result.status, 'ready')
    assert.equal(addCalls, 1)
    assert.equal(assignedTaskId, 'task-r1')
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

async function realRepositoryFixture(requestId) {
  const root = await mkdtemp(join(tmpdir(), 'ds-worker-git-'))
  const repositoryDir = join(root, 'repository')
  const dataDir = join(root, 'data')
  await mkdir(join(repositoryDir, 'src', 'atomic'), { recursive: true })
  await writeFile(join(repositoryDir, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.1.0', scripts: { verify: "node -e 'process.exit(0)'" } }, null, 2))
  await writeFile(join(repositoryDir, 'package-lock.json'), JSON.stringify({ name: 'fixture', version: '0.1.0', lockfileVersion: 3, requires: true, packages: { '': { name: 'fixture', version: '0.1.0' } } }, null, 2))
  await writeFile(join(repositoryDir, 'src', 'atomic', 'Button.js'), 'export const label = "Button"\n')
  await runCommand('git', ['init', '-b', 'main'], { cwd: repositoryDir })
  await runCommand('git', ['config', 'user.name', 'Worker Test'], { cwd: repositoryDir })
  await runCommand('git', ['config', 'user.email', 'worker@example.invalid'], { cwd: repositoryDir })
  await runCommand('git', ['add', '.'], { cwd: repositoryDir })
  await runCommand('git', ['commit', '-m', 'base'], { cwd: repositoryDir })
  const store = openStore(dataDir)
  await store.submit({ ...input, requestId })
  return { root, repositoryDir, dataDir, store }
}

test('a disposable Git repository is verified and fast-forwarded to the candidate commit', async () => {
  const fixture = await realRepositoryFixture('git-ff')
  try {
    const result = await processRequest({
      ...fixture,
      requestId: 'git-ff',
      run: runCommand,
      implement: async ({ candidateDir }) => {
        await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const label = "Busy button"\n')
        return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
      },
      release: successfulRelease,
    })
    assert.equal(result.status, 'ready')
    assert.equal(await readFile(join(fixture.repositoryDir, 'src', 'atomic', 'Button.js'), 'utf8'), 'export const label = "Busy button"\n')
    const journal = JSON.parse(await readFile(join(fixture.dataDir, 'journals', 'git-ff.json'), 'utf8'))
    assert.equal((await runCommand('git', ['rev-parse', 'HEAD'], { cwd: fixture.repositoryDir })).stdout.trim(), journal.candidateCommit)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('released-journal recovery finalizes when main advanced beyond the promoted candidate', async () => {
  const fixture = await realRepositoryFixture('git-released-descendant')
  let failReadyOnce = true
  let implementations = 0
  let releases = 0
  const store = {
    ...fixture.store,
    update: async (id, patch) => {
      if (patch.status === 'ready' && failReadyOnce) {
        failReadyOnce = false
        throw new Error('simulated result publication failure')
      }
      return fixture.store.update(id, patch)
    },
  }
  const options = {
    ...fixture,
    store,
    requestId: 'git-released-descendant',
    run: runCommand,
    adopt: async () => ({ status: 'installed' }),
    implement: async ({ candidateDir }) => {
      implementations += 1
      await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const label = "Busy button"\n')
      return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
    },
    release: async (releaseOptions) => { releases += 1; return successfulRelease(releaseOptions) },
  }
  try {
    const interrupted = await processRequest(options)
    assert.equal(interrupted.status, 'failed')
    assert.match(interrupted.error, /publication requires recovery/i)
    await writeFile(join(fixture.repositoryDir, 'README.md'), 'later main work\n')
    await runCommand('git', ['add', 'README.md'], { cwd: fixture.repositoryDir })
    await runCommand('git', ['commit', '-m', 'later main work'], { cwd: fixture.repositoryDir })

    const recovered = await processRequest(options)
    assert.equal(recovered.status, 'ready')
    assert.equal(implementations, 1)
    assert.equal(releases, 1)
    assert.equal((await fixture.store.listWorking()).length, 0)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('released-journal recovery durably fails when main no longer contains the candidate', async () => {
  const fixture = await realRepositoryFixture('git-released-diverged')
  let failReadyOnce = true
  const store = {
    ...fixture.store,
    update: async (id, patch) => {
      if (patch.status === 'ready' && failReadyOnce) {
        failReadyOnce = false
        throw new Error('simulated result publication failure')
      }
      return fixture.store.update(id, patch)
    },
  }
  const options = {
    ...fixture,
    store,
    requestId: 'git-released-diverged',
    run: runCommand,
    adopt: async () => ({ status: 'installed' }),
    implement: async ({ candidateDir }) => {
      await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const label = "Busy button"\n')
      return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
    },
    release: successfulRelease,
  }
  try {
    const interrupted = await processRequest(options)
    assert.equal(interrupted.status, 'failed')
    await runCommand('git', ['checkout', '--orphan', 'diverged'], { cwd: fixture.repositoryDir })
    await runCommand('git', ['commit', '--allow-empty', '-m', 'diverged root'], { cwd: fixture.repositoryDir })

    const recovered = await processRequest(options)
    assert.equal(recovered.status, 'failed')
    assert.match(recovered.error, /no longer contain|ancestor|diverg/i)
    assert.equal((await fixture.store.get('git-released-diverged')).status, 'failed')
    assert.equal((await fixture.store.listWorking()).length, 0)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('a conflicting main advance returns a retryable failure and preserves main', async () => {
  const fixture = await realRepositoryFixture('git-conflict')
  let advanced = false
  const release = async (options) => {
    if (!advanced) {
      advanced = true
      await writeFile(join(fixture.repositoryDir, 'src', 'atomic', 'Button.js'), 'export const label = "Concurrent main"\n')
      await runCommand('git', ['add', 'src/atomic/Button.js'], { cwd: fixture.repositoryDir })
      await runCommand('git', ['commit', '-m', 'concurrent main change'], { cwd: fixture.repositoryDir })
    }
    return successfulRelease(options)
  }
  try {
    const result = await processRequest({
      ...fixture,
      requestId: 'git-conflict',
      run: runCommand,
      implement: async ({ candidateDir }) => {
        await writeFile(join(candidateDir, 'src', 'atomic', 'Button.js'), 'export const label = "Requested change"\n')
        return { outcome: 'implemented', summary: 'Button supports a busy label.', error: null }
      },
      release,
    })
    assert.equal(result.status, 'failed')
    assert.match(result.error, /retryable.*conflict/i)
    assert.equal(await readFile(join(fixture.repositoryDir, 'src', 'atomic', 'Button.js'), 'utf8'), 'export const label = "Concurrent main"\n')
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})
