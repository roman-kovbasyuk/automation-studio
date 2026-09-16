import { describe, expect, it, vi } from 'vitest'
import { createLocalServiceController } from './localServiceController.js'
import { LOCAL_SERVICE_DEFINITIONS } from '../../scripts/local-service-supervisor.mjs'

const services = [
  { id: 'studio', label: 'Main application', port: 5176 },
  { id: 'admin', label: 'Admin', port: 5181 },
]

describe('local service controller', () => {
  it('returns safe status records for the fixed service registry', async () => {
    const probe = vi.fn(async ({ port }) => port === 5176)
    const controller = createLocalServiceController({ services, probe, supervisor: { restart: vi.fn() } })

    await expect(controller.status()).resolves.toEqual({ services: [
      { id: 'studio', label: 'Main application', port: 5176, online: true, message: 'Online' },
      { id: 'admin', label: 'Admin', port: 5181, online: false, message: 'Offline' },
    ] })
    expect(probe).toHaveBeenCalledWith({ host: '127.0.0.1', port: 5176 })
  })

  it('rejects unknown services and coalesces repeated request IDs', async () => {
    const restart = vi.fn(async id => ({ id, ok: true, message: 'Restart requested' }))
    const controller = createLocalServiceController({ services, probe: vi.fn(), supervisor: { restart } })

    await expect(controller.restart('missing', 'request-1')).rejects.toMatchObject({ statusCode: 404 })
    await expect(controller.restart('admin', 'request-2')).resolves.toEqual({ id: 'admin', ok: true, message: 'Restart requested' })
    await expect(controller.restart('admin', 'request-2')).resolves.toEqual({ id: 'admin', ok: true, message: 'Restart requested' })
    expect(restart).toHaveBeenCalledTimes(1)
  })

  it('returns one result per fixed service during restart all', async () => {
    const controller = createLocalServiceController({
      services,
      probe: vi.fn(),
      supervisor: { restart: vi.fn(async id => ({ id, ok: id !== 'admin', message: id === 'admin' ? 'Restart failed' : 'Restart requested' })) },
    })

    await expect(controller.restartAll('all-1')).resolves.toEqual({ results: [
      { id: 'studio', ok: true, message: 'Restart requested' },
      { id: 'admin', ok: false, message: 'Restart failed' },
    ] })
  })

  it('keeps every launcher card addressable by the local-service registry', async () => {
    const controller = createLocalServiceController({
      services: LOCAL_SERVICE_DEFINITIONS,
      probe: vi.fn(async ({ port }) => port === 6002),
      supervisor: { restart: vi.fn(async id => ({ id, ok: true, message: 'Restart requested' })) },
    })

    await expect(controller.status()).resolves.toEqual({ services: [
      { id: 'observatory', label: 'Observatory', port: 6002, online: true, message: 'Online' },
      { id: 'design-system', label: 'Design System', port: 5178, online: false, message: 'Offline' },
      { id: 'studio', label: 'Main application', port: 5176, online: false, message: 'Offline' },
      { id: 'admin', label: 'Admin', port: 5181, online: false, message: 'Offline' },
      { id: 'docs', label: 'Documentation', port: 5180, online: false, message: 'Offline' },
      { id: 'orchestrator', label: 'Orchestrator / API', port: 3010, online: false, message: 'Offline' },
    ] })

    await expect(controller.restart('design-system', 'design-system-1')).resolves.toEqual({
      id: 'design-system', ok: true, message: 'Restart requested',
    })
  })
})
