// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { startAdminPreview } from './start-admin-preview.mjs'

function fixtures() {
  const studio = { url: 'http://127.0.0.1:39001', close: vi.fn(async () => {}) }
  const frontend = {
    listen: vi.fn(async () => {}), close: vi.fn(async () => {}),
    httpServer: { address: () => ({ port: 39002 }) },
  }
  return { studio, frontend, startStudio: vi.fn(async () => studio), createFrontend: vi.fn(async () => frontend) }
}

describe('isolated admin preview launcher', () => {
  it('uses the isolated API for every proxy and exposes a loopback admin URL', async () => {
    const f = fixtures()
    const preview = await startAdminPreview({ ...f, port: 0 })
    expect(f.createFrontend).toHaveBeenCalledWith(expect.objectContaining({
      server: expect.objectContaining({ host: '127.0.0.1', port: 0, strictPort: true,
        proxy: { '/api': f.studio.url, '/healthz': f.studio.url, '/readyz': f.studio.url } }),
    }))
    expect(preview.url).toBe('http://127.0.0.1:39002/mvp/admin?demoRole=admin')
    await preview.close()
    await preview.close()
    expect(f.frontend.close).toHaveBeenCalledTimes(1)
    expect(f.studio.close).toHaveBeenCalledTimes(1)
  })

  it('cleans up the owned API when frontend startup fails', async () => {
    const f = fixtures()
    const startupError = new Error('Port occupied')
    f.frontend.listen.mockRejectedValue(startupError)
    await expect(startAdminPreview(f)).rejects.toBe(startupError)
    expect(f.frontend.close).toHaveBeenCalledOnce()
    expect(f.studio.close).toHaveBeenCalledOnce()
  })

  it('preserves startup and cleanup failures while attempting every owned resource', async () => {
    const f = fixtures()
    const startupError = new Error('Port occupied')
    const frontendCleanupError = new Error('Frontend close failed')
    const studioCleanupError = new Error('Studio close failed')
    f.frontend.listen.mockRejectedValue(startupError)
    f.frontend.close.mockRejectedValue(frontendCleanupError)
    f.studio.close.mockRejectedValue(studioCleanupError)

    const rejection = await startAdminPreview(f).catch(error => error)

    expect(rejection).toBeInstanceOf(AggregateError)
    expect(rejection.errors[0]).toBe(startupError)
    expect(rejection.errors[1]).toBeInstanceOf(AggregateError)
    expect(rejection.errors[1].errors[0]).toBe(frontendCleanupError)
    expect(rejection.errors[1].errors[1]).toBe(studioCleanupError)
    expect(f.frontend.close).toHaveBeenCalledOnce()
    expect(f.studio.close).toHaveBeenCalledOnce()
  })

  it('still closes the isolated API if frontend cleanup fails', async () => {
    const f = fixtures()
    const preview = await startAdminPreview(f)
    f.frontend.close.mockRejectedValue(new Error('Frontend close failed'))
    await expect(preview.close()).rejects.toThrow('Could not close the admin preview')
    expect(f.studio.close).toHaveBeenCalledOnce()
  })

  it('rejects production and invalid ports before allocating test resources', async () => {
    const f = fixtures()
    await expect(startAdminPreview({ ...f, environment: { NODE_ENV: 'production' } })).rejects.toThrow('local development')
    await expect(startAdminPreview({ ...f, port: -1 })).rejects.toThrow('port')
    expect(f.startStudio).not.toHaveBeenCalled()
  })
})
