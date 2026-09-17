import { describe, expect, test, vi } from 'vitest'
import { createGenerationReadinessService } from './generationReadinessService.js'

const actor = { id: 'marketer-1', role: 'marketer' }
const settings = (overrides = {}) => ({
  provider: 'gemini', model: 'gemini-3.5-flash', region: 'eu', generationDisabled: false,
  ...overrides,
})
const ai = () => ({
  connections: [{ provider: 'google', status: 'connected', maskedSuffix: '••••demo' }],
  defaults: { text: { provider: 'google', model: 'gemini-3.5-flash' }, image: { provider: 'google', model: 'gemini-3.1-flash-image' } },
})
const readiness = value => createGenerationReadinessService({
  workflowService: { getSettings: vi.fn(async () => value) },
  personalAiService: { getSettings: vi.fn(async () => ai()) },
}).getReadiness({ actor })

describe('generation readiness (the AI briefing is always on, D37)', () => {
  test('reports a paused state before any provider can be dispatched', async () => {
    await expect(readiness(settings({ generationDisabled: true }))).resolves.toMatchObject({
      state: 'paused', reasonCode: 'kill_switch_active', spendingControl: 'external', destination: 'vertex-eu',
    })
  })

  test('is ready on managed Vertex AI EU without presenting a personal key as the route', async () => {
    await expect(readiness(settings())).resolves.toMatchObject({
      state: 'ready', destination: 'vertex-eu', maskedCredential: null, message: 'Managed Vertex AI EU is configured.',
    })
  })

  test('is ready with the local mock provider and never exposes credentials', async () => {
    const result = await readiness(settings({ provider: 'mock', model: 'mock-v1', region: 'europe-west6' }))
    expect(result).toMatchObject({ state: 'ready', destination: 'local-mock', spendingControl: 'external' })
    expect(result).not.toHaveProperty('apiKey')
    expect(result).not.toHaveProperty('accessToken')
  })

  test('requires the managed EU connection for any other provider and explains a missing setup', async () => {
    await expect(readiness(settings({ provider: 'openai', model: 'gpt-5', region: 'us' }))).resolves.toMatchObject({
      state: 'approval_required', reasonCode: 'brief_provider_approval_required',
      message: 'Project materials require the managed Vertex AI EU connection.',
    })
    await expect(readiness(null)).resolves.toMatchObject({
      state: 'unavailable', reasonCode: 'provider_unavailable', message: 'AI generation is not set up for this workspace.',
    })
  })
})
