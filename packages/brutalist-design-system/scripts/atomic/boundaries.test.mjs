import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

async function check(files) {
  const root = mkdtempSync(join(tmpdir(), 'atomic-boundary-test-'))
  try {
    for (const [file, content] of Object.entries(files)) {
      const path = join(root, file)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, content)
    }
    const module = await import('./boundaries.mjs')
    return module.checkAtomicBoundaries(root)
  } finally { rmSync(root, { recursive: true, force: true }) }
}

test('verifier exposes the executable source-wide check', async () => {
  const exists = await import('./boundaries.mjs').then(m => typeof m.checkAtomicBoundaries === 'function').catch(() => false)
  assert.equal(exists, true)
})

test('permits components composed from Atoms and sibling components', async () => {
  assert.deepEqual(await check({ 'atoms/Text.ts': 'export const Text = 1', 'components/Tag.ts': "export { Text } from '../atoms/Text'", 'components/Panel.ts': "import { Text } from './Tag'" }), [])
})

test('rejects upward imports in files unreachable from any entry', async () => {
  const errors = await check({ 'atoms/unused.ts': "import '../components/Button'", 'components/Button.ts': 'export const Button = 1' })
  assert.match(errors.join('\n'), /atoms\/unused.ts.*components\/Button/)
})

test('UI blocks cannot depend on each other', async () => {
  const errors = await check({ 'ui-blocks/One.ts': "export { Two } from './Two'", 'ui-blocks/Two.ts': 'export const Two = 1' })
  assert.match(errors.join('\n'), /ui-blocks\/One.ts.*ui-blocks\/Two/)
})

test('rejects dynamic upward imports, unknown aliases and computed imports', async () => {
  const errors = await check({ 'atoms/One.ts': "import('../components/Two'); import('@app/legacy'); const path='x'; import(path)", 'components/Two.ts': 'export const Two = 1' })
  assert.equal(errors.length, 3)
})

test('checks CSS dependencies and rejects unresolved relative sources', async () => {
  const errors = await check({ 'atoms/styles.css': "@import '../components/styles.css';", 'components/styles.css': '', 'components/One.ts': "import './missing'" })
  assert.equal(errors.length, 2)
})
