import { describe, expect, test, vi } from 'vitest'
import { createEnvironmentGemini } from './environmentGemini.js'

describe('server-only Gemini environment access', () => {
  const environment = { GEMINI_TEXT_API_KEY: 'synthetic-text-key', GEMINI_MEDIA_API_KEY: 'synthetic-media-key' }
  test('routes text operations and images to separate credentials without putting keys in selection metadata', () => {
    const factory = vi.fn(options => ({ configured: true }))
    const access = createEnvironmentGemini({ environment, createProvider: factory })
    for (const step of ['brief_analysis', 'copy', 'directions', 'image']) {
      const selection = access.selection(step)
      expect(selection).toEqual({ provider: 'gemini', model: step === 'image' ? 'gemini-3.1-flash-image' : 'gemini-3.5-flash', region: 'eu' })
      expect(access.provider({ ...selection, step })).toEqual({ configured: true })
      expect(factory.mock.lastCall[0].apiKey).toBe(step === 'image' ? 'synthetic-media-key' : 'synthetic-text-key')
      expect(JSON.stringify(selection)).not.toContain('synthetic')
    }
  })
  test('does not use the media credential for missing text access or a stored-personal job', () => {
    const factory = vi.fn()
    const access = createEnvironmentGemini({ environment: { GEMINI_MEDIA_API_KEY: 'synthetic-media-key' }, createProvider: factory })
    expect(access.enabled).toBe(true)
    expect(access.selection('copy')).toBeNull()
    expect(access.provider({ ...access.selection('image'), step: 'image', credentialVersion: 5 })).toBeNull()
    expect(access.selection('video')).toBeNull()
    expect(factory).not.toHaveBeenCalled()
  })
  test('rejects mismatched model/provider requests before constructing a client', () => {
    const factory = vi.fn()
    const access = createEnvironmentGemini({ environment, createProvider: factory })
    expect(access.provider({ provider: 'gemini', model: 'gemini-3.5-flash', region: 'eu', step: 'image' })).toBeNull()
    expect(access.provider({ provider: 'openai', model: 'gemini-3.5-flash', region: 'eu', step: 'copy' })).toBeNull()
    expect(factory).not.toHaveBeenCalled()
  })
  test('is disabled without configured environment credentials', () => {
    expect(createEnvironmentGemini({ environment: {} }).enabled).toBe(false)
  })
})
