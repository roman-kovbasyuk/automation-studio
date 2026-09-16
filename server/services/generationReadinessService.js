const destinationFor = settings => {
  if (settings?.provider === 'mock') return 'local-mock'
  if (settings?.provider === 'gemini' && settings.region === 'eu') return 'vertex-eu'
  return null
}

function connectionFor(ai, provider) {
  return ai?.connections?.find(connection => connection.provider === provider && connection.status === 'connected') ?? null
}

export function createGenerationReadinessService({ workflowService, personalAiService, sourceBriefing = false } = {}) {
  if (!workflowService) throw new TypeError('A workflow service is required')
  if (personalAiService !== undefined && typeof personalAiService?.getSettings !== 'function') throw new TypeError('A personal AI service with getSettings is required')

  return {
    async getReadiness({ actor }) {
      const settings = typeof workflowService.getSettings === 'function'
        ? await workflowService.getSettings({ actor })
        : null
      const ai = personalAiService ? await personalAiService.getSettings({ actor }) : { connections: [], defaults: {} }
      const destination = destinationFor(settings)
      const textModel = settings?.model ?? ai.defaults?.text?.model ?? null
      const imageModel = ai.defaults?.image?.model ?? null
      const personalGoogle = connectionFor(ai, 'google')
      const base = {
        state: 'unavailable', reasonCode: 'provider_unavailable',
        message: 'Generation is not configured for this workspace.',
        destination, textModel, imageModel, maskedCredential: null,
        spendingControl: 'external',
      }
      if (settings?.generationDisabled) return {
        ...base, state: 'paused', reasonCode: 'kill_switch_active', message: 'AI generation is paused.',
      }
      if (sourceBriefing) {
        if (destination !== 'vertex-eu') return {
          ...base, state: 'approval_required', reasonCode: 'brief_provider_approval_required',
          message: 'Campaign materials require the approved managed Vertex AI EU connection.',
        }
        return {
          ...base, state: 'ready', reasonCode: null,
          message: 'Managed Vertex AI EU is configured for source-backed campaigns.',
        }
      }
      if (destination === 'local-mock') return {
        ...base, state: 'ready', reasonCode: null, message: 'Local demo generation is configured.',
      }
      if (settings?.provider === 'gemini' && !personalGoogle) return {
        ...base, state: 'unconfigured', reasonCode: 'provider_configuration_missing',
        message: 'Connect the configured Google Gemini provider before generating.',
      }
      if (settings?.provider === 'gemini') return {
        ...base, state: 'ready', reasonCode: null,
        message: 'Google Gemini is configured for generation.', maskedCredential: personalGoogle.maskedSuffix ?? null,
      }
      return base
    },
  }
}
