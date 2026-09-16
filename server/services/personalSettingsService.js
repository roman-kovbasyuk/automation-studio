import { randomUUID } from 'node:crypto'

const platforms = new Set(['slack', 'discord'])

export class PersonalSettingsError extends Error {
  constructor(statusCode, code, message) {
    super(message)
    this.name = 'PersonalSettingsError'
    this.statusCode = statusCode
    this.code = code
    this.publicMessage = message
    this.expose = true
  }
}

function userId(actor) {
  if (!actor?.id || actor.disabled) throw new PersonalSettingsError(403, 'forbidden', 'This actor cannot manage personal settings')
  return actor.id
}

function platform(value) {
  if (typeof value !== 'string' || !platforms.has(value)) throw new PersonalSettingsError(400, 'invalid_platform', 'This integration is not supported')
  return value
}

function httpsUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error()
    return url.toString()
  } catch {
    throw new PersonalSettingsError(400, 'invalid_destination', 'Use an HTTPS webhook destination')
  }
}

function preferences(value) {
  const next = value ?? {}
  const events = next.events ?? {}
  const selectedProjectIds = Array.isArray(next.selectedProjectIds) ? next.selectedProjectIds.filter((id) => typeof id === 'string' && id.length <= 200).slice(0, 100) : []
  if (!['all', 'selected'].includes(next.projectScope ?? 'all')) throw new PersonalSettingsError(400, 'invalid_notifications', 'Project scope is invalid')
  if (!['immediate', 'hourly'].includes(next.digestInterval ?? 'immediate')) throw new PersonalSettingsError(400, 'invalid_notifications', 'Digest interval is invalid')
  return {
    slack: { enabled: next.slack?.enabled === true },
    discord: { enabled: next.discord?.enabled === true },
    projectScope: next.projectScope ?? 'all',
    selectedProjectIds,
    events: {
      anyProjectChange: events.anyProjectChange === true,
      newImageGenerations: events.newImageGenerations !== false,
      newVideoGenerations: events.newVideoGenerations !== false,
      approvalStatusChanged: events.approvalStatusChanged !== false,
    },
    includeOwnChanges: next.includeOwnChanges === true,
    digestInterval: next.digestInterval ?? 'immediate',
    quietHours: typeof next.quietHours === 'object' && next.quietHours !== null && !Array.isArray(next.quietHours) ? next.quietHours : {},
  }
}

export function createPersonalSettingsService({ repository, vault, testDelivery = async () => ({ ok: true }) } = {}) {
  if (!repository || typeof repository.listIntegrations !== 'function') throw new TypeError('A personal settings repository is required')
  if (!vault || typeof vault.encrypt !== 'function' || typeof vault.decrypt !== 'function') throw new TypeError('A credential vault is required')
  return {
    async getSettings({ actor }) {
      const id = userId(actor)
      const [integrations, notifications] = await Promise.all([repository.listIntegrations(id), repository.getNotifications(id)])
      return { integrations, notifications }
    },
    async connectIntegration({ actor, platform: rawPlatform, destination, webhookUrl, secret }) {
      const id = userId(actor); const selectedPlatform = platform(rawPlatform)
      if (typeof destination !== 'string' || destination.trim().length < 1 || destination.trim().length > 200) throw new PersonalSettingsError(400, 'invalid_destination', 'A destination name is required')
      const url = httpsUrl(webhookUrl)
      if (typeof secret !== 'string' || secret.trim().length < 1 || secret.length > 2_000) throw new PersonalSettingsError(400, 'invalid_secret', 'A connection secret is required')
      return repository.upsertIntegration({ userId: id, platform: selectedPlatform, secret: vault.encrypt(secret.trim()), destination: destination.trim(), webhookUrl: JSON.stringify(vault.encrypt(url)) })
    },
    async disconnectIntegration({ actor, platform: rawPlatform }) {
      const id = userId(actor); await repository.deleteIntegration({ userId: id, platform: platform(rawPlatform) }); return this.getSettings({ actor })
    },
    async testIntegration({ actor, platform: rawPlatform }) {
      const id = userId(actor); const selectedPlatform = platform(rawPlatform); const row = await repository.getIntegration({ userId: id, platform: selectedPlatform })
      if (!row) throw new PersonalSettingsError(409, 'not_connected', 'Connect this destination before sending a test')
      const secret = vault.decrypt(row)
      let webhookUrl = row.webhook_url
      try { webhookUrl = vault.decrypt(JSON.parse(row.webhook_url)) } catch { /* Legacy rows stored the URL directly; migrations can rotate them on save. */ }
      const result = await testDelivery({ platform: selectedPlatform, webhookUrl, secret, destination: row.destination })
      if (!result?.ok) throw new PersonalSettingsError(422, result?.code ?? 'delivery_failed', result?.message ?? 'The destination rejected the test message')
      return { ok: true }
    },
    async updateNotifications({ actor, input }) {
      const id = userId(actor)
      const current = await repository.getNotifications(id)
      const merged = {
        ...current,
        ...input,
        slack: { ...current.slack, ...(input.slack ?? {}) },
        discord: { ...current.discord, ...(input.discord ?? {}) },
        events: { ...current.events, ...(input.events ?? {}) },
      }
      return repository.updateNotifications({ userId: id, preferences: preferences(merged) })
    },
    async enqueueEvent({ actor, eventType, payload, dedupeKey }) {
      const actorId = userId(actor)
      const recipients = typeof repository.listUsers === 'function' ? await repository.listUsers() : [actorId]
      const rows = []
      for (const recipientId of recipients) {
        const current = await repository.getNotifications(recipientId)
        const eventSettings = current?.events ?? {}
        const enabled = {
          image_generation: eventSettings.newImageGenerations,
          video_generation: eventSettings.newVideoGenerations,
          approval_status_changed: eventSettings.approvalStatusChanged,
          project_change: eventSettings.anyProjectChange,
        }[eventType]
        if (!enabled) continue
        if (eventType === 'project_change' && current.includeOwnChanges === false && payload?.actorId === recipientId) continue
        if (current.projectScope === 'selected' && payload?.campaignId && !(current.selectedProjectIds ?? []).includes(payload.campaignId)) continue
        const connected = await repository.listIntegrations(recipientId)
        for (const integration of connected) {
          if (integration.status !== 'connected' || current[integration.platform]?.enabled !== true) continue
          const row = await repository.enqueueNotification({ id: randomUUID(), userId: recipientId, platform: integration.platform, eventType, dedupeKey: `${dedupeKey}:${recipientId}:${integration.platform}`, payload })
          if (row) rows.push(row)
        }
      }
      return rows
    },
    async deliverPending({ limit = 25 } = {}) {
      const rows = await repository.listDueNotifications(limit)
      const delivered = []
      for (const row of rows) {
        try {
          const integration = await repository.getIntegration({ userId: row.user_id, platform: row.platform })
          if (!integration) throw new Error('Destination is no longer connected')
          const secret = vault.decrypt(integration)
          let webhookUrl = integration.webhook_url
          try { webhookUrl = vault.decrypt(JSON.parse(integration.webhook_url)) } catch { /* Legacy plaintext URL. */ }
          const result = await testDelivery({ platform: row.platform, webhookUrl, secret, destination: integration.destination, eventType: row.event_type, payload: row.payload })
          if (!result?.ok) throw new Error(result?.message ?? 'Delivery failed')
          await repository.markNotificationSent(row.id); delivered.push(row.id)
        } catch (error) { await repository.markNotificationFailed({ id: row.id, error: error?.message }) }
      }
      return delivered
    },
  }
}
