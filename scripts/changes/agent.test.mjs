import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, isAbsolute, join } from 'node:path'
import { implementChange } from './agent.mjs'

const input = {
  requestId: 'app-change-184',
  installedVersion: '0.1.0',
  component: 'SearchField',
  change: 'Add an optional keyboard shortcut hint; $(touch must-not-run).',
}

test('implementChange sends change data on stdin and accepts only the structured result file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ds-agent-'))
  const candidateDir = join(root, 'candidate')
  const resultPath = join(root, 'agent-result.json')
  let invocation
  try {
    const result = await implementChange({
      candidateDir,
      input,
      resultPath,
      taskId: 'task-123',
      agentExecutable: 'configured-codex',
      agentTimeoutMs: 5_000,
      observatoryCliPath: '/master/observatory/cli.mjs',
      observatoryTasksFile: '/shared/tasks.json',
      run: async (file, args, options) => {
        invocation = { file, args, options }
        await writeFile(resultPath, JSON.stringify({ outcome: 'implemented', summary: 'SearchField supports a shortcut hint.', error: null }))
        return { stdout: 'untrusted command output', stderr: '' }
      },
    })

    assert.deepEqual(result, { outcome: 'implemented', summary: 'SearchField supports a shortcut hint.', error: null })
    assert.equal(invocation.file, 'configured-codex')
    assert.deepEqual(invocation.args.slice(0, 4), ['exec', '--cd', candidateDir, '--sandbox'])
    assert.equal(invocation.args[4], 'workspace-write')
    assert.equal(invocation.args.at(-1), '-')
    const schemaPath = invocation.args[invocation.args.indexOf('--output-schema') + 1]
    assert.ok(isAbsolute(schemaPath))
    assert.equal(basename(schemaPath), 'agent-result.schema.json')
    assert.equal(invocation.args[invocation.args.indexOf('--output-last-message') + 1], resultPath)
    assert.equal(invocation.options.timeoutMs, 5_000)
    assert.match(invocation.options.input, /read AGENTS\.md/i)
    assert.match(invocation.options.input, /Basics.*Components.*UI blocks.*Screens\/catalog/is)
    assert.match(invocation.options.input, /task-123/)
    assert.match(invocation.options.input, /standing automatic approval/i)
    assert.match(invocation.options.input, /leave committing and promotion to the worker/i)
    assert.match(invocation.options.input, /\/master\/observatory\/cli\.mjs/)
    assert.match(invocation.options.input, /\/shared\/tasks\.json/)
    assert.match(invocation.options.input, /\$\(touch must-not-run\)/)
    assert.equal(invocation.args.some((arg) => arg.includes('touch must-not-run')), false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('implementChange caps execution at thirty minutes and rejects malformed agent output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ds-agent-'))
  const resultPath = join(root, 'agent-result.json')
  let timeoutMs
  try {
    const result = await implementChange({
      candidateDir: join(root, 'candidate'),
      input,
      resultPath,
      taskId: 'task-456',
      agentTimeoutMs: 60 * 60 * 1000,
      run: async (_file, _args, options) => {
        timeoutMs = options.timeoutMs
        await writeFile(resultPath, JSON.stringify({ outcome: 'implemented', summary: '', error: null }))
        return { stdout: '', stderr: '' }
      },
    })
    assert.equal(timeoutMs, 30 * 60 * 1000)
    assert.equal(result.outcome, 'failed')
    assert.match(result.error, /summary|output/i)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('implementChange records subprocess failures instead of trusting an exit summary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ds-agent-'))
  const resultPath = join(root, 'agent-result.json')
  try {
    const result = await implementChange({
      candidateDir: join(root, 'candidate'),
      input,
      resultPath,
      taskId: 'task-789',
      run: async () => { throw new Error('Command timed out after 20ms: codex') },
    })
    assert.equal(result.outcome, 'failed')
    assert.match(result.error, /timed out/i)
    await assert.rejects(readFile(resultPath, 'utf8'), /ENOENT/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
