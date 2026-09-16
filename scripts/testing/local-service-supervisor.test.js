import { describe, expect, it, vi } from 'vitest'
import { createLocalServiceSupervisor, LOCAL_SERVICE_DEFINITIONS } from '../local-service-supervisor.mjs'

describe('local service supervisor', () => {
  it('contains only fixed loopback service descriptors', () => {
    expect(LOCAL_SERVICE_DEFINITIONS).toHaveLength(6)
    for (const service of LOCAL_SERVICE_DEFINITIONS) {
      expect(service.host).toBe('127.0.0.1')
      expect(service.port).toBeGreaterThan(0)
      expect(service.command).toBeTypeOf('string')
      expect(service.args).toBeInstanceOf(Array)
      expect(service.args.join(' ')).not.toMatch(/[;&|`$]/)
    }
  })

  it('can plan restarts for the launcher-only services', async () => {
    const runner = vi.fn(async () => {})
    const processLookup = vi.fn(async () => [])
    const supervisor = createLocalServiceSupervisor({ root: '/workspace', runner, processLookup, kill: vi.fn() })

    await expect(supervisor.restart('design-system')).resolves.toEqual({
      id: 'design-system', ok: true, message: 'Restart requested',
    })
    expect(runner).toHaveBeenCalledWith(expect.objectContaining({ id: 'design-system', port: 5178 }))
  })

  it('launches Observatory from its project-root entrypoint', async () => {
    const runner = vi.fn(async () => {})
    const supervisor = createLocalServiceSupervisor({ root: '/workspace', runner, processLookup: vi.fn(async () => []), kill: vi.fn() })

    await supervisor.restart('observatory')

    expect(runner).toHaveBeenCalledWith(expect.objectContaining({
      id: 'observatory', cwd: '/workspace', args: ['/workspace/observatory/server.mjs'],
    }))
  })

  it('terminates validated listeners and starts the selected fixed command', async () => {
    const kill = vi.fn()
    const runner = vi.fn(async () => {})
    const processLookup = vi.fn(async () => [1234, 5678])
    const supervisor = createLocalServiceSupervisor({ root: '/workspace', runner, processLookup, kill })

    await expect(supervisor.restart('admin')).resolves.toEqual({ id: 'admin', ok: true, message: 'Restart requested' })
    expect(processLookup).toHaveBeenCalledWith(5181)
    expect(kill).toHaveBeenCalledWith(1234, 'SIGTERM')
    expect(kill).toHaveBeenCalledWith(5678, 'SIGTERM')
    expect(runner).toHaveBeenCalledWith(expect.objectContaining({ id: 'admin', cwd: '/workspace', port: 5181 }))
  })

  it('rejects an unknown service without spawning a process', async () => {
    const runner = vi.fn()
    const supervisor = createLocalServiceSupervisor({ root: '/workspace', runner, processLookup: vi.fn(), kill: vi.fn() })

    await expect(supervisor.restart('unknown')).rejects.toMatchObject({ statusCode: 404 })
    expect(runner).not.toHaveBeenCalled()
  })
})
