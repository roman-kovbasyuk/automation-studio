import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { componentManifest } from '../../src/atomic/catalog/componentManifest.js'

const root = resolve(import.meta.dirname, '../..')
const artifact = join(root, 'dist-atomic-library')
if (!existsSync(join(artifact, 'package.json'))) throw new Error('Run npm run build:atomic-library first.')
const workspace = mkdtempSync(join(tmpdir(), 'atomic-package-consumer-'))
const fixture = join(workspace, 'app')
const keep = process.argv.includes('--keep')
function run(args, cwd = fixture) { execFileSync('npm', args, { cwd, stdio: 'inherit', env: { ...process.env, npm_config_cache: join(workspace, 'npm-cache') } }) }
try {
  run(['pack', artifact, '--pack-destination', workspace, '--ignore-scripts'], root)
  const library = JSON.parse(readFileSync(join(artifact, 'package.json'), 'utf8'))
  const source = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  cpSync(join(root, 'fixtures/atomic-consumer'), fixture, { recursive: true })
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({
    name: 'atomic-consumer-check', private: true, type: 'module',
    scripts: { typecheck: 'tsc --noEmit', build: 'vite build', 'build:ssr': 'vite build --ssr src/App.tsx --outDir dist-ssr' },
    dependencies: {
      'brutalist-design-system': `file:${join(workspace, `${library.name}-${library.version}.tgz`)}`,
      react: source.dependencies.react, 'react-dom': source.dependencies['react-dom'],
    },
    devDependencies: Object.fromEntries(['@types/react', '@types/react-dom', '@vitejs/plugin-react', 'typescript', 'vite'].map(name => [name, source.devDependencies[name]])),
  }, null, 2))
  run(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--fetch-retries=0', '--fetch-timeout=30000'])
  run(['run', 'typecheck'])
  run(['run', 'build'])
  run(['run', 'build:ssr'])
  execFileSync(process.execPath, ['verify.mjs', JSON.stringify(componentManifest.map(item => item.name))], { cwd: fixture, stdio: 'inherit' })
  console.log('Packed atomic consumer verified with independent dependencies and no source aliases.')
} finally {
  if (keep) console.log(`Consumer fixture retained for browser verification: ${fixture}`)
  else rmSync(workspace, { recursive: true, force: true })
}
