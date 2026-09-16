// @vitest-environment node
import Fastify from 'fastify'
import { test, expect } from 'vitest'
import { registerAssetWorkflowRoutes } from './assetWorkflows.js'
import { createAssetWorkflowService } from '../assetWorkflows/definitionService.js'
import {
  seedDefinitions,
  simulateDefinition,
} from '../assetWorkflows/simulation.js'
const id = '90f6977f-0d6e-43f0-b802-bc56f3e24f4a'
function build(actor) {
  const app = Fastify(),
    service = createAssetWorkflowService({
      pool: { query: async () => ({ rows: [] }) },
    })
  registerAssetWorkflowRoutes(app, {
    requireRole: (role) => async (request) => {
      expect(role).toBe('admin')
      request.actor = actor
    },
    assetWorkflowService: service,
  })
  return app
}
test('real service rechecks enabled admin and catalog returns strict safe metadata', async () => {
  for (const actor of [
    { role: 'designer' },
    { role: 'admin', disabled: true },
    { role: 'admin', disabledAt: 'now' },
  ]) {
    const app = build(actor)
    expect(
      (await app.inject('/api/v1/admin/asset-workflow-capabilities'))
        .statusCode,
    ).toBe(403)
    await app.close()
  }
  const app = build({ role: 'admin' }),
    result = await app.inject('/api/v1/admin/asset-workflow-capabilities')
  expect(result.statusCode).toBe(200)
  expect(result.json().items.find((c) => c.key === 'render')).toMatchObject({
    availability: 'simulation_only',
    liveEnabled: false,
  })
  expect(result.json().requestId).toEqual(expect.any(String))
  await app.close()
})
test('routes reject unknown fields, oversized bodies, malformed IDs and missing concurrency fields before storage', async () => {
  const app = build({ role: 'admin' })
  for (const [method, url, payload] of [
    ['PUT', `/api/v1/admin/asset-workflows/${id}/draft`, {}],
    [
      'POST',
      `/api/v1/admin/asset-workflows/${id}/validate`,
      { expectedRevision: 0, extra: true },
    ],
    [
      'POST',
      `/api/v1/admin/asset-workflows/${id}/publish`,
      { expectedRevision: 0, changeNote: 'Note' },
    ],
    [
      'POST',
      `/api/v1/admin/asset-workflows/${id}/simulations`,
      { expectedRevision: 0, fixture: {} },
    ],
    ['GET', '/api/v1/admin/asset-workflows/bad-id', undefined],
  ])
    expect(
      (await app.inject({ method, url, ...(payload ? { payload } : {}) }))
        .statusCode,
    ).toBe(400)
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/admin/asset-workflows',
        payload: { title: 'x'.repeat(300000) },
      })
    ).statusCode,
  ).toBe(413)
  await app.close()
})
test('strict response validation blocks accidental private service fields', async () => {
  const app = Fastify()
  registerAssetWorkflowRoutes(app, {
    requireRole: () => async () => {},
    assetWorkflowService: {
      list: async () => ({ items: [], credential: 'synthetic' }),
    },
  })
  const result = await app.inject('/api/v1/admin/asset-workflows')
  expect(result.statusCode).toBe(500)
  expect(result.body).not.toContain('synthetic')
  await app.close()
})
test('unsafe aggregate node binding produces a validation response instead of a circular simulation response', async () => {
  const app = Fastify(),
    draft = seedDefinitions()[0].draft
  draft.nodes.find((n) => n.id === 'context').bindings.brief = 'nodes'
  draft.nodes.find((n) => n.id === 'clarify').questions = []
  registerAssetWorkflowRoutes(app, {
    requireRole: () => async () => {},
    assetWorkflowService: {
      simulate: async ({ input }) => simulateDefinition(draft, input.fixture),
    },
  })
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/asset-workflows/${id}/simulations`,
      payload: {
        expectedRevision: 0,
        draftHash: 'a'.repeat(64),
        fixture: {
          outputs: { ai: { plan: 'Plan' }, render: { preview: 'Preview' } },
        },
      },
    })
    expect(response.statusCode, response.body).toBe(422)
    expect(response.json().code).toBe('invalid_definition')
  } finally {
    await app.close()
  }
})
