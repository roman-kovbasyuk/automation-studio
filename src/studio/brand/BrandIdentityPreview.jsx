import { BrandAssetPreview } from './BrandAssetPreview.jsx'

export function brandFontStack(font) {
  return [font.family, ...font.fallbacks].filter(Boolean).map(family => /^(sans-serif|serif|monospace)$/.test(family) ? family : JSON.stringify(family)).join(', ')
}

export function brandSummary(snapshot) {
  const fonts = [...new Set([snapshot.typography.heading.family, snapshot.typography.body.family].filter(Boolean))]
  return `${snapshot.colors.palette.length} colors · ${fonts.join(' + ') || 'Typography to define'}`
}

/** Brand artwork: identical composition in the library and brand overview. */
export function BrandIdentityPreview({ snapshot, onReadAsset, compact = false }) {
  const palette = snapshot.colors.palette
  const color = (role, fallback) => palette.find(token => token.id === snapshot.colors.roles[role])?.value ?? fallback
  const logo = snapshot.assets.find(asset => asset.id === snapshot.logoRoles.primary && asset.approved)
  const heading = snapshot.typography.heading
  return <div className={`bs-brand-identity${compact ? ' bs-brand-identity--compact' : ''}`} style={{
    '--brand-paper': color('canvas', '#FFFFFF'), '--brand-ink': color('primaryText', '#000000'),
    '--brand-primary': color('primary', '#000000'), '--brand-surface': color('surface', '#FFFFFF'),
  }}>
    <div className="bs-brand-identity-logo">
      {logo ? <BrandAssetPreview asset={logo} onReadAsset={onReadAsset} alt={`${snapshot.name} logo`} /> : <strong>{snapshot.name}</strong>}
      {!compact && <span>Primary signature</span>}
    </div>
    <div className="bs-brand-identity-type" style={{ fontFamily: brandFontStack(heading), fontWeight: heading.weight }}>
      <span className="bs-brand-identity-aa" aria-hidden="true">Aa</span>
      <span className="bs-brand-identity-family">{heading.family || 'Your typography'}{!compact && <small>{heading.weight} / Heading</small>}</span>
    </div>
    <div className="bs-brand-identity-palette" aria-label="Brand palette">{palette.map(token => <span key={token.id} style={{ background: token.value }} title={`${token.name} ${token.value}`} />)}</div>
  </div>
}
