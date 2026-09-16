import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { registerLocalServiceRoutes } from './localServices.js'

describe('local service routes', () => {
  it('exposes status and fixed-id restart routes when registered', async () => {
    const controller = {
      status: vi.fn(async () => ({ services: [] })),
      restart: vi.fn(async (id) => ({ id, ok: true, message: 'Restart requested' })),
      restartAll: vi.fn(async () => ({ results: [] })),
    }
    const app = Fastify()
    registerLocalServiceRoutes(app, { controller })

    await expect(app.inject({ method: 'GET', url: '/api/v1/local-services/status' })).resolves.toMatchObject({ statusCode: 200 })
    const response = await app.inject({ method: 'POST', url: '/api/v1/local-services/admin/restart', payload: { requestId: 'request-1' } })
    expect(response.statusCode).toBe(200)
    expect(controller.restart).toHaveBeenCalledWith('admin', 'request-1')
    await app.close()
  })

  it('rejects a restart payload without a bounded request ID', async () => {
    const app = Fastify()
    registerLocalServiceRoutes(app, { controller: { restart: vi.fn() } })

    const response = await app.inject({ method: 'POST', url: '/api/v1/local-services/admin/restart', payload: {} })
    expect(response.statusCode).toBe(400)
    await app.close()
  })
})
