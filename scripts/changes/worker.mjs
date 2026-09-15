#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto'
import { access, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { implementChange } from './agent.mjs'
import { runCommand } from './process.mjs'
import { createRelease } from './release.mjs'
import { openStore } from './store.mjs'

const PHASES = new Set(['queued', 'implementing', 'verifying', 'packaged', 'promoting', 'released'])
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

function message(error) {
  return (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').trim().slice(0, 2000) || 'Unknown worker failure'
}

function ensureRequestId(requestId) {
  if (typeof requestId !== 'string' || !REQUEST_ID.test(requestId)) throw new Error('requestId has an invalid format')
  return requestId
}

function journalPath(dataDir, requestId) {
  return join(resolve(dataDir), 'journals', `${ensureRequestId(requestId)}.json`)
}

async function readJson(path, fallback = null) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch (error) { if (error.code === 'ENOENT') return fallback; throw error }
}

async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
    await rename(temporary, path)
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error })
  }
}

async function privateRecord(dataDir, requestId) {
  const record = await readJson(join(resolve(dataDir), 'requests', `${ensureRequestId(requestId)}.json`))
  if (!record?.input) throw new Error(`unknown request ID: ${requestId}`)
  return record
}

async function pathExists(path) {
  try { await stat(path); return true } catch (error) { if (error.code === 'ENOENT') return false; throw error }
}

async function digest(path) {
  return `sha512-${createHash('sha512').update(await readFile(path)).digest('base64')}`
}

async function verifiedRelease(release) {
  if (!release || typeof release !== 'object' || typeof release.packagePath !== 'string' || typeof release.integrity !== 'string') return false
  try { return await digest(release.packagePath) === release.integrity } catch { return false }
}

