import { createGeminiProvider } from './geminiProvider.js'
import { GEMINI_TEXT_MODELS, GEMINI_IMAGE_MODELS, GEMINI_LOCATIONS } from './registry.js'

// Server process only. No repository, browser, or settings persistence.
export function createEnvironmentGemini({ environment = process.env, createProvider = createGeminiProvider } = {}) {
  const textKey = environment.GEMINI_TEXT_API_KEY?.trim()
  const mediaKey = environment.GEMINI_MEDIA_API_KEY?.trim()
  const textModel = GEMINI_TEXT_MODELS[0], imageModel = GEMINI_IMAGE_MODELS[0], region = GEMINI_LOCATIONS[0]
  const textSteps = new Set(['brief_analysis', 'copy', 'directions'])
  const selection = step => {
    if (step === 'image' ? !mediaKey : !textSteps.has(step) || !textKey) return null
    return { provider: 'gemini', model: step === 'image' ? imageModel : textModel, region }
  }
  return Object.freeze({
    enabled: Boolean(textKey || mediaKey),
    selection,
    provider({ step, provider, model, region: requestedRegion, credentialVersion }) {
      const expected = selection(step)
      if (!expected || credentialVersion != null || provider !== expected.provider || model !== expected.model || requestedRegion !== expected.region) return null
      return createProvider({ apiKey: step === 'image' ? mediaKey : textKey, textModel, imageModel, location: region })
    },
  })
}
