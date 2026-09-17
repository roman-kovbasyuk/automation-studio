import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  checkPackageIsolation, checkPublicEntryPoints, checkStyleBoundary, checkVocabulary, checkWorkspaceLink, importedNames,
  moduleSpecifiers, packageExports, verifyDesignSystem,
} from './design-system-check.mjs'

const pkg = 'packages/brutalist-design-system'

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'ds-boundary-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const write = async (path, content) => {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), typeof content === 'string' ? content : JSON.stringify(content))
  }
  await write('package.json', { workspaces: ['packages/*'], dependencies: { 'brutalist-design-system': '^0.1.0' } })
  await write(`${pkg}/package.json`, { name: 'brutalist-design-system', version: '0.1.0', exports: { '.': { source: './src/atomic/index.ts' } },
    dependencies: { 'lucide-react': '^1.43.0' }, peerDependencies: { react: '>=19' }, devDependencies: { vitest: '^5.0.0' } })
  await write(`${pkg}/src/atomic/index.ts`, "export * from './components'\nexport { SidebarPanel } from './ui-blocks/SidebarPanel'\n")
  await write(`${pkg}/src/atomic/components/index.ts`, "export { Button, buttonSizes } from './Button'\nexport type { ButtonProps } from './Button'\nexport const [firstTone, ...otherTones] = ['neutral', 'accent']\n")
  await write(`${pkg}/src/atomic/components/Button.tsx`, "import './button.css'\nimport { useId } from 'react'\nimport { Plus } from 'lucide-react'\nexport type ButtonProps = { label: string }\nexport const buttonSizes = ['default']\nexport function Button(props: ButtonProps) { useId(); return <button>{props.label}<Plus /></button> }\n")
  await write(`${pkg}/src/atomic/components/button.css`, '.c-button { color: var(--a-color-ink); gap: var(--a-space-4); } .atomic-root {} .a-type {} .b-sidebar {} .v2-pill-tabs {}')
  await write(`${pkg}/src/atomic/components/Button.test.tsx`, "import { readFileSync } from 'node:fs'\nimport { expect, test } from 'vitest'\ntest('renders', () => expect(readFileSync).toBeTruthy())\n")
  await write(`${pkg}/src/atomic/ui-blocks/SidebarPanel.tsx`, "import { Button } from '../components/Button'\nexport function SidebarPanel() { return <Button label='New project' /> }\n")
  await write('scripts/design-system-vocabulary.json', { entries: [] })
  await write('src/Example.jsx', "import { Button } from 'brutalist-design-system'\nimport 'brutalist-design-system/styles.css'\nexport const Example = () => <Button label='Save' />\n")
  await mkdir(join(root, 'node_modules'), { recursive: true })
  await symlink(join('..', pkg), join(root, 'node_modules/brutalist-design-system'))
  return { root, write }
}

test('accepts a workspace package used through its public entry points', async t => {
  const { root } = await fixture(t)
  await verifyDesignSystem(root)
})

test('finds static, dynamic, re-exported, required and CSS imports, ignoring URLs', () => {
  const found = moduleSpecifiers("import a from 'a'\nexport { b } from './b?raw'\nexport * from 'c'\nconst d = await import('d')\nconst e = require('e')\n", 'x.js')
  assert.deepEqual(found.map(item => item.specifier), ['a', './b', 'c', 'd', 'e'])
  assert.deepEqual(moduleSpecifiers("@import './tokens.css';\n@import url('https://fonts.example/font.css');", 'x.css').map(item => item.specifier), ['./tokens.css'])
})

test('rejects a package file that imports application code', async t => {
  const { root, write } = await fixture(t)
  await write(`${pkg}/src/atomic/components/Button.tsx`, "import { api } from '../../../../../src/studio/api.js'\nexport function Button() { return api }\n")
  await assert.rejects(checkPackageIsolation(root), /Button\.tsx:1 imports \.\.\/\.\.\/\.\.\/\.\.\/\.\.\/src\/studio\/api\.js, outside the package/)
})

test('rejects a package import of a module the package does not declare', async t => {
  const { root, write } = await fixture(t)
  await write(`${pkg}/src/atomic/components/Button.tsx`, "import clsx from 'clsx'\nimport { Slot } from '@radix-ui/react-slot'\nexport function Button() { return clsx(Slot) }\n")
  await assert.rejects(checkPackageIsolation(root), error => /imports clsx, which the package does not declare/.test(error.message) && /@radix-ui\/react-slot/.test(error.message))
})

