import { createEmptyBrandDraft } from './brandDesignSystem.js'

export const msdReference = 'https://investinholland.com/news/msd-expands-considerably-in-the-netherlands/'
export function createMsdBrandDraft({ assets = [], sources = [] } = {}) {
  const draft = createEmptyBrandDraft('MSD')
  draft.currentStep = 'publish'
  draft.context = `Banner foundation based on the supplied MSD logo and ${msdReference}. Logo teal sampled at #008876; black and white come from the logo. Pale teal is a derived supporting tint. The reference publisher uses Arial/Helvetica, not an official MSD typography guide. Arimo (SIL Open Font License), an Arial-compatible family, is bundled for consistent preview and export. Use a white logo backing, retain proportions and clear space, and use teal geometry sparingly. Template geometry owns sizes and placement; brand roles own colors, family and weight.`
  draft.assets = assets
  draft.sources = sources
  const logo = assets.find(asset => asset.kind === 'logo')
  draft.logoRoles = { primary: logo?.id ?? null, secondary: 'not_applicable', symbol: 'not_applicable', light: 'not_applicable', dark: 'not_applicable' }
  draft.colors = {
    palette: [
      { id: 'msd-teal', name: 'MSD teal', value: '#008876', confirmed: true, evidence: { method: 'visual_inference' } },
      { id: 'black', name: 'Black', value: '#000000', confirmed: true, evidence: { method: 'visual_inference' } },
      { id: 'white', name: 'White', value: '#FFFFFF', confirmed: true, evidence: { method: 'manual' } },
      { id: 'pale-teal', name: 'Pale teal · derived tint', value: '#E5F3F1', confirmed: true, evidence: { method: 'manual' } },
    ],
    roles: { primary: 'msd-teal', accent: 'msd-teal', canvas: 'white', surface: 'pale-teal', primaryText: 'black', inverseText: 'white' },
  }
  for (const role of ['heading', 'body']) draft.typography[role] = { family: 'Arimo', weight: role === 'heading' ? 700 : 400,
    fallbacks: ['Arial', 'Helvetica', 'sans-serif'], confirmed: true, evidence: { method: 'manual' } }
  draft.typography.licenseConfirmed = true
  return draft
}
