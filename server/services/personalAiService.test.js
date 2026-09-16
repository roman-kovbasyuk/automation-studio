import { describe, expect, test, vi } from 'vitest'
import { createPersonalAiService } from './personalAiService.js'

const actor = { id: 'user-1', role: 'marketer', disabled: false }

function repository() {
  return {
    listConnections: vi.fn(async () => [{ provider: 'google', status: 'connected', maskedSuffix: '••••••••1234', updatedAt: '2026-09-07T10:00:00.000Z' }]),
    getConnection: vi.fn(async () => null),
    getDefaults: vi.fn(async () => ({ textProvider: 'google', textModel: 'gemini-3.5-flash', imageProvider: 'google', imageModel: 'gemini-3.1-flash-image' })),
    upsertConnection: vi.fn(async ({ provider, maskedSuffix }) => ({ provider, status: 'connected', maskedSuffix, updatedAt: '2026-09-07T10:00:00.000Z' })),
    deleteConnection: vi.fn(async () => true),
    markConnectionCheck: vi.fn(async ({ provider, status }) => ({ provider, status })),
    updateDefaults: vi.fn(async (input) => input),
  }
}

function vault() {
  return { encrypt: vi.fn(() => ({ keyVersion: 'v1', iv: 'iv', ciphertext: 'cipher', authTag: 'tag' })), decrypt: vi.fn(() => 'secret-key-1234'), mask: vi.fn((key) => `••••••••${key.slice(-4)}`) }
}

describe('personal AI settings', () => {
  test('returns safe connection metadata and defaults for the authenticated owner', async () => {
    const repo = repository()
    const service = createPersonalAiService({ repository: repo, vault: vault() })
    await expect(service.getSettings({ actor })).resolves.toEqual({
      connections: [{ provider: 'google', status: 'connected', maskedSuffix: '••••••••1234', updatedAt: '2026-09-07T10:00:00.000Z' }],
      defaults: { text: { provider: 'google', model: 'gemini-3.5-flash' }, image: { provider: 'google', model: 'gemini-3.1-flash-image' } },
    })
    expect(repo.listConnections).toHaveBeenCalledWith(actor.id)
  })

  test('encrypts a submitted key and never returns it', async () => {
    const repo = repository()
    const keyVault = vault()
    const service = createPersonalAiService({ repository: repo, vault: keyVault })
    await expect(service.saveConnection({ actor, provider: 'google', apiKey: 'secret-key-1234' })).resolves.toMatchObject({ provider: 'google', status: 'connected' })
    expect(keyVault.encrypt).toHaveBeenCalledWith('secret-key-1234')
    expect(repo.upsertConnection).toHaveBeenCalledWith(expect.objectContaining({ userId: actor.id, provider: 'google', envelope: expect.any(Object), maskedSuffix: '••••••••1234' }))
    expect(JSON.stringify(await service.saveConnection({ actor, provider: 'google', apiKey: 'secret-key-1234' }))).not.toContain('secret-key-1234')
  })

  test('rejects an unsupported model before saving defaults', async () => {
    const repo = repository()
    const service = createPersonalAiService({ repository: repo, vault: vault() })
    await expect(service.updateDefaults({ actor, text: { provider: 'google', model: 'not-a-gemini-model' } })).rejects.toMatchObject({ code: 'invalid_model' })
    expect(repo.updateDefaults).not.toHaveBeenCalled()
  })

  test('persists explicit default clearing without changing the other default', async () => {
    const repo = repository()
    const service = createPersonalAiService({ repository: repo, vault: vault() })
    await service.updateDefaults({ actor, text: null })
    expect(repo.updateDefaults).toHaveBeenCalledWith({
      userId: actor.id,
      textProvider: null,
      textModel: null,
    })
  })

  test('returns a personal provider selection only when its own connection exists', async () => {
    const repo = repository()
    repo.getDefaults.mockResolvedValue({ textProvider: 'openrouter', textModel: 'openrouter/auto', imageProvider: null, imageModel: null })
    repo.getConnection.mockImplementation(async ({ provider }) => provider === 'openrouter' ? { provider, ciphertext: 'cipher', iv: 'iv', auth_tag: 'tag', key_version: 'v1' } : null)
    const service = createPersonalAiService({ repository: repo, vault: vault() })
    await expect(service.getGenerationSelection({ actor, step: 'copy' })).resolves.toEqual({ provider: 'openrouter', model: 'openrouter/auto', region: 'eu' })
  })

  test('checks an existing connection without returning its credential', async () => {
    const repo = repository()
    repo.getConnection.mockResolvedValue({ provider: 'google', ciphertext: 'cipher', iv: 'iv', auth_tag: 'tag', key_version: 'v1' })
    const tester = vi.fn(async ({ apiKey }) => ({ ok: apiKey === 'secret-key-1234' }))
    const service = createPersonalAiService({ repository: repo, vault: vault(), testCredential: tester })
    await expect(service.checkConnection({ actor, provider: 'google' })).resolves.toMatchObject({ ok: true })
    expect(tester).toHaveBeenCalledWith({ provider: 'google', apiKey: 'secret-key-1234' })
    expect(repo.markConnectionCheck).toHaveBeenCalledWith({ userId: actor.id, provider: 'google', status: 'connected', error: null })
  })
})
