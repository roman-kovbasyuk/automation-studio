import { describe, expect, test, vi } from 'vitest'
import { createGenerationReadinessService } from './generationReadinessService.js'

const settings = (overrides = {}) => ({
  provider: 'gemini', model: 'gemini-3.5-flash', region: 'eu', generationDisabled: false,
  ...overrides,
})

const ai = (overrides = {}) => ({
  connections: [{ provider: 'google', status: 'connected', maskedSuffix: '••••demo' }],
  defaults: { text: { provider: 'google', model: 'gemini-3.5-flash' }, image: { provider: 'google', model: 'gemini-3.1-flash-image' }, ...overrides },
})

describe('generation readiness', () => {
  test('reports a paused state before any provider can be dispatched', async () => {
    const service = createGenerationReadinessService({
      workflowService: { getSettings: vi.fn(async () => settings({ generationDisabled: true })) },
      personalAiService: { getSettings: vi.fn(async () => ai()) },
      sourceBriefing: true,
    })

    await expect(service.getReadiness({ actor: { id: 'marketer-1', role: 'marketer' } })).resolves.toMatchObject({
      state: 'paused', reasonCode: 'kill_switch_active', spendingControl: 'external', destination: 'vertex-eu',
    })
  })

  test('does not claim a personal API key is the source route when managed EU is required', async () => {
    const service = createGenerationReadinessService({
      workflowService: { getSettings: vi.fn(async () => settings()) },
      personalAiService: { getSettings: vi.fn(async () => ai()) },
      sourceBriefing: true,
    })

    await expect(service.getReadiness({ actor: { id: 'marketer-1', role: 'marketer' } })).resolves.toMatchObject({
      state: 'ready', destination: 'vertex-eu', maskedCredential: null,
      message: 'Managed Vertex AI EU is configured for source-backed campaigns.',
    })
  })

  test('reports an unconfigured state without exposing credentials', async () => {
    const service = createGenerationReadinessService({
      workflowService: { getSettings: vi.fn(async () => settings({ provider: 'mock', model: 'mock-v1', region: 'europe-west6' })) },
      personalAiService: { getSettings: vi.fn(async () => ({ connections: [], defaults: { text: null, image: null } })) },
      sourceBriefing: false,
    })

    const result = await service.getReadiness({ actor: { id: 'marketer-1', role: 'marketer' } })
    expect(result).toMatchObject({ state: 'ready', destination: 'local-mock', spendingControl: 'external' })
    expect(result).not.toHaveProperty('apiKey')
    expect(result).not.toHaveProperty('accessToken')
  })
})
