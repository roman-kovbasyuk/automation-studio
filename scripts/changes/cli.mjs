import { readFile, access } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openStore } from './store.mjs'
import { validateConfig, validateRequest } from './protocol.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
function args(argv) { const out = { _: [] }; for (let i = 0; i < argv.length; i++) { const arg = argv[i]; if (arg.startsWith('--')) { const key = arg.slice(2); const value = argv[++i]; if (key === 'check') (out.check ??= []).push(value); else out[key] = value } else out._.push(arg) } return out }
async function appConfig(appPath, checks) {
  const packagePath = join(appPath, 'package.json'); let pkg
  try { pkg = JSON.parse(await readFile(packagePath, 'utf8')) } catch { throw new Error('application package.json could not be read') }
  if (!checks?.length) throw new Error('at least one --check script is required')
  for (const script of checks) if (!pkg.scripts || typeof pkg.scripts[script] !== 'string') throw new Error(`application check script is missing: ${script}`)
  return validateConfig({ appPath, checkScripts: checks }, { designSystemPath: repoRoot })
}
export async function dispatch(argv = process.argv.slice(2)) {
  const parsed = args(argv); const dataDir = resolve(parsed['data-dir'] ?? join(repoRoot, '.design-system-changes')); const store = openStore(dataDir); const command = parsed._[0]
  if (command === 'configure') { const config = await appConfig(resolve(parsed.app), parsed.check); return store.configure(config) }
  if (command === 'request') { const config = await store.readConfig(); if (!config) throw new Error('design-system change queue is not configured'); const inputPath = resolve(parsed.input); return store.submit(validateRequest(JSON.parse(await readFile(inputPath, 'utf8')))) }
  if (command === 'get') return store.get(parsed._[1])
  throw new Error('usage: changes configure|request|<get>')
}
if (import.meta.url === `file://${process.argv[1]}`) { try { process.stdout.write(`${JSON.stringify(await dispatch())}\n`) } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1 } }
