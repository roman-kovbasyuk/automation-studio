import { templateManifestSchema } from './templateManifest.js'

// Both preview and export consume the resulting immutable manifest. No browser theme overrides.
export function resolveTemplateBrand(source, version, logoDataUrl) {
  if (!version?.id || !version.brandId || !version.snapshot) throw new Error('A published brand version is required')
  const brand = version.snapshot
  const logo = brand.assets.find(asset => asset.id === brand.logoRoles.primary && asset.kind === 'logo' && asset.approved)
  if (!logo || !logoDataUrl) throw new Error('An approved, available primary logo is required')
  const manifest = structuredClone(source)
  const palette = new Map(brand.colors.palette.filter(token => token.confirmed).map(token => [token.id, token.value]))
  const color = role => {
    const value = palette.get(brand.colors.roles[role])
    if (!value) throw new Error(`Missing confirmed brand color: ${role}`)
    return value
  }
  const textSlots = manifest.slots.filter(slot => slot.type !== 'image')
  const previous = manifest.brand
  const mapping = {
    systemId: version.brandId, versionId: version.id, versionNumber: version.versionNumber, name: brand.name,
    backgroundRole: previous?.backgroundRole ?? 'canvas',
    slotColorRoles: previous?.slotColorRoles ?? Object.fromEntries(textSlots.map(slot => [slot.id, slot.type === 'cta' ? 'inverseText' : 'primaryText'])),
    shapeColorRoles: previous?.shapeColorRoles ?? manifest.presentation.shapes.map((_, i, shapes) => i === shapes.length - 1 ? 'primary' : i === 0 ? 'surface' : 'accent'),
    fontRoles: previous?.fontRoles ?? Object.fromEntries(textSlots.map(slot => [slot.id, slot.id === 'headline' || slot.type === 'cta' ? 'heading' : 'body'])),
  }
  manifest.brand = mapping
  manifest.presentation.backgroundColor = color(mapping.backgroundRole)
  for (const slot of textSlots) {
    manifest.presentation.slotColors[slot.id] = color(mapping.slotColorRoles[slot.id])
    const font = brand.typography[mapping.fontRoles[slot.id]]
    if (!font.confirmed || !brand.typography.licenseConfirmed || !['Inter', 'Arimo'].includes(font.family) || ![400, 600, 700].includes(font.weight)) {
      throw new Error('Templates require a confirmed bundled font: Inter or Arimo, weight 400, 600, or 700')
    }
    slot.fontFamily = font.family
    slot.fontWeight = font.weight
  }
  manifest.presentation.shapes.forEach((shape, i) => { shape.fill = color(mapping.shapeColorRoles[i]) })
  const photo = manifest.slots.find(slot => slot.type === 'image')
  const placements = Object.fromEntries(manifest.ratios.map(ratio => {
    const area = photo?.placements[ratio.id]
    const width = Math.min(250, Math.floor((area?.width ?? ratio.width) * 0.72))
    const height = Math.ceil(width * 0.43)
    const right = Math.min((area ? area.x + area.width - 16 : ratio.width - ratio.safeArea.right), ratio.width - ratio.safeArea.right)
    const bottom = Math.min((area ? area.y + area.height - 16 : ratio.height - ratio.safeArea.bottom), ratio.height - ratio.safeArea.bottom)
    return [ratio.id, { x: right - width, y: bottom - height, width, height }]
  }))
  manifest.presentation.graphics = [{ id: 'brand-primary-logo', assetId: logo.id, dataUrl: logoDataUrl, backgroundColor: '#FFFFFF', placements }]
  return templateManifestSchema.parse(manifest)
}
