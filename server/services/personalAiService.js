import { GEMINI_IMAGE_MODELS, GEMINI_TEXT_MODELS } from '../providers/registry.js'

const providers = new Set(['anthropic', 'openai', 'google', 'openrouter'])
const imageProviders = new Set(['google', 'openai'])
const textModels = {
  anthropic: ['claude-3-5-sonnet'],
  openai: ['gpt-4.1'],
  google: GEMINI_TEXT_MODELS,
  openrouter: ['openrouter/auto'],
}
const imageModels = { google: GEMINI_IMAGE_MODELS, openai: ['gpt-image-1'] }

export class PersonalAiError extends Error {
  constructor(statusCode, code, message) {
    super(message)
    this.name = 'PersonalAiError'
    this.statusCode = statusCode
    this.code = code
    this.publicMessage = message
    this.expose = true
  }
}

function owner(actor) {
  if (!actor?.id || actor.disabled) throw new PersonalAiError(403, 'forbidden', 'This actor cannot manage personal AI settings')
  return actor.id
}

function validateProvider(provider, allowed = providers) {
  if (typeof provider !== 'string' || !allowed.has(provider)) throw new PersonalAiError(400, 'invalid_provider', 'This provider is not available for the selected task')
  return provider
}

function validateModel(provider, model, kind) {
  const available = (kind === 'image' ? imageModels[provider] : textModels[provider]) ?? []
  if (typeof model !== 'string' || !available.includes(model)) throw new PersonalAiError(400, 'invalid_model', 'The selected model is not supported for this provider')
  return model
}

function safeDefaults(value) {
  const defaults = {
    text: value?.textProvider && value?.textModel ? { provider: value.textProvider, model: value.textModel } : null,
    image: value?.imageProvider && value?.imageModel ? { provider: value.imageProvider, model: value.imageModel } : null,
  }
  if (value?.textSecondaryProvider && value?.textSecondaryModel) defaults.textSecondary = { provider: value.textSecondaryProvider, model: value.textSecondaryModel }
  if (value?.imageSecondaryProvider && value?.imageSecondaryModel) defaults.imageSecondary = { provider: value.imageSecondaryProvider, model: value.imageSecondaryModel }
  return defaults
}

function connectionStatus(code) {
  if (code === 'invalid_key') return 'invalid_key'
  if (code === 'rate_limited') return 'rate_limited'
  if (code === 'billing_required') return 'billing_required'
  if (code === 'model_unavailable') return 'model_unavailable'
  return 'provider_unavailable'
}

