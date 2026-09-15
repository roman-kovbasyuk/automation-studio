import test from 'node:test'
import assert from 'node:assert/strict'
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runCommand } from './process.mjs'

test('runCommand passes shell metacharacters as a literal argument', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ds-process-'))
  const marker = join(dir, 'must-not-exist')
  const argument = `$(touch ${marker}); * | still-literal`
  try {
    const result = await runCommand(process.execPath, ['-e', 'process.stdout.write(process.argv[1])', argument], { cwd: dir })
    assert.equal(result.stdout, argument)
    await assert.rejects(access(marker), /ENOENT/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('runCommand terminates its process tree after a timeout', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ds-process-'))
  const marker = join(dir, 'grandchild-survived')
  const grandchild = `setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'alive'), 400)`
  const parent = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(grandchild)}], { stdio: 'ignore' }); setInterval(() => {}, 1000)`
  try {
    await assert.rejects(runCommand(process.execPath, ['-e', parent], { cwd: dir, timeoutMs: 75 }), /timed out/i)
    await new Promise((resolve) => setTimeout(resolve, 550))
    await assert.rejects(access(marker), /ENOENT/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('runCommand reports nonzero exits with bounded output', async () => {
  await assert.rejects(
    runCommand(process.execPath, ['-e', "process.stderr.write('failure detail'); process.exit(7)"], {}),
    (error) => error.code === 7 && error.stderr === 'failure detail',
  )
})

test('runCommand rejects cleanly when a child closes stdin before reading input', async () => {
  await assert.rejects(
    runCommand(process.execPath, ['-e', 'process.exit(0)'], { input: 'x'.repeat(10_000_000) }),
    (error) => error.code === 'EPIPE',
  )
})
