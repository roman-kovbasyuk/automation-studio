import { describe, expect, test, vi } from 'vitest'
import { buildApp } from '../app.js'

const workflowService = {}
const page = { items: [], page: 1, pageSize: 25, total: 0 }

function repository() {
  return {
    overview: vi.fn(async () => ({
      scope: 'all-workspaces',
      window: {
        hours: 24,
        from: '2026-09-09T10:00:00.000Z',
        to: '2026-09-10T10:00:00.000Z',
      },
      counts: {
        users: 0,
        activeUsers: 0,
        disabledUsers: 0,
        projects: 0,
        activeProjects: 0,
        assets: 0,
        jobs: 0,
        assetWorkflows: 0,
        publishedAssetWorkflows: 0,
      },
      jobStatusCounts: {
        pending: 0,
        running: 0,
        succeeded: 0,
        failed: 0,
        blocked: 0,
        unknown: 0,
        queued: 0,
        cancelled: 0,
      },
      performance: {
        completedJobDurationMs: {
          average: null,
          sampleCount: 0,
          unavailableReason: 'No completed jobs were recorded in this window.',
        },
        providerLatencyMs: {
          average: null,
          sampleCount: 0,
          unavailableReason: 'Provider latency telemetry is not persisted.',
        },
        humanTaskDurationMs: {
          average: null,
          sampleCount: 0,
          unavailableReason: 'Human task telemetry is not implemented.',
        },
      },
      recentActivity: [],
      modules: [],
    })),
    users: vi.fn(async () => page),
    projects: vi.fn(async () => page),
    project: vi.fn(async () => null),
    assets: vi.fn(async () => page),
    jobs: vi.fn(async () => page),
    activity: vi.fn(async () => page),
    projectActivity: vi.fn(async () => null),
    modules: vi.fn(async () => ({ items: [] })),
  }
}

function appFor(actor, adminRepository = repository()) {
  return {
    app: buildApp({
      resolveActor: async () => actor,
      workflowService,
      adminRepository,
    }),
    adminRepository,
  }
}

describe('admin routes', () => {
  test.each([
    [{ id: 'marketer-1', role: 'marketer' }, 'forbidden'],
    [{ id: 'admin-1', role: 'admin', disabled: true }, 'user_disabled'],
    [
      { id: 'admin-1', role: 'admin', disabledAt: '2026-09-10' },
      'user_disabled',
    ],
  ])('denies non-admin and disabled actors', async (actor, code) => {
    const { app } = appFor(actor)
    const response = await app.inject('/api/v1/admin/users')
    expect(response.statusCode).toBe(403)
    expect(response.json().code).toBe(code)
    await app.close()
  })

  test('validates and normalizes pagination before repository access', async () => {
    const { app, adminRepository } = appFor({ id: 'admin-1', role: 'admin' })
    const ok = await app.inject(
      '/api/v1/admin/users?search=%20Ada%20&page=2&pageSize=100&disabled=false',
    )
    expect(ok.statusCode).toBe(200)
    expect(adminRepository.users).toHaveBeenCalledWith({
      search: 'Ada',
      page: 2,
      pageSize: 100,
      disabled: false,
    })
    for (const url of [
      '/api/v1/admin/users?page=0',
      '/api/v1/admin/users?pageSize=101',
      '/api/v1/admin/users?page=1000001',
      '/api/v1/admin/users?unknown=x',
    ]) {
      expect((await app.inject(url)).statusCode).toBe(400)
    }
    await app.close()
  })

  test('accepts the delivered activity status', async () => {
    const { app, adminRepository } = appFor({ id: 'admin-1', role: 'admin' })
    const response = await app.inject('/api/v1/admin/activity?status=delivered')
    expect(response.statusCode).toBe(200)
    expect(adminRepository.activity).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      status: 'delivered',
    })
    await app.close()
  })

  test('returns 404 for missing projects and strict safe responses', async () => {
    const adminRepository = repository()
    adminRepository.users.mockResolvedValue({
      ...page,
      items: [{ id: 'u', firebaseUid: 'secret' }],
    })
    const { app } = appFor({ id: 'admin-1', role: 'admin' }, adminRepository)
    expect(
      (await app.inject('/api/v1/admin/projects/missing')).statusCode,
    ).toBe(404)
    expect(
      (await app.inject('/api/v1/admin/projects/missing/activity')).statusCode,
    ).toBe(404)
    const leaked = await app.inject('/api/v1/admin/users')
    expect(leaked.statusCode).toBe(500)
    expect(leaked.body).not.toContain('secret')
    await app.close()
  })
})
