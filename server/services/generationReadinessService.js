const destinationFor = settings => {
  if (settings?.provider === 'mock') return 'local-mock'
  if (settings?.provider === 'gemini' && settings.region === 'eu') return 'vertex-eu'
  return null
}

// Every project is created through the confirmed AI briefing (D37), which only runs on the
// managed Vertex AI EU connection, or on the local mock provider in development and tests.
export function createGenerationReadinessService({ workflowService, personalAiService } = {}) {
  if (!workflowService) throw new TypeError('A workflow service is required')
  if (personalAiService !== undefined && typeof personalAiService?.getSettings !== 'function') throw new TypeError('A personal AI service with getSettings is required')

  return {
    async getReadiness({ actor }) {
      const settings = typeof workflowService.getSettings === 'function'
        ? await workflowService.getSettings({ actor })
        : null
      const ai = personalAiService ? await personalAiService.getSettings({ actor }) : { connections: [], defaults: {} }
      const destination = destinationFor(settings)
      const base = {
        state: 'unavailable', reasonCode: 'provider_unavailable',
        message: 'AI generation is not set up for this workspace.',
        destination, textModel: settings?.model ?? ai.defaults?.text?.model ?? null, imageModel: ai.defaults?.image?.model ?? null,
        maskedCredential: null, spendingControl: 'external',
      }
      if (settings?.generationDisabled) return {
        ...base, state: 'paused', reasonCode: 'kill_switch_active', message: 'AI generation is paused.',
      }
      if (destination === 'vertex-eu') return { ...base, state: 'ready', reasonCode: null, message: 'Managed Vertex AI EU is configured.' }
      if (destination === 'local-mock') return { ...base, state: 'ready', reasonCode: null, message: 'Local demo generation is configured.' }
      if (!settings?.provider) return base
      return {
        ...base, state: 'approval_required', reasonCode: 'brief_provider_approval_required',
        message: 'Project materials require the managed Vertex AI EU connection.',
      }
    },
  }
}
