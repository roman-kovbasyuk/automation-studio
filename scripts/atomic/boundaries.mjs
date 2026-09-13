import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSync } from 'vite'

const allowed = {
  atoms: ['atoms'],
  components: ['atoms', 'components'],
  'ui-blocks': ['atoms', 'components'],
  screens: ['atoms', 'components', 'ui-blocks', 'screens'],
  catalog: ['atoms', 'components', 'ui-blocks', 'screens', 'catalog'],
  public: ['atoms', 'components', 'ui-blocks'],
}
const external = /^(react|react-dom|lucide-react|radix-ui)(\/|$)/
const production = file => /\.(?:[cm]?[jt]sx?|css)$/.test(file) && !/\.(?:test|spec)\./.test(file)

function filesIn(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(root, entry.name)
    return entry.isDirectory() ? filesIn(path) : production(path) ? [path] : []
  })
}

export function checkAtomicBoundaries(root) {
  root = resolve(root)
  const errors = []
  const layer = path => {
    const local = relative(root, path).replaceAll('\\', '/')
    if (local === 'index.ts') return 'public'
    return local.split('/')[0]
  }
  for (const file of filesIn(root)) {
    const owner = layer(file), display = relative(root, file)
    if (!allowed[owner]) { errors.push(`Unknown atomic layer: ${display}`); continue }
    function inspect(specifier) {
      if (!specifier) { errors.push(`${display}: computed module imports are not allowed`); return }
      if (external.test(specifier)) return
      if (!specifier.startsWith('.')) { errors.push(`${display}: unknown external or alias ${specifier}`); return }
      const target = resolve(dirname(file), specifier)
      const base = target.replace(/\.[cm]?jsx?$/, '')
      const imported = [target, ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx', '/index.js'].map(suffix => base + suffix)]
        .find(path => existsSync(path) && statSync(path).isFile())
      if (!imported || !existsSync(imported)) { errors.push(`${display}: unresolved dependency ${specifier}`); return }
      const dependency = layer(imported)
      const localStyle = dependency === owner && extname(imported) === '.css'
      if (!allowed[owner].includes(dependency) && !localStyle) {
        errors.push(`${display} → ${relative(root, imported)}: forbidden ${owner} dependency`)
      }
    }
    const source = readFileSync(file, 'utf8')
    if (extname(file) === '.css') {
      const css = source.replace(/\/\*[\s\S]*?\*\//g, '')
      for (const match of css.matchAll(/@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^);\s]+))/gi)) inspect(match[1] ?? match[2] ?? match[3])
      continue
    }
    const parsed = parseSync(file, source)
    if (parsed.errors.length) { errors.push(`${display}: source parse failed`); continue }
    function visit(node) {
      if (!node || typeof node !== 'object') return
      if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'TSImportType', 'ImportExpression'].includes(node.type) && node.source) inspect(node.source.value)
      if (node.type === 'TSExternalModuleReference') inspect(node.expression?.value)
      if (node.type === 'CallExpression' && node.callee?.name === 'require') inspect(node.arguments[0]?.value)
      for (const child of Object.values(node)) {
        if (Array.isArray(child)) child.forEach(visit)
        else if (child && typeof child === 'object') visit(child)
      }
    }
    visit(parsed.program)
  }
  return errors
}

export function atomicBoundaryPlugin(root) {
  return { name: 'atomic-source-boundaries', buildStart() {
    const errors = checkAtomicBoundaries(root)
    if (errors.length) this.error(errors.join('\n'))
  } }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkAtomicBoundaries(resolve(import.meta.dirname, '../../src/atomic'))
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1 }
  else console.log('Atomic source boundaries verified (including unreachable production files).')
}
