import { brandDraftSchema } from '../../shared/contracts.js'
import { BRAND_SYSTEM_POLICY } from '../policies/brandDesignSystemPolicy.js'

class BrandProviderError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'BrandProviderError'
    this.code = code
  }
}

function validateCall(input, signal) {
  if (!(signal instanceof AbortSignal)) throw new TypeError('Brand provider requires an AbortSignal')
  if (signal.aborted) throw new DOMException('The brand request was aborted', 'AbortError')
  if (input.policyVersion !== BRAND_SYSTEM_POLICY.version || input.policyInstruction !== BRAND_SYSTEM_POLICY.instruction) {
    throw new BrandProviderError('brand_policy_missing', 'The required brand policy was not supplied')
  }
}

export function estimateBrandWorkload({ sourceBytes, pricing, thresholdUsd = 2 } = {}) {
  if (!pricing) return { available: false, reason: 'pricing_unavailable' }
  const estimatedUsd = Math.round(((sourceBytes / 1_000_000) * pricing.inputUsdPerMillionBytes + pricing.outputUsd) * 100) / 100
  return { available: true, estimatedUsd, thresholdUsd, requiresApproval: estimatedUsd > thresholdUsd }
}

function shiftChannel(value, amount) {
  return Math.max(0, Math.min(255, value + amount))
}

function warmHex(hex) {
  const value = Number.parseInt(hex.slice(1), 16)
  const red = shiftChannel((value >> 16) & 255, 18)
  const green = shiftChannel((value >> 8) & 255, 5)
  const blue = shiftChannel(value & 255, -12)
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

export function createBrandDesignSystemProvider({ provider = 'mock', model = 'mock-v1', region = 'europe-west6', delegate = null } = {}) {
  async function inspectMaterials(input, signal) {
    validateCall(input, signal)
    if (provider !== 'mock' && typeof delegate?.inspectBrandMaterials === 'function') {
      return delegate.inspectBrandMaterials(input, signal)
    }
    if (provider !== 'mock') throw new BrandProviderError('pricing_unavailable', 'Brand analysis pricing is not configured')
    const draft = structuredClone(brandDraftSchema.parse(input.draft))
    const sourceId = input.sources?.[0]?.id
    if (!draft.colors.palette.length) {
      draft.colors.palette = [
        { id: 'brand-ink', name: 'Brand ink', value: '#151515', confirmed: false, evidence: { method: 'ai_suggestion', ...(sourceId ? { sourceId } : {}) } },
        { id: 'brand-paper', name: 'Brand paper', value: '#F6F2EA', confirmed: false, evidence: { method: 'ai_suggestion', ...(sourceId ? { sourceId } : {}) } },
        { id: 'brand-accent', name: 'Brand accent', value: '#E85D3F', confirmed: false, evidence: { method: 'ai_suggestion', ...(sourceId ? { sourceId } : {}) } },
      ]
      draft.colors.roles = { primary: 'brand-ink', accent: 'brand-accent', canvas: 'brand-paper', surface: 'brand-paper', primaryText: 'brand-ink', inverseText: 'brand-paper' }
    }
    if (!draft.typography.heading.family) draft.typography.heading = { ...draft.typography.heading, family: 'Avenir Next', evidence: { method: 'ai_suggestion', ...(sourceId ? { sourceId } : {}) } }
    if (!draft.typography.body.family) draft.typography.body = { ...draft.typography.body, family: 'Avenir Next', evidence: { method: 'ai_suggestion', ...(sourceId ? { sourceId } : {}) } }
    draft.currentStep = 'review'
    return { draft: brandDraftSchema.parse(draft), provider, model, region, policyVersion: BRAND_SYSTEM_POLICY.version }
  }

  async function proposeChanges(input, signal) {
    validateCall(input, signal)
    if (provider !== 'mock' && typeof delegate?.proposeBrandChanges === 'function') {
      return delegate.proposeBrandChanges(input, signal)
    }
    brandDraftSchema.parse(input.draft)
    const prompt = input.prompt.trim().toLowerCase()
    const percent = Number(prompt.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] ?? 10)
    if (/typography|type|font size/.test(prompt) && /smaller|reduce|decrease/.test(prompt)) {
      return { operations: [{ operation: 'scale_typography', factor: Math.max(0.5, 1 - percent / 100) }], unchanged: ['colors', 'logos', 'assets'] }
    }
    if (/typography|type|font size/.test(prompt) && /larger|increase|bigger/.test(prompt)) {
      return { operations: [{ operation: 'scale_typography', factor: Math.min(2, 1 + percent / 100) }], unchanged: ['colors', 'logos', 'assets'] }
    }
    if (/warmer/.test(prompt) && input.draft.colors.palette.length) {
      return {
        operations: input.draft.colors.palette.map((token) => ({ operation: 'set_color', tokenId: token.id, value: warmHex(token.value) })),
        unchanged: ['typography', 'logos', 'assets'],
      }
    }
    throw new BrandProviderError('unsupported_brand_change', 'V1 brand AI can change colors and typography only')
  }

  return Object.freeze({
    provider,
    model,
    region,
    estimateWorkload({ sourceBytes }) {
      return estimateBrandWorkload({ sourceBytes, pricing: provider === 'mock' ? { inputUsdPerMillionBytes: 0, outputUsd: 0 } : undefined })
    },
    inspectMaterials,
    inspectBrandMaterials: inspectMaterials,
    proposeChanges,
    proposeBrandChanges: proposeChanges,
  })
}
