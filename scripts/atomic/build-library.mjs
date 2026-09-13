import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
for (const args of [['vite', 'build', '--config', 'vite.atomic.library.config.ts'], ['tsc', '-p', 'tsconfig.atomic.library.json']]) {
  execFileSync('npm', ['exec', '--', ...args], { cwd: root, stdio: 'inherit' })
}
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
// Vite extracts CSS to one public entry; declaration files must not reference
// the source-only per-component stylesheets that are absent from that artifact.
function cleanDeclarations(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) cleanDeclarations(path)
    else if (entry.name.endsWith('.d.ts')) writeFileSync(path, readFileSync(path, 'utf8').replace(/^import\s+['"][^'"]+\.css['"];?\s*$/gm, ''))
  }
}
cleanDeclarations(resolve(root, 'dist-atomic-library'))
writeFileSync(resolve(root, 'dist-atomic-library/styles.css.d.ts'), 'declare const stylesheet: string\nexport default stylesheet\n')
writeFileSync(resolve(root, 'dist-atomic-library/package.json'), JSON.stringify({
  name: 'brutalist-design-system', version: `${manifest.version}-atomic.0`, private: true, type: 'module',
  exports: { '.': { types: './index.d.ts', import: './index.js' }, './styles.css': { types: './styles.css.d.ts', default: './styles.css' } },
  files: ['**/*.js', '**/*.d.ts', '**/*.css'], sideEffects: ['**/*.css'],
  peerDependencies: { react: '>=19', 'react-dom': '>=19' },
  dependencies: { 'lucide-react': manifest.dependencies['lucide-react'], 'radix-ui': manifest.dependencies['radix-ui'] },
}, null, 2) + '\n')
console.log('Atomic library artifact ready in dist-atomic-library; nothing published.')
