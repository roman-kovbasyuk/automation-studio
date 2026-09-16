import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkStyleBoundary, importedNames, packageHashes, sha256, upstream, verifyDesignSystem } from './design-system-check.mjs'

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'ds-verify-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await Promise.all(['src', 'vendor', 'node_modules/brutalist-design-system'].map(p => mkdir(join(root, p), { recursive: true })))
  const writeJson = (p, value) => writeFile(join(root, p), JSON.stringify(value))
  const spec = 'file:vendor/brutalist-design-system-test.tgz'
  const archive = Buffer.from('synthetic archive bytes; verifier checks identity, updater owns packing')
  const dependencies = { 'brutalist-design-system': spec }
  await writeJson('package.json', { dependencies })
  await writeFile(join(root, 'vendor/brutalist-design-system-test.tgz'), archive)
  await writeFile(join(root, 'node_modules/brutalist-design-system/index.js'), 'export const AppButton = () => null;')
  await writeFile(join(root, 'node_modules/brutalist-design-system/styles.css'), ':root { --v2-ink: black; } .ds-button { color: var(--v2-ink); } .v2-pill-tabs { display: flex; }')
  await writeJson('node_modules/brutalist-design-system/package.json', { type: 'module' })
  await writeJson('package-lock.json', { packages: { '': { dependencies }, 'node_modules/brutalist-design-system': { resolved: spec, integrity: `sha512-${createHash('sha512').update(archive).digest('base64')}` } } })
  await writeJson('vendor/brutalist-design-system.json', { repository: upstream, commit: 'a'.repeat(40), artifact: 'brutalist-design-system-test.tgz', sha256: sha256(archive), files: await packageHashes(join(root, 'node_modules/brutalist-design-system')) })
  await writeFile(join(root, 'src/Example.jsx'), "import { AppButton } from 'brutalist-design-system'; export const Example = () => <AppButton>Save</AppButton>;")
  return { root, writeJson }
}
test('detects aliased imports and reexports without mistaking local names for public API', () => {
  assert.deepEqual(importedNames("import { AppButton as Button } from 'brutalist-design-system'; export { Surface as Panel } from 'brutalist-design-system';"), ['AppButton', 'Surface'])
})
test('accepts matching artifact, lockfile, installed bytes and component imports', async t => {
  const { root } = await fixture(t)
  await mkdir(join(root, 'node_modules/brutalist-design-system/node_modules/dependency'), { recursive: true })
  await writeFile(join(root, 'node_modules/brutalist-design-system/node_modules/dependency/index.js'), 'dependency')
  await verifyDesignSystem(root)
})
test('rejects an alternate archive even when the package version did not change', async t => {
  const { root, writeJson } = await fixture(t)
  await writeJson('package.json', { dependencies: { 'brutalist-design-system': 'file:vendor/local-extension.tgz' } })
  await assert.rejects(verifyDesignSystem(root), /provenance disagree/)
})
test('rejects node_modules modifications and archive replacement', async t => {
  const { root } = await fixture(t)
  const path = join(root, 'node_modules/brutalist-design-system/index.js')
  const before = await readFile(path)
  await writeFile(path, 'export const AppButton = "local patch";')
  await assert.rejects(verifyDesignSystem(root), /Installed design-system files differ/)
  await writeFile(path, before)
  await writeFile(join(root, 'vendor/brutalist-design-system-test.tgz'), 'replacement')
  await assert.rejects(verifyDesignSystem(root), /archive differs/)
})
test('rejects an upstream release that no longer provides an imported component', async t => {
  const { root } = await fixture(t)
  await writeFile(join(root, 'src/Example.jsx'), "import { MissingControl } from 'brutalist-design-system';")
  await assert.rejects(verifyDesignSystem(root), /imports missing export MissingControl/)
})

test('rejects private component selectors while allowing app-owned layout', async t => {
  const { root } = await fixture(t)
  await writeFile(join(root, 'src/layout.css'), '.app-toolbar { display: flex; gap: 16px; }')
  await verifyDesignSystem(root)
  await writeFile(join(root, 'src/layout.css'), '.app-toolbar .ds-button { padding: 2px; }')
  await assert.rejects(verifyDesignSystem(root), /private component selector/)
})

test('rejects token redefinitions even in an app-specific selector', async t => {
  const { root } = await fixture(t)
  await writeFile(join(root, 'src/layout.css'), '.app-panel { --v2-ink: red; }')
  await assert.rejects(verifyDesignSystem(root), /redefines upstream token/)
})

test('rejects reinstalling the second design-system dependency', async t => {
  const { root, writeJson } = await fixture(t)
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  manifest.dependencies['@roman-kovbasyuk/banner-design-system'] = 'file:vendor/legacy.tgz'
  await writeJson('package.json', manifest)
  await assert.rejects(verifyDesignSystem(root), /Legacy design-system dependency/)
})

test('protects legacy class names still owned by the canonical package', async t => {
  const { root } = await fixture(t)
  await writeFile(join(root, 'src/layout.css'), '.app-toolbar .v2-pill-tabs { background: red; }')
  await assert.rejects(verifyDesignSystem(root), /private component selector/)
})


test('rejects explicit styling on aliased and namespaced upstream controls', async t => {
  const { root } = await fixture(t)
  for (const source of [
    "import { AppButton as Save } from 'brutalist-design-system'; const A = () => <Save className='local-skin' />;",
    "import * as DS from 'brutalist-design-system'; const A = () => <DS.AppButton style={{ padding: 2 }} />;",
  ]) {
    await writeFile(join(root, 'src/Example.jsx'), source)
    await assert.rejects(verifyDesignSystem(root), /customizes an upstream component/)
  }
})

test('allows component variants and layout on plain containers', async t => {
  const { root } = await fixture(t)
  await writeFile(join(root, 'src/Example.jsx'), "import { AppButton } from 'brutalist-design-system'; const A = () => <div className='toolbar'><AppButton variant='primary'>Save</AppButton></div>;")
  await verifyDesignSystem(root)
})

test('protects Atomic component classes at all three layers', async t => {
  const { root } = await fixture(t)
  await writeFile(join(root, 'node_modules/brutalist-design-system/styles.css'), '.atomic-root { color: var(--a-color-ink); } .a-type {} .c-button {} .b-sidebar {}')
  for (const selector of ['atomic-root', 'a-type', 'c-button', 'b-sidebar']) {
    await writeFile(join(root, 'src/layout.css'), `.app-layout .${selector} { padding: 2px; }`)
    await assert.rejects(checkStyleBoundary(root), /private component selector/)
  }
})

test('protects Atomic tokens referenced by CSS but supplied by AtomsRoot', async t => {
  const { root } = await fixture(t)
  await writeFile(join(root, 'node_modules/brutalist-design-system/styles.css'), '.c-button { color: var(--a-color-ink); gap: var(--a-space-4); }')
  await writeFile(join(root, 'src/layout.css'), '.app-layout { --a-color-ink: red; }')
  await assert.rejects(checkStyleBoundary(root), /redefines upstream token --a-color-ink/)
  await writeFile(join(root, 'src/layout.css'), '.app-layout { display: grid; gap: var(--a-space-4); }')
  await checkStyleBoundary(root)
})
