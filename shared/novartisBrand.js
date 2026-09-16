import { NOVARTIS_BLOB_PRESETS } from './novartisGraphics.js'

// Novartis pitch brand system foundation. This module is pure so setup scripts,
// previews, and tests can share the same source of truth.
export const novartisReference = 'User-supplied cardiovascular campaign reference board'

export const NOVARTIS_PALETTE = Object.freeze([
  { id: 'novartis-blue', name: 'Novartis blue', value: '#003DA6', confirmed: true, evidence: { method: 'visual_inference' } },
  { id: 'novartis-deep-blue', name: 'Deep blue', value: '#002677', confirmed: true, evidence: { method: 'visual_inference' } },
  { id: 'novartis-coral', name: 'Heartbeat coral', value: '#FF4564', confirmed: true, evidence: { method: 'visual_inference' } },
  { id: 'novartis-coral-light', name: 'Light coral', value: '#FF7C8B', confirmed: true, evidence: { method: 'visual_inference' } },
  { id: 'novartis-blush', name: 'Soft blush', value: '#FFDCE3', confirmed: true, evidence: { method: 'visual_inference' } },
  { id: 'novartis-yellow', name: 'Signal yellow', value: '#FFBF00', confirmed: true, evidence: { method: 'visual_inference' } },
  { id: 'novartis-teal', name: 'Science teal', value: '#009CBA', confirmed: true, evidence: { method: 'visual_inference' } },
  { id: 'novartis-canvas', name: 'Paper canvas', value: '#F7F9FE', confirmed: true, evidence: { method: 'visual_inference' } },
  { id: 'novartis-white', name: 'White', value: '#FFFFFF', confirmed: true, evidence: { method: 'manual' } },
  { id: 'novartis-hairline', name: 'Hairline', value: '#E2E9F5', confirmed: true, evidence: { method: 'visual_inference' } },
])

export const NOVARTIS_COLOR_ROLES = Object.freeze({
  primary: 'novartis-blue',
  accent: 'novartis-coral',
  canvas: 'novartis-canvas',
  surface: 'novartis-white',
  primaryText: 'novartis-deep-blue',
  inverseText: 'novartis-white',
})

export const NOVARTIS_TYPE_SCALE = Object.freeze({
  h1: { size: 64, lineHeight: 1.02 },
  h2: { size: 40, lineHeight: 1.08 },
  h3: { size: 24, lineHeight: 1.16 },
  body: { size: 16, lineHeight: 1.5 },
  caption: { size: 12, lineHeight: 1.35 },
})

export const NOVARTIS_CAMPAIGN_KIT = Object.freeze({
  hero: Object.freeze({
    eyebrow: 'CARDIOVASCULAR',
    headline: 'Progress in every heartbeat',
    body: 'Transforming cardiovascular care through innovation, partnership and people.',
    cta: 'Learn more',
  }),
  blobs: NOVARTIS_BLOB_PRESETS,
  templates: Object.freeze([
    Object.freeze({ id: 'novartis-banner', name: 'Campaign banner', type: 'banners', formats: Object.freeze(['square', 'horizontal', 'vertical']) }),
    Object.freeze({ id: 'novartis-cover-slide', name: 'Playbook cover slide', type: 'presentations', formats: Object.freeze(['wide']) }),
    Object.freeze({ id: 'novartis-landing-page', name: 'Cardiovascular landing page', type: 'landing-page', formats: Object.freeze(['responsive']) }),
    Object.freeze({ id: 'novartis-business-card', name: 'Business card', type: 'business-cards', formats: Object.freeze(['front', 'back']) }),
  ]),
})

export function createNovartisBrandDraft({ assets = [], sources = [] } = {}) {
  const primaryLogo = assets.find(asset => asset.kind === 'logo')?.id ?? null
  return {
    name: 'Novartis',
    context: `${novartisReference}. Pitch concept for a cardiovascular campaign called Progress in every heartbeat. Colors and graphic shapes are visual inference from the supplied concept, not verified corporate guidelines. Inter is the requested typeface.`,
    currentStep: 'review',
    sources,
    assets,
    logoRoles: { primary: primaryLogo, secondary: 'not_applicable', symbol: 'not_applicable', light: 'not_applicable', dark: 'not_applicable' },
    colors: { palette: NOVARTIS_PALETTE.map(token => ({ ...token })), roles: { ...NOVARTIS_COLOR_ROLES } },
    typography: {
      heading: { family: 'Inter', weight: 800, fallbacks: ['Arial', 'sans-serif'], confirmed: true, evidence: { method: 'manual' } },
      body: { family: 'Inter', weight: 400, fallbacks: ['Arial', 'sans-serif'], confirmed: true, evidence: { method: 'manual' } },
      licenseConfirmed: false,
      scale: Object.fromEntries(Object.entries(NOVARTIS_TYPE_SCALE).map(([key, value]) => [key, { ...value }])),
    },
    campaignKit: {
      hero: { ...NOVARTIS_CAMPAIGN_KIT.hero },
      blobs: Object.fromEntries(Object.entries(NOVARTIS_CAMPAIGN_KIT.blobs).map(([key, value]) => [key, { ...value }])),
      templates: NOVARTIS_CAMPAIGN_KIT.templates.map(template => ({ ...template, formats: [...template.formats] })),
    },
    conflicts: [],
  }
}
