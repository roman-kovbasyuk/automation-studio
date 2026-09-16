import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'

const execFileAsync = promisify(execFile)
const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

export class LocalServiceError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.name = 'LocalServiceError'
    this.statusCode = statusCode
    this.expose = true
  }
}

export const LOCAL_SERVICE_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'observatory', label: 'Observatory', port: 6002, host: '127.0.0.1', rootKey: 'observatory', command: process.execPath, args: Object.freeze(['observatory/server.mjs']), env: Object.freeze({ PORT: '6002' }) }),
  Object.freeze({ id: 'design-system', label: 'Design System', port: 5178, host: '127.0.0.1', rootKey: 'design-system', command: process.execPath, args: Object.freeze(['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5178']) }),
  Object.freeze({ id: 'studio', label: 'Main application', port: 5176, host: '127.0.0.1', command: process.execPath, args: Object.freeze(['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5176']) }),
  Object.freeze({ id: 'admin', label: 'Admin', port: 5181, host: '127.0.0.1', command: process.execPath, args: Object.freeze(['scripts/testing/start-admin-preview.mjs']), env: Object.freeze({ ADMIN_PREVIEW_PORT: '5181' }) }),
  Object.freeze({ id: 'docs', label: 'Documentation', port: 5180, host: '127.0.0.1', command: process.execPath, args: Object.freeze(['node_modules/vitepress/bin/vitepress.js', 'dev', 'docs-site', '--host', '127.0.0.1', '--port', '5180', '--strictPort']) }),
  Object.freeze({ id: 'orchestrator', label: 'Orchestrator / API', port: 3010, host: '127.0.0.1', command: process.execPath, args: Object.freeze(['scripts/dev-studio.mjs']) }),
])

const byId = definitions => new Map(definitions.map(service => [service.id, service]))

async function findListeners(port) {
  try {
    const { stdout } = await execFileAsync('lsof', ['-nP', '-t', `-iTCP:${port}`, '-sTCP:LISTEN'])
    return stdout.split(/\s+/).filter(Boolean).map(Number).filter(pid => Number.isSafeInteger(pid) && pid > 0)
  } catch (error) {
    if (error.code === 1) return []
    throw error
  }
}

function defaultRunner({ command, args, cwd, env }) {
  const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, detached: true, stdio: 'ignore' })
  child.unref()
}

export function createLocalServiceSupervisor({ root, serviceRoots = {}, definitions = LOCAL_SERVICE_DEFINITIONS, processLookup = findListeners, kill = process.kill, runner = defaultRunner, defer = setTimeout } = {}) {
  if (typeof root !== 'string' || !root) throw new TypeError('A service root is required')
  const services = byId(definitions)
  const resolveArgument = (argument, cwd) => {
    const value = String(argument)
    return value.includes('/') || /\.(?:m?js|cjs|json)$/.test(value) || value === 'docs-site'
      ? resolve(cwd, value)
      : value
  }

  async function restart(id) {
    const service = services.get(id)
    if (!service) throw new LocalServiceError(404, 'Unknown local service')
    const pids = await processLookup(service.port)
    const cwd = service.rootKey && typeof serviceRoots[service.rootKey] === 'string' ? serviceRoots[service.rootKey] : root
    const launch = () => runner({
      id: service.id,
      port: service.port,
      host: service.host,
      command: service.command,
      args: service.args.map(argument => resolveArgument(argument, cwd)),
      cwd,
      env: service.env || {},
    })
    if (service.id === 'orchestrator') {
      defer(() => {
        for (const pid of pids) kill(pid, 'SIGTERM')
        launch()
      }, 100)
      return { id, ok: true, message: 'Restart requested' }
    }
    for (const pid of pids) kill(pid, 'SIGTERM')
    await launch()
    return { id, ok: true, message: 'Restart requested' }
  }

  return Object.freeze({ restart })
}

export { requestIdPattern }
