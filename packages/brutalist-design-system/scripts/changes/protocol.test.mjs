import test from 'node:test'
import assert from 'node:assert/strict'
import { validateRequest, validateConfig } from './protocol.mjs'

test('validates and trims request fields', () => {
  assert.deepEqual(validateRequest({ requestId: 'r1', installedVersion: ' 0.1.0 ', component: ' Button ', change: ' Add it ' }), { requestId: 'r1', installedVersion: '0.1.0', component: 'Button', change: 'Add it' })
  assert.throws(() => validateRequest({ requestId: '../bad', installedVersion: 'x', component: 'x', change: 'x' }), /format/)
  assert.throws(() => validateRequest({ requestId: 'r1', installedVersion: 'x', component: 'x', change: 'x', extra: 1 }), /unknown/)
  assert.throws(() => validateRequest(null), /object/)
  assert.throws(() => validateRequest({ requestId: 'r1', installedVersion: '', component: 'x', change: 'x' }), /installedVersion/)
})

test('validates config and rejects design system checkout', () => {
  assert.deepEqual(validateConfig({ appPath: '/tmp/app', checkScripts: ['test'] }), { appPath: '/tmp/app', checkScripts: ['test'], masterBranch: 'main', agentExecutable: 'codex', agentTimeoutMs: 1800000 })
  assert.throws(() => validateConfig({ appPath: '/tmp/design-system', checkScripts: ['test'] }, { designSystemPath: '/tmp/design-system' }), /design-system/)
})

test('projects adoption independently from package readiness', async () => {
  const { publicResult } = await import('./protocol.mjs')
  assert.deepEqual(publicResult({
    input: { requestId: 'r1' },
    status: 'ready',
    version: '0.1.0-change.1',
    packagePath: '/tmp/package.tgz',
    adoption: { status: 'failed', error: 'APP_CHECK_FAILED: build failed' },
  }), {
    requestId: 'r1',
    status: 'ready',
    version: '0.1.0-change.1',
    packagePath: '/tmp/package.tgz',
    adoption: { status: 'failed', error: 'APP_CHECK_FAILED: build failed' },
  })
})
