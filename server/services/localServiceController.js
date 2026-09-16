import { LocalServiceError } from '../../scripts/local-service-supervisor.mjs'
import net from 'node:net'

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

function validateRequestId(requestId) {
  if (typeof requestId !== 'string' || !requestIdPattern.test(requestId)) throw new LocalServiceError(400, 'A bounded request ID is required')
}

export function createLocalServiceController({ services, probe = async ({ host, port }) => {
  try {
    const socket = await new Promise(resolve => {
      const connection = net.createConnection({ host, port })
      const finish = online => { connection.destroy(); resolve(online) }
      connection.once('connect', () => finish(true))
      connection.once('error', () => finish(false))
      connection.setTimeout(500, () => finish(false))
    })
    return socket
  } catch { return false }
}, supervisor } = {}) {
  if (!Array.isArray(services) || !supervisor || typeof supervisor.restart !== 'function') throw new TypeError('Services and supervisor are required')
  const registry = new Map(services.map(service => [service.id, Object.freeze({ ...service })]))
  const completed = new Map()
  const pending = new Map()

  async function status() {
    const rows = await Promise.all([...registry.values()].map(async service => {
      const online = await probe({ host: '127.0.0.1', port: service.port })
      return { id: service.id, label: service.label, port: service.port, online: Boolean(online), message: online ? 'Online' : 'Offline' }
    }))
    return { services: rows }
  }

  async function restart(id, requestId) {
    validateRequestId(requestId)
    if (!registry.has(id)) throw new LocalServiceError(404, 'Unknown local service')
    if (completed.has(requestId)) return completed.get(requestId)
    if (pending.has(id)) throw new LocalServiceError(409, 'This local service is already restarting')
    const operation = Promise.resolve().then(() => supervisor.restart(id)).then(result => {
      completed.set(requestId, result)
      return result
    }).finally(() => pending.delete(id))
    pending.set(id, operation)
    return operation
  }

  async function restartAll(requestId) {
    validateRequestId(requestId)
    if (completed.has(requestId)) return completed.get(requestId)
    const results = await Promise.all([...registry.keys()].map(id => restart(id, `${requestId}:${id}`)
      .catch(error => ({ id, ok: false, message: error.message }))))
    const result = { results }
    completed.set(requestId, result)
    return result
  }

  return Object.freeze({ status, restart, restartAll })
}
