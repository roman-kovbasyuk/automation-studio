import { mkdir, readFile, rename, open, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { validateConfig, validateRequest, canonicalRequest, publicResult } from './protocol.mjs'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function openStore(dataDir) {
  const root = dataDir
  const requestsDir = join(root, 'requests')
  const configPath = join(root, 'config.json')
  const workerLock = join(root, 'worker.lock')
  const versionsPath = join(root, 'versions.json')
  let lockQueue = Promise.resolve()

  async function init() { await mkdir(requestsDir, { recursive: true }) }
  async function atomicWrite(path, value) {
    const temp = `${path}.${process.pid}.${randomUUID()}.tmp`
    try {
      await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
      await rename(temp, path)
    } finally { await unlink(temp).catch((error) => { if (error.code !== 'ENOENT') throw error }) }
  }
  async function readJson(path, fallback = null) { try { return JSON.parse(await readFile(path, 'utf8')) } catch (error) { if (error.code === 'ENOENT') return fallback; throw error } }
  async function acquire() {
    await init()
    let ambiguousAttempts = 0
    for (;;) {
      const owner = { pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() }
      try { const handle = await open(workerLock, 'wx', 0o600); await handle.writeFile(JSON.stringify(owner)); await handle.close(); return owner }
      catch (error) {
        if (error.code !== 'EEXIST') throw error
        let existing
        try { existing = await readJson(workerLock) } catch {
          // A contender may observe the tiny interval between lock creation and
          // owner publication. Give that writer a bounded chance to finish;
          // persistent malformed metadata remains ambiguous and is never stolen.
          await sleep(5)
          try { existing = await readJson(workerLock) } catch { if (++ambiguousAttempts < 20) continue; throw new Error('worker lock has ambiguous ownership') }
        }
        if (!existing || !Number.isInteger(existing.pid) || existing.pid <= 0) { if (++ambiguousAttempts < 20) { await sleep(5); continue } throw new Error('worker lock has ambiguous ownership') }
        ambiguousAttempts = 0
        let alive = true
        try { process.kill(existing.pid, 0) } catch (probe) { if (probe.code === 'ESRCH') alive = false; else throw new Error('worker lock has ambiguous ownership') }
        if (alive) { await sleep(20); continue }
        const reclaimed = `${workerLock}.reclaim.${process.pid}.${randomUUID()}`
        try { await rename(workerLock, reclaimed); await unlink(reclaimed); } catch (race) { if (race.code !== 'ENOENT') continue }
      }
    }
  }
  async function withWorkerLock(fn) {
    const run = lockQueue.then(async () => { await acquire(); try { return await fn() } finally { await unlink(workerLock).catch((error) => { if (error.code !== 'ENOENT') throw error }) } })
    lockQueue = run.catch(() => {})
    return run
  }
  async function recordPath(id) { return join(requestsDir, `${id}.json`) }
  async function configure(config) { const checked = validateConfig(config); await init(); await atomicWrite(configPath, checked); return checked }
  async function readConfig() { return readJson(configPath) }
  async function submit(value) {
    const input = validateRequest(value); const payload = canonicalRequest(input)
    return withWorkerLock(async () => {
      const path = await recordPath(input.requestId)
      let existing
      try { existing = await readJson(path) } catch {
        // An interrupted writer may leave a truncated record. Quarantine it
        // before accepting a fresh retry for the same request ID.
        await rename(path, `${path}.corrupt.${process.pid}.${randomUUID()}`)
      }
      if (existing) { if (existing.payload !== payload) throw new Error(`request ID conflict: ${input.requestId}`); return publicResult(existing) }
      const now = new Date().toISOString(); const record = { input, payload, approvedBy: 'single-app-policy', createdAt: now, updatedAt: now, status: 'working' }
      await atomicWrite(path, record); return publicResult(record)
    })
  }
  async function get(id) {
    const input = validateRequest({ requestId: id, installedVersion: 'placeholder', component: 'placeholder', change: 'placeholder' }).requestId
    const record = await readJson(await recordPath(input)); if (!record) throw new Error(`unknown request ID: ${input}`); return publicResult(record)
  }
  async function listWorking() { await init(); const { readdir } = await import('node:fs/promises'); const names = await readdir(requestsDir); const records = await Promise.all(names.filter((n) => n.endsWith('.json')).map((n) => readJson(join(requestsDir, n)))); return records.filter((r) => r && r.status === 'working').map(publicResult) }
  async function update(id, patch) { return withWorkerLock(async () => { const path = await recordPath(validateRequest({ requestId: id, installedVersion: 'x', component: 'x', change: 'x' }).requestId); const record = await readJson(path); if (!record) throw new Error(`unknown request ID: ${id}`); const next = { ...record, ...patch, input: record.input, payload: record.payload, updatedAt: new Date().toISOString() }; await atomicWrite(path, next); return publicResult(next) }) }
  async function reserveVersion(baseVersion) { return withWorkerLock(async () => { const versions = await readJson(versionsPath, {}); const match = /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-.+)?$/.exec(String(baseVersion)); if (!match) throw new Error('baseVersion must be semver-like'); const key = `${match[1]}.${match[2]}`; const next = Math.max(Number(match[3]) + 1, Number(versions[key] ?? 0)); versions[key] = next + 1; await atomicWrite(versionsPath, versions); return `${match[1]}.${match[2]}.${next}` }) }
  return { configure, readConfig, submit, get, listWorking, update, reserveVersion, withWorkerLock }
}
