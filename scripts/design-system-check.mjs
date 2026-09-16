import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { resolve, relative, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse } from '@babel/parser'
import postcss from 'postcss'

export const packageName = 'brutalist-design-system'
export const upstream = 'https://github.com/roman-kovbasyuk/brutalist-design-system.git'
export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const sha256 = data => createHash('sha256').update(data).digest('hex')
export async function filesUnder(root) {
  const files = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    // npm may nest peer/dependency packages here; their integrity belongs to the lockfile.
    if (entry.name === 'node_modules') continue
    const path = resolve(root, entry.name)
    if (entry.isDirectory()) files.push(...await filesUnder(path))
    else if (entry.isFile()) files.push(path)
  }
  return files.sort()
}
export async function packageHashes(root) {
  const result = {}
  for (const file of await filesUnder(root)) result[relative(root, file)] = sha256(await readFile(file))
  return result
}
export function importedNames(source, filename = '') {
  const ast = parse(source, { sourceType: 'unambiguous', plugins: ['jsx', ...(filename.endsWith('.ts') || filename.endsWith('.tsx') ? ['typescript'] : [])] })
  const names = []
  for (const node of ast.program.body) {
    if (node.source?.value !== packageName) continue
    for (const spec of node.specifiers ?? []) {
      if (spec.type === 'ImportSpecifier') names.push(spec.imported.name ?? spec.imported.value)
      if (spec.type === 'ImportDefaultSpecifier') names.push('default')
      if (spec.type === 'ExportSpecifier') names.push(spec.local.name ?? spec.local.value)
    }
  }
  return names
}
export async function checkExports(root, exports) {
  const missing = []
  for (const file of await filesUnder(resolve(root, 'src'))) {
    if (!/\.[cm]?[jt]sx?$/.test(file) || /\.test\./.test(file)) continue
    for (const name of importedNames(await readFile(file, 'utf8'), file)) {
      if (!exports.includes(name)) missing.push(`${relative(root, file)} imports missing export ${name}`)
    }
  }
  if (missing.length) throw new Error(`Candidate package cannot serve the current app:\n${missing.join('\n')}`)
}
// Explicit public component styling is forbidden. Arbitrary spreads and ancestor
// selectors still require rendered review; this check does not infer their values.
export async function checkComponentProps(root) {
  const problems = []
  for (const file of await filesUnder(resolve(root, 'src'))) {
    if (!/\.[cm]?[jt]sx?$/.test(file) || /\.test\./.test(file)) continue
    const ast = parse(await readFile(file, 'utf8'), { sourceType: 'unambiguous', plugins: ['jsx', ...(file.endsWith('.ts') || file.endsWith('.tsx') ? ['typescript'] : [])] })
    const components = new Set()
    const namespaces = new Set()
    for (const node of ast.program.body) {
      if (node.type !== 'ImportDeclaration' || node.source.value !== packageName) continue
      for (const spec of node.specifiers) {
        if (spec.type === 'ImportNamespaceSpecifier') namespaces.add(spec.local.name)
        else components.add(spec.local.name)
      }
    }
    function visit(node) {
      if (!node || typeof node !== 'object') return
      if (node.type === 'JSXOpeningElement') {
        const direct = node.name.type === 'JSXIdentifier' && components.has(node.name.name)
        const member = node.name.type === 'JSXMemberExpression' && namespaces.has(node.name.object.name)
        if (direct || member) for (const attr of node.attributes) {
          if (attr.type === 'JSXAttribute' && ['className', 'style'].includes(attr.name.name)) {
            problems.push(`${relative(root, file)}:${attr.loc.start.line} customizes an upstream component with ${attr.name.name}`)
          }
        }
      }
      for (const [key, value] of Object.entries(node)) {
        if (key === 'loc') continue
        if (Array.isArray(value)) value.forEach(visit)
        else if (value && typeof value === 'object') visit(value)
      }
    }
    visit(ast.program)
  }
  if (problems.length) throw new Error(`Keep layout on plain app containers, not upstream component roots:\n${problems.join('\n')}`)
}

export async function checkStyleBoundary(root, packageRoot = resolve(root, 'node_modules', packageName)) {
  const canonical = await readFile(resolve(packageRoot, 'styles.css'), 'utf8')
  const protectedClasses = new Set([...canonical.matchAll(/\.((?:ds|v2|a|b|c|atomic)-[\w-]+)/g)].map(match => match[1]))
  const protectedTokens = new Set([...canonical.matchAll(/(--(?:v2|primitive|a)-[\w-]+)/g)].map(match => match[1]))
  const problems = []
  for (const file of await filesUnder(resolve(root, 'src'))) {
    if (!file.endsWith('.css')) continue
    const css = postcss.parse(await readFile(file, 'utf8'), { from: file })
    css.walkDecls(decl => {
      if (protectedTokens.has(decl.prop)) problems.push(`${relative(root, file)}:${decl.source.start.line} redefines upstream token ${decl.prop}`)
    })
    css.walkRules(rule => {
      if ([...rule.selector.matchAll(/\.((?:ds|v2|a|b|c|atomic)-[\w-]+)/g)].some(match => protectedClasses.has(match[1]))) {
        problems.push(`${relative(root, file)}:${rule.source.start.line} targets a private component selector: ${rule.selector}`)
      }
    })
  }
  if (problems.length) throw new Error(`App CSS must not target Brutalist component internals:\n${problems.join('\n')}`)
}

export async function verifyDesignSystem(root = projectRoot) {
  const readJson = async file => JSON.parse(await readFile(resolve(root, file), 'utf8'))
  const [manifest, lock, provenance] = await Promise.all([
    readJson('package.json'), readJson('package-lock.json'), readJson('vendor/brutalist-design-system.json'),
  ])
  if (manifest.dependencies?.['@roman-kovbasyuk/banner-design-system']) throw new Error('Legacy design-system dependency must not be reintroduced')
  if (provenance.repository !== upstream || !/^[a-f0-9]{40}$/.test(provenance.commit)) throw new Error('Invalid canonical upstream provenance')
  if (!/^brutalist-design-system-[a-zA-Z0-9.-]+\.tgz$/.test(provenance.artifact)) throw new Error('Invalid artifact filename')
  const spec = `file:vendor/${provenance.artifact}`
  if (manifest.dependencies?.[packageName] !== spec || lock.packages?.['']?.dependencies?.[packageName] !== spec) throw new Error('Design-system manifest, lockfile, and provenance disagree. Use npm run design-system:update.')
  const archive = await readFile(resolve(root, 'vendor', provenance.artifact))
  if (sha256(archive) !== provenance.sha256) throw new Error('Design-system archive differs from its recorded upstream build')
  const installed = lock.packages?.[`node_modules/${packageName}`]
  const integrity = `sha512-${createHash('sha512').update(archive).digest('base64')}`
  if (installed?.resolved !== spec || installed?.integrity !== integrity) throw new Error('Lockfile does not resolve the verified design-system archive')
  const actual = await packageHashes(resolve(root, 'node_modules', packageName))
  if (JSON.stringify(actual) !== JSON.stringify(provenance.files)) throw new Error('Installed design-system files differ from the upstream artifact; run npm ci. Do not edit node_modules.')
  const exports = Object.keys(await import(pathToFileURL(resolve(root, 'node_modules', packageName, 'index.js')).href))
  await checkExports(root, exports)
  await checkStyleBoundary(root)
  await checkComponentProps(root)
  console.log(`Design-system provenance, installed files, and imports verified: ${provenance.commit}`)
  return provenance
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await verifyDesignSystem() } catch (error) { console.error(error.message); process.exitCode = 1 }
}
