import { describe, expect, test, vi } from 'vitest'
import { createPersonalProvider } from './personalProvider.js'

const signal = new AbortController().signal
const analysis = { summary: 'Summary', themes: ['theme'], warnings: [], title: 'Title', audience: 'Audience', objective: 'Objective', channels: ['social'], formats: ['square'] }

describe('personal provider adapters', () => {
  test('uses OpenRouter’s OpenAI-compatible endpoint and validates structured output', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ analysis }) } }], usage: { prompt_tokens: 4, completion_tokens: 7 } }) }))
    const provider = createPersonalProvider({ provider: 'openrouter', model: 'openrouter/auto', apiKey: 'synthetic-openrouter-key', fetchImpl })
    const result = await provider.analyseBrief({ brief: { product: 'Course', audience: 'Learners', objective: 'Signups', offer: '', locale: 'en', notes: '' } }, signal)
    expect(result).toMatchObject({ provider: 'openrouter', model: 'openrouter/auto', analysis, usage: { inputUnits: 4, outputUnits: 7 } })
    expect(fetchImpl.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer synthetic-openrouter-key')
  })

  test('maps provider HTTP failures to actionable errors', async () => {
    const provider = createPersonalProvider({ provider: 'anthropic', model: 'claude-3-5-sonnet', apiKey: 'synthetic-anthropic-key', fetchImpl: vi.fn(async () => ({ ok: false, status: 429 })) })
    await expect(provider.analyseBrief({ brief: { product: 'Course', audience: 'Learners', objective: 'Signups', offer: '', locale: 'en', notes: '' } }, signal)).resolves.toMatchObject({ error: { code: 'rate_limited', retryable: true } })
    const invalid = createPersonalProvider({ provider: 'openai', model: 'gpt-4.1', apiKey: 'synthetic-openai-key', fetchImpl: vi.fn(async () => ({ ok: false, status: 401 })) })
    await expect(invalid.analyseBrief({ brief: { product: 'Course', audience: 'Learners', objective: 'Signups', offer: '', locale: 'en', notes: '' } }, signal)).resolves.toMatchObject({ error: { code: 'invalid_key', retryable: false } })
  })
})
