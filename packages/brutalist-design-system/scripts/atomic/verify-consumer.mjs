import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { componentManifest } from '../../src/atomic/componentManifest.js'

const root = resolve(import.meta.dirname, '../..')
const artifact = join(root, 'dist-atomic-library')
const packageName = 'brutalist-design-system'
const rawArgs = process.argv.slice(2)
const keep = rawArgs.includes('--keep')
const cliArgs = rawArgs.filter((argument) => argument !== '--keep')
let suppliedTarball = null
if (cliArgs.length) {
  if (cliArgs.length !== 2 || cliArgs[0] !== '--tarball') throw new Error('Usage: verify-consumer.mjs [--keep] [--tarball <absolute-path>]')
  if (!isAbsolute(cliArgs[1])) throw new Error('--tarball must be an absolute path')
  if (!existsSync(cliArgs[1])) throw new Error(`Tarball does not exist: ${cliArgs[1]}`)
  suppliedTarball = resolve(cliArgs[1])
} else if (!existsSync(join(artifact, 'package.json'))) throw new Error('Run npm run build:atomic-library first.')
const workspace = mkdtempSync(join(tmpdir(), 'atomic-package-consumer-'))
const fixture = join(workspace, 'app')
function run(args, cwd = fixture) { execFileSync('npm', args, { cwd, stdio: 'inherit', env: { ...process.env, npm_config_cache: join(workspace, 'npm-cache') } }) }
function pack(source, destination) {
  mkdirSync(destination, { recursive: true })
  const output = execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', destination, source], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, npm_config_cache: join(workspace, 'npm-cache') },
  })
  let metadata
  try { metadata = JSON.parse(output)?.[0] } catch { throw new Error('npm pack returned invalid JSON') }
  if (metadata?.name !== packageName || typeof metadata.version !== 'string' || !metadata.version) throw new Error('npm pack returned invalid package metadata')
  return metadata
}
try {
  let packageSource = suppliedTarball
  let expectedVersion
  if (packageSource) {
    expectedVersion = pack(packageSource, join(workspace, 'tarball-metadata')).version
  } else {
    const library = JSON.parse(readFileSync(join(artifact, 'package.json'), 'utf8'))
    expectedVersion = library.version
    const metadata = pack(artifact, workspace)
    if (metadata.version !== expectedVersion) throw new Error(`Packed ${metadata.version}; expected ${expectedVersion}`)
    const filename = metadata.filename
    if (typeof filename !== 'string') throw new Error('npm pack did not return a tarball filename')
    packageSource = join(workspace, filename)
  }
  const source = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  cpSync(join(root, 'fixtures/atomic-consumer'), fixture, { recursive: true })
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({
    name: 'atomic-consumer-check', private: true, type: 'module',
    scripts: { typecheck: 'tsc --noEmit', build: 'vite build', 'build:ssr': 'vite build --ssr src/App.tsx --outDir dist-ssr' },
    dependencies: {
      [packageName]: `file:${packageSource}`,
      react: source.devDependencies.react, 'react-dom': source.devDependencies['react-dom'],
    },
    devDependencies: Object.fromEntries(['@types/react', '@types/react-dom', '@vitejs/plugin-react', 'typescript', 'vite'].map(name => [name, source.devDependencies[name]])),
  }, null, 2))
  run(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--fetch-retries=0', '--fetch-timeout=30000'])
  const installed = JSON.parse(readFileSync(join(fixture, 'node_modules', packageName, 'package.json'), 'utf8'))
  if (installed.name !== packageName) throw new Error('Installed tarball is not the design-system package')
  if (installed.version !== expectedVersion) throw new Error(`Installed ${installed.version}; expected ${expectedVersion}`)
  run(['run', 'typecheck'])
  run(['run', 'build'])
  run(['run', 'build:ssr'])
  execFileSync(process.execPath, ['verify.mjs', JSON.stringify(componentManifest.map(item => item.name))], { cwd: fixture, stdio: 'inherit' })
  console.log(`Packed atomic consumer verified at ${installed.version} with independent dependencies and no source aliases.`)
} finally {
  if (keep) console.log(`Consumer fixture retained for browser verification: ${fixture}`)
  else rmSync(workspace, { recursive: true, force: true })
}
