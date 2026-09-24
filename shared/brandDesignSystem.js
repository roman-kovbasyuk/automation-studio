import { brandDraftSchema } from './contracts.js'

export function createEmptyBrandDraft(name) {
  return brandDraftSchema.parse({
    name, context: '', currentStep: 'materials', sources: [], assets: [],
    logoRoles: { primary: null, secondary: null, symbol: null, light: null, dark: null },
    colors: { palette: [], roles: { primary: '', accent: '', canvas: '', surface: '', primaryText: '', inverseText: '' } },
    typography: {
      heading: { family: '', weight: 600, fallbacks: ['Arial', 'sans-serif'], confirmed: false },
      body: { family: '', weight: 400, fallbacks: ['Arial', 'sans-serif'], confirmed: false },
      licenseConfirmed: false,
      scale: {
        h1: { size: 48, lineHeight: 1.1 }, h2: { size: 36, lineHeight: 1.15 }, h3: { size: 24, lineHeight: 1.2 },
        body: { size: 16, lineHeight: 1.5 }, caption: { size: 13, lineHeight: 1.4 },
      },
    },
    conflicts: [],
  })
}

export function getBrandReadiness(draft) {
  const errors = []
  const add = (field, message, section) => errors.push({ field, message, section })
  const assets = new Map(draft.assets.map((asset) => [asset.id, asset]))
  const primaryLogo = assets.get(draft.logoRoles.primary)
  if (!primaryLogo || primaryLogo.kind !== 'logo') add('logoRoles.primary', 'Choose a primary logo.', 'logos')
  else if (!primaryLogo.approved) add('logoRoles.primary', 'Mark the primary logo as approved for use.', 'logos')
  for (const role of ['secondary', 'symbol', 'light', 'dark']) {
    const value = draft.logoRoles[role]
    if (!value) add(`logoRoles.${role}`, `Assign ${role} or mark it Not applicable.`, 'logos')
    else if (value !== 'not_applicable') {
      const logo = assets.get(value)
      if (!logo || logo.kind !== 'logo' || !logo.approved) add(`logoRoles.${role}`, `Choose and approve a usable ${role} logo.`, 'logos')
    }
  }
  const palette = new Map(draft.colors.palette.map((token) => [token.id, token]))
  for (const [role, tokenId] of Object.entries(draft.colors.roles)) {
    const token = palette.get(tokenId)
    if (!token) add(`colors.roles.${role}`, `Assign ${role} to an existing color.`, 'colors')
    else if (!token.confirmed) add(`colors.palette.${tokenId}`, `Confirm ${token.name} before publishing.`, 'colors')
  }
  for (const role of ['heading', 'body']) {
    const font = draft.typography[role]
    if (!font.family) add(`typography.${role}.family`, `Choose a ${role} font family.`, 'typography')
    if (!font.confirmed) add(`typography.${role}.confirmed`, `Confirm the ${role} font choice.`, 'typography')
    if (!font.fallbacks.length) add(`typography.${role}.fallbacks`, `Add a fallback for the ${role} font.`, 'typography')
  }
  if (!draft.typography.licenseConfirmed) add('typography.licenseConfirmed', 'Confirm that the fonts are licensed for their intended use.', 'typography')
  for (const conflict of draft.conflicts) if (!conflict.resolved) add(`conflicts.${conflict.id}`, conflict.message, 'review')
  return errors
}
