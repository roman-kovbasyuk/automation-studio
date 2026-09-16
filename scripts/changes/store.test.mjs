import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { openStore } from './store.mjs'

test('same ID and content returns one automatically approved request', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ds-queue-'))
  try { const store = openStore(dir); const input = { requestId: 'r1', installedVersion: '0.1.0', component: 'Button', change: 'Add an optional busy label.' }; const [a, b] = await Promise.all([store.submit(input), store.submit(input)]); assert.deepEqual(a, b); assert.equal((await store.listWorking()).length, 1); await assert.rejects(store.submit({ ...input, change: 'Different request' }), /conflict/i) } finally { await rm(dir, { recursive: true, force: true }) }
})

test('updates preserve input and reserves unique versions across store restarts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ds-queue-'))
  try {
    const store = openStore(dir)
    await store.submit({ requestId: 'r2', installedVersion: '0.1.0', component: 'Button', change: 'Change it' })
    await store.update('r2', { status: 'ready', version: '0.1.0-change.1' })
    assert.equal((await store.get('r2')).version, '0.1.0-change.1')
    const versions = await Promise.all([store.reserveVersion('0.1.0'), store.reserveVersion('0.1.0')])
    assert.equal(new Set(versions).size, 2)
    assert.ok(versions.every((version) => /^0\.1\.0-change\.[1-9][0-9]*$/.test(version)))
    assert.equal(await openStore(dir).reserveVersion('0.1.0'), '0.1.0-change.3')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('rejects unknown and traversal IDs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ds-queue-'))
  try { const store = openStore(dir); await assert.rejects(store.get('../escape'), /format|unknown/i); await assert.rejects(store.get('missing'), /unknown/i) } finally { await rm(dir, { recursive: true, force: true }) }
})

test('recovers from an interrupted record write', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ds-queue-'))
  try { const store = openStore(dir); await store.listWorking(); await writeFile(join(dir, 'requests', 'interrupted.json'), '{"input":'); const result = await store.submit({ requestId: 'interrupted', installedVersion: '0.1.0', component: 'Button', change: 'Recover it' }); assert.deepEqual(result, { requestId: 'interrupted', status: 'working' }); assert.deepEqual(await store.get('interrupted'), result) } finally { await rm(dir, { recursive: true, force: true }) }
})

test('independent store instances serialize concurrent submissions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ds-queue-')); const script = `import { openStore } from ${JSON.stringify(new URL('./store.mjs', import.meta.url).href)}; const s=openStore(process.argv[1]); await s.submit({requestId:'cross',installedVersion:'0.1.0',component:'Button',change:'Change'}); process.send?.('done')`
  try { await writeFile(join(dir, 'worker.lock'), JSON.stringify({ pid: 999999, token: 'dead-owner' })); const results = await Promise.all([1, 2].map(() => new Promise((resolve, reject) => { const child = spawn(process.execPath, ['--input-type=module', '-e', script, dir], { stdio: ['ignore', 'ignore', 'pipe'] }); let stderr = ''; child.stderr.on('data', (chunk) => { stderr += chunk }); child.on('close', (code) => code === 0 ? resolve(code) : reject(new Error(`child exited ${code}: ${stderr}`))); child.on('error', reject) })) ); assert.equal(results.length, 2); assert.equal((await openStore(dir).listWorking()).length, 1) } finally { await rm(dir, { recursive: true, force: true }) }
})

test('refuses ambiguous stale reclamation guards instead of stealing a replacement', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ds-queue-'))
  const script = `import { openStore } from ${JSON.stringify(new URL('./store.mjs', import.meta.url).href)}; await openStore(process.argv[1]).submit({requestId:'guard-race',installedVersion:'0.1.0',component:'Button',change:'Change'})`
  try {
    await writeFile(join(dir, 'worker.lock'), JSON.stringify({ pid: 999999, token: 'dead-worker' }))
    await writeFile(join(dir, 'worker.reclaim.lock'), JSON.stringify({ pid: 999999, token: 'dead-guard' }))
    await assert.rejects(Promise.all(Array.from({ length: 4 }, () => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--input-type=module', '-e', script, dir], { stdio: ['ignore', 'ignore', 'pipe'] })
      let stderr = ''
      child.stderr.on('data', (chunk) => { stderr += chunk })
      child.on('close', (code) => code === 0 ? resolve(code) : reject(new Error(`child exited ${code}: ${stderr}`)))
      child.on('error', reject)
    }))), /ambiguous|child exited/i)
  } finally { await rm(dir, { recursive: true, force: true }) }
})
