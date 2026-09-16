import { createEmptyBrandDraft } from './brandDesignSystem.js'

export const folkeuniversitetetFigma = 'https://www.figma.com/design/yEZqEmtjpOnrgfdYvnepAk/FU--Brand?node-id=0-1&t=4ZCnkaEueZckk2i5-1'
export const folkeuniversitetetWebsite = 'https://www.folkeuniversitetet.no/en'

const evidence = { method: 'structured_import' }

/**
 * Creates the Folkeuniversitetet foundation extracted from the supplied brand file.
 * Matter remains unconfirmed until a licensed font package is added to the workspace.
 */
export function createFolkeuniversitetetBrandDraft({ assets = [], sources = [] } = {}) {
  const draft = createEmptyBrandDraft('Folkeuniversitetet')
  draft.currentStep = 'review'
  draft.context = `Foundation extracted from the Folkeuniversitetet brand boards in ${folkeuniversitetetFigma}, cross-checked against ${folkeuniversitetetWebsite}. The visual system pairs Matter display typography with Matter Mono utility text and Inter for body copy. The palette uses a warm paper canvas, primary red, pale coral, deep red, and university blue, with a magenta-to-pink gradient for expressive moments. Matter and Matter Mono are intentionally unconfirmed until licensed font files are uploaded; keep this system in draft and do not assign it to templates until that review is complete.`
  draft.assets = assets
  draft.sources = sources

  const logo = assets.find(asset => asset.kind === 'logo')
  draft.logoRoles = {
    primary: logo?.id ?? null,
    secondary: 'not_applicable',
    symbol: 'not_applicable',
    light: 'not_applicable',
    dark: 'not_applicable',
  }

  draft.colors = {
    palette: [
      { id: 'primary-red', name: 'Primary red', value: '#FF3F2E', confirmed: true, evidence },
      { id: 'accent-light', name: 'Light coral', value: '#FFC6B6', confirmed: true, evidence },
      { id: 'accent-red', name: 'Deep red', value: '#BA0C2F', confirmed: true, evidence },
      { id: 'accent-blue', name: 'University blue', value: '#00205B', confirmed: true, evidence },
      { id: 'paper', name: 'Warm paper', value: '#FFE2D9', confirmed: true, evidence },
      { id: 'ink', name: 'Text ink', value: '#273659', confirmed: true, evidence: { method: 'visual_inference' } },
      { id: 'gradient-magenta', name: 'Gradient magenta', value: '#941962', confirmed: true, evidence },
      { id: 'gradient-pink', name: 'Gradient pink', value: '#FF285C', confirmed: true, evidence },
    ],
    roles: {
      primary: 'primary-red',
      accent: 'accent-red',
      canvas: 'paper',
      surface: 'accent-light',
      primaryText: 'accent-blue',
      inverseText: 'paper',
    },
  }

  draft.typography.heading = {
    family: 'Matter', weight: 600, fallbacks: ['Inter', 'Arial', 'sans-serif'], confirmed: false, evidence,
  }
  draft.typography.body = {
    family: 'Inter', weight: 400, fallbacks: ['Arial', 'Helvetica', 'sans-serif'], confirmed: true, evidence,
  }
  draft.typography.licenseConfirmed = false
  draft.typography.scale = {
    h1: { size: 64, lineHeight: 1.05 },
    h2: { size: 44, lineHeight: 1.1 },
    h3: { size: 28, lineHeight: 1.15 },
    body: { size: 16, lineHeight: 1.5 },
    caption: { size: 13, lineHeight: 1.35 },
  }
  return draft
}
