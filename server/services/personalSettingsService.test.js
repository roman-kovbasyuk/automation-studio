import { describe, expect, test, vi } from 'vitest'
import { createPersonalSettingsService } from './personalSettingsService.js'

const actor = { id: 'user-1', role: 'marketer', disabled: false }

function repository() {
  return {
    listIntegrations: vi.fn(async () => [{ platform: 'slack', status: 'not_connected' }, { platform: 'discord', status: 'not_connected' }]),
    getIntegration: vi.fn(async () => null),
    listUsers: vi.fn(async () => [actor.id]),
    upsertIntegration: vi.fn(async ({ platform, destination }) => ({ platform, status: 'connected', destination })),
    deleteIntegration: vi.fn(async () => undefined),
    getNotifications: vi.fn(async () => ({ slack: { enabled: false, events: [] }, discord: { enabled: false, events: [] }, scope: 'all' })),
    updateNotifications: vi.fn(async ({ preferences }) => preferences),
    enqueueNotification: vi.fn(async ({ id, platform, eventType, dedupeKey, payload }) => ({ id, platform, eventType, dedupeKey, payload })),
    listDueNotifications: vi.fn(async () => []),
    markNotificationSent: vi.fn(async () => undefined),
    markNotificationFailed: vi.fn(async () => undefined),
  }
}

function vault() {
  return { encrypt: vi.fn(() => ({ keyVersion: 'v1', iv: 'iv', ciphertext: 'cipher', authTag: 'tag' })), mask: vi.fn(() => '••••••••1234'), decrypt: vi.fn(() => 'secret') }
}

describe('personal integrations and notifications', () => {
  test('connects a destination without sending a test message', async () => {
    const repo = repository()
    const send = vi.fn()
    const service = createPersonalSettingsService({ repository: repo, vault: vault(), testDelivery: send })
    await expect(service.connectIntegration({ actor, platform: 'slack', destination: 'Campaign updates', webhookUrl: 'https://hooks.slack.com/services/example', secret: 'signing-secret' })).resolves.toMatchObject({ status: 'connected' })
    expect(send).not.toHaveBeenCalled()
    expect(repo.upsertIntegration).toHaveBeenCalledWith(expect.objectContaining({ userId: actor.id, platform: 'slack', secret: expect.any(Object) }))
  })

  test('sends a test only through the explicit test action', async () => {
    const repo = repository()
    repo.getIntegration.mockResolvedValue({ platform: 'discord', destination: 'Creative', webhook_url: 'https://discord.com/api/webhooks/example', ciphertext: 'cipher', iv: 'iv', auth_tag: 'tag', key_version: 'v1' })
    const send = vi.fn(async () => ({ ok: true }))
    const service = createPersonalSettingsService({ repository: repo, vault: vault(), testDelivery: send })
    await expect(service.testIntegration({ actor, platform: 'discord' })).resolves.toEqual({ ok: true })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ platform: 'discord', webhookUrl: 'https://discord.com/api/webhooks/example', secret: 'secret' }))
  })

  test('rejects non-HTTPS destinations', async () => {
    const service = createPersonalSettingsService({ repository: repository(), vault: vault() })
    await expect(service.connectIntegration({ actor, platform: 'slack', destination: 'Updates', webhookUrl: 'http://example.test/hook' })).rejects.toMatchObject({ code: 'invalid_destination' })
  })

  test('merges notification patches with the stored preferences', async () => {
    const repo = repository()
    repo.getNotifications.mockResolvedValue({
      slack: { enabled: true }, discord: { enabled: false }, projectScope: 'selected', selectedProjectIds: ['campaign-1'],
      events: { anyProjectChange: true, newImageGenerations: false, newVideoGenerations: true, approvalStatusChanged: true }, includeOwnChanges: true, digestInterval: 'hourly', quietHours: { timezone: 'Europe/Zurich' },
    })
    const service = createPersonalSettingsService({ repository: repo, vault: vault() })
    await service.updateNotifications({ actor, input: { discord: { enabled: true } } })
    expect(repo.updateNotifications).toHaveBeenCalledWith({ userId: actor.id, preferences: expect.objectContaining({
      slack: { enabled: true }, discord: { enabled: true }, projectScope: 'selected', digestInterval: 'hourly',
    }) })
  })

  test('delivers queued notifications and marks successful sends', async () => {
    const repo = repository()
    repo.listDueNotifications.mockResolvedValue([{ id: 'outbox-1', user_id: actor.id, platform: 'slack', event_type: 'image_generation', payload: { campaignId: 'campaign-1' } }])
    repo.getIntegration.mockResolvedValue({ platform: 'slack', destination: 'Updates', webhook_url: 'https://hooks.slack.com/services/example', ciphertext: 'cipher', iv: 'iv', auth_tag: 'tag', key_version: 'v1' })
    const send = vi.fn(async () => ({ ok: true }))
    const service = createPersonalSettingsService({ repository: repo, vault: vault(), testDelivery: send })
    await expect(service.deliverPending()).resolves.toEqual(['outbox-1'])
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ payload: { campaignId: 'campaign-1' } }))
    expect(repo.markNotificationSent).toHaveBeenCalledWith('outbox-1')
  })

  test('fans an event out to each opted-in recipient and respects selected projects', async () => {
    const repo = repository()
    repo.listUsers.mockResolvedValue(['user-1', 'user-2'])
    repo.getNotifications.mockImplementation(async (id) => ({
      slack: { enabled: id === 'user-1' }, discord: { enabled: false }, projectScope: id === 'user-2' ? 'selected' : 'all', selectedProjectIds: id === 'user-2' ? ['other-campaign'] : [],
      events: { anyProjectChange: true, newImageGenerations: true, newVideoGenerations: true, approvalStatusChanged: true }, includeOwnChanges: true,
    }))
    repo.listIntegrations.mockResolvedValue([{ platform: 'slack', status: 'connected' }])
    const service = createPersonalSettingsService({ repository: repo, vault: vault() })
    await service.enqueueEvent({ actor, eventType: 'project_change', dedupeKey: 'campaign:changed:1', payload: { campaignId: 'campaign-1', actorId: 'other-user' } })
    expect(repo.enqueueNotification).toHaveBeenCalledTimes(1)
    expect(repo.enqueueNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', dedupeKey: 'campaign:changed:1:user-1:slack' }))
  })
})