async function findRelease(dataDir, sourceCommit) {
  const releasesDir = join(resolve(dataDir), 'releases')
  let names
  try { names = await readdir(releasesDir) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
  for (const name of names) {
    const release = await readJson(join(releasesDir, name, 'manifest.json'))
    if (release?.sourceCommit === sourceCommit && await verifiedRelease(release)) return release
  }
  return null
}

function statusPaths(stdout) {
  return stdout.split(/\r?\n/).filter(Boolean).map((line) => {
    if (line.length < 4) throw new Error('Git returned an invalid status entry')
    const index = line[0]
    const worktree = line[1]
    let path = line.slice(3)
    if (path.includes(' -> ')) path = path.slice(path.indexOf(' -> ') + 4)
    if (path.startsWith('"')) throw new Error('Changed paths requiring Git quote decoding are outside the supported request scope')
    return { index, worktree, path }
  })
}

function allowedPath(path) {
  return path.startsWith('src/atomic/')
    || /^scripts\/atomic\/[^/]+\.test\.mjs$/.test(path)
    || /^(?:test|tests|fixtures)\/atomic\//.test(path)
}

function validateAgentChanges(entries) {
  if (entries.length === 0) throw new Error('Implementation agent produced no design-system changes')
  const staged = entries.filter(({ index }) => index !== ' ' && index !== '?').map(({ path }) => path)
  if (staged.length) throw new Error(`Implementation agent left staged files: ${staged.join(', ')}`)
  const unexpected = entries.filter(({ path }) => !allowedPath(path)).map(({ path }) => path)
  if (unexpected.length) throw new Error(`Request is outside the automated component scope; unexpected paths: ${unexpected.join(', ')}`)
  return [...new Set(entries.map(({ path }) => path))]
}

async function git(run, cwd, args) {
  return (await run('git', args, { cwd })).stdout.trim()
}

async function gitStatus(run, cwd) {
  return (await run('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd })).stdout.replace(/[\r\n]+$/, '')
}

async function ensureObservatoryTask({ repositoryDir, input, run, existingTaskId }) {
  if (existingTaskId) return existingTaskId
  const cliPath = join(repositoryDir, 'observatory', 'cli.mjs')
  try { await access(cliPath) } catch { return `local-${input.requestId}` }
  const tasksFile = resolve(process.env.TASKS_FILE || join(repositoryDir, 'observatory', 'data', 'tasks.json'))
  const env = { ...process.env, TASKS_FILE: tasksFile }
  delete env.CODEX_THREAD_ID
  const listed = JSON.parse((await run(process.execPath, [cliPath, 'list'], { cwd: repositoryDir, env })).stdout)
  const marker = `Design-system request ID: ${input.requestId}`
  const existing = listed.find((task) => task?.description?.includes(marker))
  if (existing?.id) return existing.id
  const title = `Process design-system request ${input.requestId}`
  const description = `${marker}. Automatically approved by the owner's single-app policy; implement in the canonical atomic layer, verify, package, and promote locally.`
  const created = JSON.parse((await run(process.execPath, [cliPath, 'add', title, description, '', '', 'Design-system change worker', 'specification'], { cwd: repositoryDir, env })).stdout)
  if (!created?.id) throw new Error('Observatory did not return a task ID')
  return created.id
}

async function reportObservatory({ repositoryDir, taskId, status, note, run }) {
  if (!taskId || taskId.startsWith('local-')) return
  const cliPath = join(repositoryDir, 'observatory', 'cli.mjs')
  const tasksFile = resolve(process.env.TASKS_FILE || join(repositoryDir, 'observatory', 'data', 'tasks.json'))
  const env = { ...process.env, TASKS_FILE: tasksFile }
  delete env.CODEX_THREAD_ID
  await run(process.execPath, [cliPath, 'update', taskId, status, note, '', '', 'Design-system change worker', 'specification'], { cwd: repositoryDir, env })
}

async function setPhase(context, phase, patch = {}) {
  if (!PHASES.has(phase)) throw new Error(`Invalid worker phase: ${phase}`)
  const next = { ...context.journal, ...patch, requestId: context.requestId, phase, ownerPid: process.pid, updatedAt: new Date().toISOString() }
  await atomicJson(context.journalFile, next)
  context.journal = next
  await context.store.update(context.requestId, { phase, taskId: next.taskId, baseCommit: next.baseCommit, candidateCommit: next.candidateCommit, release: next.release, worktreePath: next.worktreePath })
  return next
}

async function failRequest(context, error, extra = {}) {
  const text = message(error)
  const release = extra.release ?? context.journal.release
  const journal = { ...context.journal, ...extra, failure: text, ownerPid: process.pid, updatedAt: new Date().toISOString() }
  await atomicJson(context.journalFile, journal)
  context.journal = journal
  const patch = { status: 'failed', error: text, phase: journal.phase, taskId: journal.taskId, baseCommit: journal.baseCommit, candidateCommit: journal.candidateCommit, release, worktreePath: journal.worktreePath }
  if (release) Object.assign(patch, { version: release.version, packagePath: release.packagePath })
  let result
  try { result = await context.store.update(context.requestId, patch) } catch { result = { requestId: context.requestId, status: 'failed', error: text, ...(release ? { version: release.version, packagePath: release.packagePath } : {}) } }
  await reportObservatory({ ...context, taskId: journal.taskId, status: 'needs attention', note: `Request ${context.requestId} failed during ${journal.phase ?? 'setup'}; inspect its local result for details.`, run: context.run }).catch(() => {})
  return result
}

async function finishReleased(context) {
  const { release, candidateCommit } = context.journal
  if (!await verifiedRelease(release)) throw new Error('Released artifact is missing or failed its integrity check')
  const mainHead = await git(context.run, context.repositoryDir, ['rev-parse', 'HEAD'])
  if (mainHead !== candidateCommit) throw new Error('Retryable recovery failure: main does not contain the journaled candidate commit')
  if (context.journal.phase !== 'released') await setPhase(context, 'released')
  const result = await context.store.update(context.requestId, {
    status: 'ready',
    phase: 'released',
    taskId: context.journal.taskId,
    baseCommit: context.journal.baseCommit,
    candidateCommit,
    release,
    version: release.version,
    packagePath: release.packagePath,
    summary: release.summary,
    error: undefined,
  })
  await reportObservatory({ ...context, taskId: context.journal.taskId, status: 'ready', note: `Promoted ${candidateCommit} and verified immutable package ${release.version}.`, run: context.run }).catch(() => {})
  return result
}

async function cleanMain(context) {
  const branch = await git(context.run, context.repositoryDir, ['branch', '--show-current'])
  if (branch !== context.masterBranch) throw new Error(`Main checkout must have branch ${context.masterBranch} checked out`)
  const status = await gitStatus(context.run, context.repositoryDir)
  if (status) throw new Error('Main checkout has unrelated working changes; every file was preserved')
}

async function packageCandidate(context, candidateCommit, summary) {
  const head = await git(context.run, context.candidateDir, ['rev-parse', 'HEAD'])
  if (head !== candidateCommit) throw new Error('Candidate HEAD does not match the verified commit')
  const remaining = statusPaths(await gitStatus(context.run, context.candidateDir))
  if (remaining.length) {
    const unexpected = remaining.filter(({ path }) => !allowedPath(path)).map(({ path }) => path)
    if (unexpected.length) throw new Error(`Candidate contains unexpected generated changes: ${unexpected.join(', ')}`)
    throw new Error(`Candidate is not clean after committing verified changes: ${remaining.map(({ path }) => path).join(', ')}`)
  }
  await setPhase(context, 'packaged', { candidateCommit, summary })
  const recovered = await findRelease(context.dataDir, candidateCommit)
  const release = recovered ?? await context.release({ candidateDir: context.candidateDir, dataDir: context.dataDir, store: context.store, sourceCommit: candidateCommit, summary, run: context.run })
  if (release.sourceCommit !== candidateCommit) throw new Error('Release source commit does not match the verified candidate')
  if (!await verifiedRelease(release)) throw new Error('Release artifact failed its integrity check')
  await setPhase(context, 'promoting', { release, candidateCommit, summary })
  return release
}

export async function processRequest({
  repositoryDir,
  dataDir,
  requestId,
  store,
  run = runCommand,
  implement = implementChange,
  release = createRelease,
}) {
  const repository = resolve(repositoryDir)
  const data = resolve(dataDir)
  const id = ensureRequestId(requestId)
  const record = await privateRecord(data, id)
  if (record.status !== 'working') return store.get(id)
  const config = await store.readConfig() ?? {}
  const candidateDir = join(data, 'worktrees', id)
  const context = {
    repositoryDir: repository,
    dataDir: data,
    requestId: id,
    store,
    run,
    release,
    candidateDir,
    masterBranch: config.masterBranch ?? 'main',
    journalFile: journalPath(data, id),
    journal: await readJson(journalPath(data, id), { requestId: id, ownerPid: process.pid }),
  }

  try {
    if (context.journal.phase === 'released') return await finishReleased(context)
    if (context.journal.phase === 'implementing') return await failRequest(context, `Implementation was interrupted and will not be replayed; preserved worktree: ${context.journal.worktreePath ?? candidateDir}`)

    const taskId = await ensureObservatoryTask({ repositoryDir: repository, input: record.input, run, existingTaskId: context.journal.taskId ?? record.taskId })
    if (!context.journal.phase || context.journal.phase === 'queued' && !context.journal.baseCommit) {
      const baseCommit = await git(run, repository, ['rev-parse', `refs/heads/${context.masterBranch}`])
      await setPhase(context, 'queued', { taskId, baseCommit, worktreePath: candidateDir })
    } else if (!context.journal.taskId) {
      await setPhase(context, context.journal.phase, { taskId })
    }

    if (context.journal.phase === 'queued') {
      if (!await pathExists(candidateDir)) {
        await mkdir(dirname(candidateDir), { recursive: true })
        await run('git', ['worktree', 'add', '--detach', candidateDir, context.journal.baseCommit], { cwd: repository })
      } else {
        const existingHead = await git(run, candidateDir, ['rev-parse', 'HEAD'])
        if (existingHead !== context.journal.baseCommit) throw new Error('Existing request worktree does not match its base commit')
      }
      const baseline = await gitStatus(run, candidateDir)
      if (baseline) throw new Error('Request worktree is not clean before implementation')
      await run('npm', ['ci'], { cwd: candidateDir, timeoutMs: 10 * 60 * 1000 })
      await setPhase(context, 'implementing')
      const resultPath = join(data, 'agent-results', `${id}.json`)
      await mkdir(dirname(resultPath), { recursive: true })
      const agent = await implement({
        candidateDir,
        input: record.input,
        resultPath,
        taskId,
        run,
        agentExecutable: config.agentExecutable ?? 'codex',
        agentTimeoutMs: config.agentTimeoutMs ?? 30 * 60 * 1000,
        observatoryCliPath: join(repository, 'observatory', 'cli.mjs'),
        observatoryTasksFile: resolve(process.env.TASKS_FILE || join(repository, 'observatory', 'data', 'tasks.json')),
      })
      if (agent.outcome !== 'implemented') return await failRequest(context, agent.error || agent.summary)
      const entries = statusPaths(await gitStatus(run, candidateDir))
      const changedPaths = validateAgentChanges(entries)
      await setPhase(context, 'verifying', { summary: agent.summary, changedPaths })
    }

    if (context.journal.phase === 'verifying') {
      let candidateCommit = context.journal.candidateCommit
      let verifiedNow = false
      if (!candidateCommit) {
        const head = await git(run, candidateDir, ['rev-parse', 'HEAD'])
        const status = statusPaths(await gitStatus(run, candidateDir))
        if (head !== context.journal.baseCommit && status.length === 0) {
          const committed = (await git(run, candidateDir, ['diff', '--name-only', `${context.journal.baseCommit}..${head}`])).split(/\r?\n/).filter(Boolean)
          const unexpected = committed.filter((path) => !allowedPath(path))
          if (unexpected.length) throw new Error(`Committed candidate contains unexpected paths: ${unexpected.join(', ')}`)
          candidateCommit = head
        } else {
          const changedPaths = validateAgentChanges(status)
          await run('npm', ['run', 'verify'], { cwd: candidateDir, timeoutMs: 30 * 60 * 1000 })
          verifiedNow = true
          await run('git', ['add', '--', ...changedPaths], { cwd: candidateDir })
          await run('git', ['-c', 'user.name=Design System Worker', '-c', 'user.email=design-system-worker@localhost', 'commit', '-m', `feat(atomic): ${record.input.component} change ${id}`], { cwd: candidateDir })
          candidateCommit = await git(run, candidateDir, ['rev-parse', 'HEAD'])
        }
      }
      if (!verifiedNow && (!context.journal.verifiedCommit || context.journal.verifiedCommit !== candidateCommit)) {
        await run('npm', ['run', 'verify'], { cwd: candidateDir, timeoutMs: 30 * 60 * 1000 })
      }
      await setPhase(context, 'packaged', { candidateCommit, verifiedCommit: candidateCommit })
    }

    if (context.journal.phase === 'packaged') {
      const candidateCommit = context.journal.candidateCommit
      let recovered = context.journal.release
      if (!await verifiedRelease(recovered)) recovered = await findRelease(data, candidateCommit)
      if (recovered) await setPhase(context, 'promoting', { release: recovered })
      else await packageCandidate(context, candidateCommit, context.journal.summary)
    }

    if (context.journal.phase === 'promoting') {
      if (!await verifiedRelease(context.journal.release)) throw new Error('Packaged release is missing or failed its integrity check')
      await cleanMain(context)
      let mainHead = await git(run, repository, ['rev-parse', 'HEAD'])
      if (mainHead === context.journal.candidateCommit) return await finishReleased(context)
      if (mainHead !== context.journal.baseCommit) {
        if (context.journal.rebased) throw new Error('Retryable promotion failure: main advanced repeatedly')
        await setPhase(context, 'verifying', { baseCommit: mainHead, rebased: true, release: undefined, verifiedCommit: undefined })
        try { await run('git', ['rebase', mainHead], { cwd: candidateDir }) }
        catch (error) {
          await run('git', ['rebase', '--abort'], { cwd: candidateDir }).catch(() => {})
          throw new Error(`Retryable promotion conflict: ${message(error)}`)
        }
        const rebasedCommit = await git(run, candidateDir, ['rev-parse', 'HEAD'])
        await run('npm', ['run', 'verify'], { cwd: candidateDir, timeoutMs: 30 * 60 * 1000 })
        await setPhase(context, 'packaged', { candidateCommit: rebasedCommit, verifiedCommit: rebasedCommit })
        await packageCandidate(context, rebasedCommit, context.journal.summary)
        await cleanMain(context)
        mainHead = await git(run, repository, ['rev-parse', 'HEAD'])
        if (mainHead !== context.journal.baseCommit) throw new Error('Retryable promotion failure: main advanced repeatedly')
      }
      try { await run('git', ['merge', '--ff-only', context.journal.candidateCommit], { cwd: repository }) }
      catch (error) {
        const after = await git(run, repository, ['rev-parse', 'HEAD']).catch(() => '')
        if (after !== context.journal.candidateCommit) throw error
      }
      const promoted = await git(run, repository, ['rev-parse', 'HEAD'])
      if (promoted !== context.journal.candidateCommit) throw new Error('Fast-forward promotion did not reach the verified candidate commit')
      return await finishReleased(context)
    }

    throw new Error(`Cannot resume unknown worker phase: ${context.journal.phase ?? 'missing'}`)
  } catch (error) {
    if (error?.code === 'WORKER_STOPPED') throw error
    if (context.journal.phase === 'released') {
      const release = context.journal.release
      return {
        requestId: id,
        status: 'failed',
        error: `Promotion succeeded; result publication requires recovery: ${message(error)}`,
        ...(release ? { version: release.version, packagePath: release.packagePath } : {}),
      }
    }
    if (context.journal.phase === 'promoting' && context.journal.candidateCommit) {
      const head = await git(run, repository, ['rev-parse', 'HEAD']).catch(() => '')
      if (head === context.journal.candidateCommit && await verifiedRelease(context.journal.release)) {
        try { return await finishReleased(context) } catch (publicationError) {
          return { requestId: id, status: 'failed', error: `Promotion succeeded; result publication requires recovery: ${message(publicationError)}`, version: context.journal.release.version, packagePath: context.journal.release.packagePath }
        }
      }
    }
    return failRequest(context, error)
  }
}

async function workingRecords(dataDir) {
  const requestsDir = join(resolve(dataDir), 'requests')
  let names
  try { names = await readdir(requestsDir) } catch (error) { if (error.code === 'ENOENT') return []; throw error }
  const records = await Promise.all(names.filter((name) => name.endsWith('.json')).map((name) => readJson(join(requestsDir, name))))
  return records.filter((record) => record?.status === 'working').sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try { process.kill(pid, 0); return true } catch (error) { if (error.code === 'ESRCH') return false; return true }
}

export async function drainQueue(options) {
  const { dataDir, store, process: processOne = processRequest } = options
  const results = []
  for (;;) {
    const requestId = await store.withWorkerLock(async () => {
      const records = await workingRecords(dataDir)
      if (!records.length) return null
      const candidates = await Promise.all(records.map(async (record) => {
        const id = record.input.requestId
        return { id, path: journalPath(dataDir, id), journal: await readJson(journalPath(dataDir, id)) }
      }))
      const unfinished = candidates.find(({ journal }) => journal?.phase)
      const selected = unfinished ?? candidates[0]
      if (unfinished && unfinished.journal.ownerPid !== process.pid && pidAlive(unfinished.journal.ownerPid)) return null
      const next = selected.journal
        ? { ...selected.journal, ownerPid: process.pid, updatedAt: new Date().toISOString() }
        : { requestId: selected.id, phase: 'queued', ownerPid: process.pid, updatedAt: new Date().toISOString() }
      await atomicJson(selected.path, next)
      return selected.id
    })
    if (!requestId) break
    results.push(await processOne({ ...options, requestId }))
  }
  return results
}

async function main() {
  const args = process.argv.slice(2)
  if (args.some((arg) => arg !== '--watch')) throw new Error('Usage: node scripts/changes/worker.mjs [--watch]')
  const repositoryDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const dataDir = join(repositoryDir, '.design-system-changes')
  const store = openStore(dataDir)
  let stopping = false
  const stop = () => { stopping = true }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  do {
    await drainQueue({ repositoryDir, dataDir, store, run: runCommand })
    if (!args.includes('--watch') || stopping) break
    await sleep(2000)
  } while (!stopping)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { process.stderr.write(`${message(error)}\n`); process.exitCode = 1 })
}