test('rejects application deep imports and relative imports of package files', async t => {
  const { root, write } = await fixture(t)
  await write('src/Deep.jsx', "import { Button } from 'brutalist-design-system/src/atomic/components/Button'\n")
  await assert.rejects(checkPublicEntryPoints(root), /src\/Deep\.jsx:1 imports brutalist-design-system\/src\/atomic\/components\/Button; use brutalist-design-system or brutalist-design-system\/styles\.css/)
  await write('src/Deep.jsx', "import '../packages/brutalist-design-system/src/atomic/components/button.css'\n")
  await assert.rejects(checkPublicEntryPoints(root), /imports package files directly/)
})

test('rejects product vocabulary unless a reviewed allowlist entry covers it, and stale entries', async t => {
  const { root, write } = await fixture(t)
  await write(`${pkg}/src/atomic/ui-blocks/SidebarPanel.tsx`, "import { Button } from '../components/Button'\nexport function SidebarPanel() { return <Button label='New Campaign' /> }\n")
  await assert.rejects(checkVocabulary(root, []), /src\/atomic\/ui-blocks\/SidebarPanel\.tsx uses the product term "campaign"/)
  const entry = { file: 'src/atomic/ui-blocks/SidebarPanel.tsx', term: 'campaign', reason: 'test' }
  await checkVocabulary(root, [entry])
  await assert.rejects(checkVocabulary(root, [entry, { file: 'src/atomic/components/Button.tsx', term: 'banner', reason: 'test' }]), /no longer matches; remove it/)
})

test('rejects an installed copy that is not the workspace package', async t => {
  const { root, write } = await fixture(t)
  await rm(join(root, 'node_modules/brutalist-design-system'))
  await write('node_modules/brutalist-design-system/package.json', { name: 'brutalist-design-system' })
  await assert.rejects(checkWorkspaceLink(root), /is not the workspace package/)
  await write('package.json', { workspaces: ['packages/*'], dependencies: { 'brutalist-design-system': 'file:vendor/brutalist.tgz' } })
  await assert.rejects(checkWorkspaceLink(root), /must depend on the packages\/brutalist-design-system workspace package/)
  await write('package.json', { workspaces: ['packages/*'], dependencies: { 'brutalist-design-system': '^0.1.0', '@roman-kovbasyuk/banner-design-system': 'file:legacy.tgz' } })
  await assert.rejects(checkWorkspaceLink(root), /Legacy design-system dependency/)
})

test('reads runtime exports from package source, following re-exports and skipping types', async t => {
  const { root, write } = await fixture(t)
  assert.deepEqual((await packageExports(root)).sort(), ['Button', 'SidebarPanel', 'buttonSizes', 'firstTone', 'otherTones'])
  await write('src/Example.jsx', "import { ButtonProps } from 'brutalist-design-system'\n")
  await assert.rejects(verifyDesignSystem(root), /src\/Example\.jsx imports missing export ButtonProps/)
})

test('detects aliased imports and reexports without mistaking local names for public API', () => {
  assert.deepEqual(importedNames("import { AppButton as Button } from 'brutalist-design-system'; export { Surface as Panel } from 'brutalist-design-system';"), ['AppButton', 'Surface'])
})

test('rejects private component selectors and token redefinitions while allowing app-owned layout', async t => {
  const { root, write } = await fixture(t)
  await write('src/layout.css', '.app-toolbar { display: flex; gap: var(--a-space-4); }')
  await checkStyleBoundary(root)
  for (const selector of ['c-button', 'atomic-root', 'a-type', 'b-sidebar', 'v2-pill-tabs']) {
    await write('src/layout.css', `.app-layout .${selector} { padding: 2px; }`)
    await assert.rejects(checkStyleBoundary(root), /private component selector/)
  }
  await write('src/layout.css', '.app-panel { --a-color-ink: red; }')
  await assert.rejects(checkStyleBoundary(root), /redefines upstream token --a-color-ink/)
})

test('rejects explicit styling on aliased and namespaced upstream controls, but not on plain containers', async t => {
  const { root, write } = await fixture(t)
  for (const source of [
    "import { Button as Save } from 'brutalist-design-system'; const A = () => <Save className='local-skin' />;",
    "import * as DS from 'brutalist-design-system'; const A = () => <DS.Button style={{ padding: 2 }} />;",
  ]) {
    await write('src/Example.jsx', source)
    await assert.rejects(verifyDesignSystem(root), /customizes an upstream component/)
  }
  await write('src/Example.jsx', "import { Button } from 'brutalist-design-system'; const A = () => <div className='toolbar'><Button label='Save' /></div>;")
  await verifyDesignSystem(root)
})