export function createPersonalAiService({ repository, vault, testCredential = async () => ({ ok: true }) } = {}) {
  if (!repository || typeof repository.listConnections !== 'function' || typeof repository.getConnection !== 'function') throw new TypeError('A personal AI repository is required')
  if (!vault || typeof vault.encrypt !== 'function' || typeof vault.mask !== 'function') throw new TypeError('A credential vault is required')
  if (typeof testCredential !== 'function') throw new TypeError('A credential tester is required')

  return {
    async getSettings({ actor }) {
      const userId = owner(actor)
      const [connections, defaults] = await Promise.all([repository.listConnections(userId), repository.getDefaults(userId)])
      return { connections, defaults: safeDefaults(defaults) }
    },

    async saveConnection({ actor, provider, apiKey }) {
      const userId = owner(actor)
      validateProvider(provider)
      if (typeof apiKey !== 'string' || apiKey.trim().length < 10 || apiKey.length > 500) throw new PersonalAiError(400, 'invalid_key', 'Enter a valid API key')
      const key = apiKey.trim()
      let tested
      try { tested = await testCredential({ provider, apiKey: key }) } catch { tested = { ok: false, code: 'provider_unavailable' } }
      if (!tested?.ok) throw new PersonalAiError(422, tested?.code ?? 'invalid_key', tested?.message ?? 'The provider rejected this key')
      const envelope = vault.encrypt(key)
      return repository.upsertConnection({ userId, provider, envelope, maskedSuffix: vault.mask(key) })
    },

    async checkConnection({ actor, provider }) {
      const userId = owner(actor)
      validateProvider(provider)
      const row = await repository.getConnection({ userId, provider })
      if (!row) throw new PersonalAiError(409, 'not_connected', 'Connect this provider before checking it')
      let tested
      try {
        tested = await testCredential({ provider, apiKey: vault.decrypt(row) })
      } catch { tested = { ok: false, code: 'provider_unavailable' } }
      if (!tested?.ok) {
        await repository.markConnectionCheck?.({ userId, provider, status: connectionStatus(tested?.code), error: tested?.message })
        throw new PersonalAiError(422, tested?.code ?? 'provider_unavailable', tested?.message ?? 'The provider rejected this key')
      }
      await repository.markConnectionCheck?.({ userId, provider, status: 'connected', error: null })
      return { ok: true, checkedAt: new Date().toISOString() }
    },

    async removeConnection({ actor, provider }) {
      const userId = owner(actor)
      validateProvider(provider)
      await repository.deleteConnection({ userId, provider })
      return this.getSettings({ actor })
    },

    async getCredential({ actor, provider, credentialVersion }) {
      const userId = owner(actor)
      validateProvider(provider)
      const row = await repository.getConnection({ userId, provider })
      if (row && credentialVersion != null && Number(row.credential_version) !== Number(credentialVersion)) return null
      return row ? vault.decrypt(row) : null
    },

    async getGenerationSelection({ actor, step }) {
      const userId = owner(actor)
      const defaults = await repository.getDefaults(userId)
      const selected = step === 'image'
        ? (defaults.imageProvider && defaults.imageModel ? { provider: defaults.imageProvider, model: defaults.imageModel } : null)
        : (defaults.textProvider && defaults.textModel ? { provider: defaults.textProvider, model: defaults.textModel } : null)
      if (!selected) return null
      const connectionProvider = selected.provider === 'google' ? 'google' : selected.provider
      const selectedConnection = await repository.getConnection({ userId, provider: connectionProvider })
      if (!selectedConnection) return null
      return {
        provider: selected.provider === 'google' ? 'gemini' : selected.provider,
        model: selected.model,
        region: 'eu',
        ...(selectedConnection.credential_version != null ? { credentialVersion: Number(selectedConnection.credential_version) } : {}),
      }
    },

    async updateDefaults({ actor, text, textSecondary, image, imageSecondary }) {
      const userId = owner(actor)
      const patch = {}
      if (text === null) {
        patch.textProvider = null; patch.textModel = null
      } else if (text !== undefined) {
        validateProvider(text.provider)
        validateModel(text.provider, text.model, 'text')
        if (!(await repository.getConnection({ userId, provider: text.provider }))) throw new PersonalAiError(409, 'not_connected', 'Connect this provider before selecting it as the text default')
        patch.textProvider = text.provider; patch.textModel = text.model
      }
      if (textSecondary === null) {
        patch.textSecondaryProvider = null; patch.textSecondaryModel = null
      } else if (textSecondary !== undefined) {
        validateProvider(textSecondary.provider)
        validateModel(textSecondary.provider, textSecondary.model, 'text')
        if (!(await repository.getConnection({ userId, provider: textSecondary.provider }))) throw new PersonalAiError(409, 'not_connected', 'Connect this provider before selecting it as the secondary text provider')
        patch.textSecondaryProvider = textSecondary.provider; patch.textSecondaryModel = textSecondary.model
      }
      if (image === null) {
        patch.imageProvider = null; patch.imageModel = null
      } else if (image !== undefined) {
        validateProvider(image.provider, imageProviders)
        validateModel(image.provider, image.model, 'image')
        if (!(await repository.getConnection({ userId, provider: image.provider }))) throw new PersonalAiError(409, 'not_connected', 'Connect this provider before selecting it as the image default')
        patch.imageProvider = image.provider; patch.imageModel = image.model
      }
      if (imageSecondary === null) {
        patch.imageSecondaryProvider = null; patch.imageSecondaryModel = null
      } else if (imageSecondary !== undefined) {
        validateProvider(imageSecondary.provider, imageProviders)
        validateModel(imageSecondary.provider, imageSecondary.model, 'image')
        if (!(await repository.getConnection({ userId, provider: imageSecondary.provider }))) throw new PersonalAiError(409, 'not_connected', 'Connect this provider before selecting it as the secondary image provider')
        patch.imageSecondaryProvider = imageSecondary.provider; patch.imageSecondaryModel = imageSecondary.model
      }
      await repository.updateDefaults({ userId, ...patch })
      return this.getSettings({ actor })
    },
  }
}
