import test from 'node:test'
import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { dispatch } from './cli.mjs'

test('CLI configures, submits, and gets a request', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ds-cli-')); const app = await mkdtemp(join(tmpdir(), 'ds-app-'))
  try { await writeFile(join(app, 'package.json'), JSON.stringify({ scripts: { test: 'node --test' } })); const data = join(dir, 'data'); await dispatch(['configure', '--data-dir', data, '--app', app, '--check', 'test']); const input = join(dir, 'input.json'); await writeFile(input, JSON.stringify({ requestId: 'cli-1', installedVersion: '0.1.0', component: 'Button', change: 'Add hint' })); assert.deepEqual(await dispatch(['request', '--data-dir', data, '--input', input]), { requestId: 'cli-1', status: 'working' }); assert.deepEqual(await dispatch(['get', '--data-dir', data, 'cli-1']), { requestId: 'cli-1', status: 'working' }) } finally { await rm(dir, { recursive: true, force: true }); await rm(app, { recursive: true, force: true }) }
})

test('CLI rejects missing configuration and malformed input', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ds-cli-'))
  try { await assert.rejects(dispatch(['request', '--data-dir', join(dir, 'missing'), '--input', join(dir, 'no-input.json')]), /not configured/); const app = await mkdtemp(join(tmpdir(), 'ds-app-')); try { await writeFile(join(app, 'package.json'), JSON.stringify({ scripts: { test: 'node --test' } })); const data = join(dir, 'data'); await dispatch(['configure', '--data-dir', data, '--app', app, '--check', 'test']); const input = join(dir, 'input.json'); await writeFile(input, '{'); await assert.rejects(dispatch(['request', '--data-dir', data, '--input', input]), /JSON|Unexpected token/) } finally { await rm(app, { recursive: true, force: true }) } } finally { await rm(dir, { recursive: true, force: true }) }
})

test('CLI executes when its filesystem path contains URL-significant characters', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ds-cli-path-'))
  const copiedDir = join(root, 'changes with space # percent %')
  try {
    await mkdir(copiedDir)
    for (const name of ['cli.mjs', 'protocol.mjs', 'store.mjs']) await copyFile(new URL(name, import.meta.url), join(copiedDir, name))
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [join(copiedDir, 'cli.mjs')], { stdio: ['ignore', 'pipe', 'pipe'] })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk) => { stdout += chunk })
      child.stderr.on('data', (chunk) => { stderr += chunk })
      child.on('error', reject)
      child.on('close', (code) => resolve({ code, stdout, stderr }))
    })
    assert.equal(result.code, 1)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /usage: changes/i)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
