import { useEffect, useMemo, useState } from 'react'
import { Panel, SegmentedControl, TextField } from 'brutalist-design-system'
import { ArrowUpRight, Circle, Heart, Image as ImageIcon, Layers3, Ruler, Type, Users } from 'lucide-react'
import { BrandAssetPreview } from './BrandAssetPreview.jsx'
import { brandFontStack } from './BrandIdentityPreview.jsx'
import folkeuniversitetetOwl from '../assets/folkeuniversitetet-owl.png'
import { generateBlobPath } from '../../../shared/novartisGraphics.js'
import './novartis-system-showcase.css'

const FALLBACK_TEMPLATES = [
  { id: 'banner', name: 'Campaign banner', type: 'banners', formats: ['square', 'horizontal', 'vertical'] },
  { id: 'slide', name: 'Presentation slide', type: 'presentations', formats: ['wide'] },
  { id: 'landing', name: 'Landing page', type: 'landing-page', formats: ['responsive'] },
  { id: 'business-card', name: 'Business card', type: 'business-cards', formats: ['front', 'back'] },
]

const TYPE_LABELS = {
  banners: 'Banners',
  presentations: 'Presentation slides',
  'landing-page': 'Landing page',
  'business-cards': 'Business cards',
}

const SECTION_OPTIONS = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'templates', label: 'Templates' },
]

const TYPE_SPECIMEN_WEIGHTS = [800, 700, 600, 500, 400]

const REFERENCE_ART = {
  banners: 'banner-horizontal.webp',
  presentations: 'playbook-cover.webp',
  'landing-page': 'landing-page.webp',
  'business-cards': 'business-card-front.webp',
}

function tokenValue(snapshot, role, fallback) {
  const id = snapshot?.colors?.roles?.[role]
  return snapshot?.colors?.palette?.find(token => token.id === id)?.value ?? fallback
}

function seedFromName(name = '') {
  return [...name].reduce((total, character) => total + character.charCodeAt(0), 0) || 12
}

function accentInk(value) {
  const hex = String(value).replace('#', '')
  if (hex.length !== 6) return '#111'
  const [r, g, b] = [0, 2, 4].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.2 ? '#111' : '#fff'
}

function blobPreset(snapshot, name = 'hero') {
  const configured = snapshot?.campaignKit?.blobs?.[name]
  return configured ?? {
    seed: seedFromName(snapshot?.name) + (name === 'accent' ? 11 : 0),
    lobes: name === 'accent' ? 3 : 4,
    irregularity: name === 'accent' ? 0.24 : 0.18,
    pointsPerLobe: 8,
  }
}

function Blob({ fill, snapshot, preset = 'hero', className = '' }) {
  return <svg className={`bs-system-blob ${className}`} viewBox="0 0 160 160" aria-hidden="true">
    <path fill={fill} d={generateBlobPath(blobPreset(snapshot, preset))} />
  </svg>
}

function BentoBoard({ snapshot, onReadAsset }) {
  const primary = tokenValue(snapshot, 'primary', '#2458E6')
  const accent = tokenValue(snapshot, 'accent', '#FF5E68')
  const canvas = tokenValue(snapshot, 'canvas', '#F3F4F6')
  const surface = tokenValue(snapshot, 'surface', '#FFFFFF')
  const ink = tokenValue(snapshot, 'primaryText', '#111827')
  const heading = snapshot?.typography?.heading ?? { family: 'Inter', weight: 700, fallbacks: ['Arial'] }
  const body = snapshot?.typography?.body ?? { family: 'Inter', weight: 400, fallbacks: ['Arial'] }
  const isFolkeuniversitetet = snapshot?.name?.toLowerCase() === 'folkeuniversitetet'
  const hero = snapshot?.campaignKit?.hero
  const logo = snapshot?.assets?.find(asset => asset.id === snapshot.logoRoles?.primary && asset.approved)
  const headline = hero?.headline ?? 'Ideas take shape.'

  return <div className="bs-system-bento" style={{ '--bs-brand-primary': primary, '--bs-brand-accent': accent, '--bs-brand-accent-ink': accentInk(accent), '--bs-brand-canvas': canvas, '--bs-brand-surface': surface, '--bs-brand-ink': ink }} aria-label={`${snapshot.name} visual system preview`}>
    <div className="bs-system-bento__cell bs-system-bento__cell--primary">
      <span className="bs-system-bento__typeface">{heading.family || 'Inter'} typeface</span>
      <div className="bs-system-bento__type-stack" style={{ fontFamily: brandFontStack(heading) }} aria-label={`${heading.family || 'Inter'} typography specimen`}>
        {TYPE_SPECIMEN_WEIGHTS.map(weight => <span className="bs-system-bento__type-line" style={{ fontWeight: weight }} key={weight} aria-hidden="true">{heading.family || 'Inter'}<sup>®</sup></span>)}
      </div>
    </div>
    <div className="bs-system-bento__cell bs-system-bento__cell--accent bs-system-bento__cell--metric" aria-label="Illustrative metric typography specimen">
      <span className="bs-system-bento__metric-label" style={{ fontFamily: brandFontStack(body), fontWeight: body.weight }}>New users</span>
      <strong className="bs-system-bento__metric-value" style={{ fontFamily: brandFontStack(heading), fontWeight: heading.weight }}>57K</strong>
      <span className="bs-system-bento__metric-change" style={{ fontFamily: brandFontStack(heading), fontWeight: heading.weight }}>+10%</span>
    </div>
    <div className="bs-system-bento__cell bs-system-bento__cell--surface">
      {logo ? <BrandAssetPreview asset={logo} onReadAsset={onReadAsset} alt={`${snapshot.name} logo`} /> : <strong>{snapshot.name}</strong>}
    </div>
    <div className="bs-system-bento__cell bs-system-bento__cell--message">
      <span className="bs-system-bento__label">Core message</span>
      <h2 style={{ fontFamily: brandFontStack(heading), fontWeight: heading.weight }}>{headline}</h2>
      <p>{hero?.body ?? 'A shared visual language that carries from the first idea to the final format.'}</p>
    </div>
    <div className={`bs-system-bento__cell bs-system-bento__cell--accent-tall${isFolkeuniversitetet ? ' bs-system-bento__cell--owl' : ''}`}>
      {isFolkeuniversitetet ? <>
        <span className="bs-system-bento__owl-word" aria-hidden="true">FOLKE</span>
        <span className="bs-system-bento__owl-shadow" aria-hidden="true" />
        <img className="bs-system-bento__owl" src={folkeuniversitetetOwl} alt="" />
      </> : <Blob fill={accent} snapshot={snapshot} preset="accent" />}
      <span className="bs-system-bento__label">Shape language</span>
      <span className="bs-system-bento__caption">Deterministic graphic form</span>
    </div>
    <div className="bs-system-bento__cell bs-system-bento__cell--accent-lower">
      <span className="bs-system-bento__label">Tone</span>
      <strong>Clear and human</strong>
    </div>
    <div className="bs-system-bento__cell bs-system-bento__cell--surface-small">
      <span className="bs-system-bento__label">Spacing</span>
      <div className="bs-system-bento__spacing" aria-hidden="true"><i /><i /><i /><i /></div>
    </div>
    <div className="bs-system-bento__cell bs-system-bento__cell--primary-small">
      <span className="bs-system-bento__label">Component</span>
      <span className="bs-system-bento__cta">Explore <ArrowUpRight size={15} aria-hidden="true" /></span>
    </div>
  </div>
}

function foundationItems(snapshot, onReadAsset) {
  const palette = snapshot?.colors?.palette ?? []
  const heading = snapshot?.typography?.heading ?? { family: 'Inter', weight: 700, fallbacks: ['Arial'] }
  const body = snapshot?.typography?.body ?? { family: 'Inter', weight: 400, fallbacks: ['Arial'] }
  const logo = snapshot?.assets?.find(asset => asset.id === snapshot.logoRoles?.primary && asset.approved)
  const supportingAssets = snapshot?.assets?.filter(asset => asset.kind !== 'logo' && asset.approved) ?? []
  const primary = tokenValue(snapshot, 'primary', '#2458E6')
  const accent = tokenValue(snapshot, 'accent', '#FF5E68')
  const ink = tokenValue(snapshot, 'primaryText', '#111827')
  const canvas = tokenValue(snapshot, 'canvas', '#F3F4F6')

  return [
    {
      id: 'typography', label: 'Typography', icon: Type, description: 'Display and body roles for a consistent voice.', content: <Panel title="Typography" description="The type roles inherited by every template." headingLevel={3}>
        <div className="bs-foundation-type" style={{ '--bs-brand-primary': primary, '--bs-brand-accent': accent }}>
          <p className="bs-foundation-type__display" style={{ fontFamily: brandFontStack(heading), fontWeight: heading.weight }}>Make room for <em>ideas.</em></p>
          <p className="bs-foundation-type__body" style={{ fontFamily: brandFontStack(body), fontWeight: body.weight }}>Readable body copy keeps the system clear across a landing page, slide, banner, and business card.</p>
          <div className="bs-foundation-type__meta"><span>Heading · {heading.family || 'Inter'} {heading.weight}</span><span>Body · {body.family || 'Inter'} {body.weight}</span></div>
        </div>
      </Panel>,
    },
    {
      id: 'logo', label: 'Logo', icon: Circle, description: 'Primary signature with its clear space.', content: <Panel title="Logo" description="Keep the mark recognizable and proportionate in every format." headingLevel={3}>
        <div className="bs-foundation-logo" style={{ background: canvas, color: ink }}>
          {logo ? <BrandAssetPreview asset={logo} onReadAsset={onReadAsset} alt={`${snapshot.name} logo`} /> : <strong>{snapshot.name}</strong>}
          <span>Primary signature</span>
        </div>
      </Panel>,
    },
    {
      id: 'colors', label: 'Colors', icon: Circle, description: `${palette.length} palette tokens and semantic roles.`, content: <Panel title="Colors" description="Token values are copied from the active published snapshot." headingLevel={3}>
        <div className="bs-foundation-swatches" aria-label={`${snapshot.name} palette`}>
          {palette.slice(0, 8).map(token => <div className="bs-foundation-swatch" key={token.id}><span style={{ background: token.value }} aria-hidden="true" /><strong>{token.name}</strong><code>{token.value}</code></div>)}
        </div>
      </Panel>,
    },
    {
      id: 'spacing', label: 'Spacing', icon: Ruler, description: 'A compact rhythm for layouts and components.', content: <Panel title="Spacing" description="Use the same rhythm from the Bento board to template compositions." headingLevel={3}>
        <div className="bs-foundation-spacing" aria-label="Spacing scale"><div><span>4</span><i style={{ width: '12%' }} /></div><div><span>8</span><i style={{ width: '24%' }} /></div><div><span>16</span><i style={{ width: '48%' }} /></div><div><span>24</span><i style={{ width: '72%' }} /></div><div><span>32</span><i style={{ width: '96%' }} /></div></div>
      </Panel>,
    },
    {
      id: 'imagery', label: 'Images', icon: ImageIcon, description: `${supportingAssets.length} approved supporting asset${supportingAssets.length === 1 ? '' : 's'}.`, content: <Panel title="Images and shapes" description="Approved imagery sits beside deterministic, adjustable graphic forms." headingLevel={3}>
        <div className="bs-foundation-imagery" style={{ '--bs-brand-primary': primary, '--bs-brand-accent': accent }}>
          <div className="bs-foundation-shapes"><Blob fill={primary} snapshot={snapshot} /><Blob fill={accent} snapshot={snapshot} preset="accent" /></div>
          <div><strong>{supportingAssets.length || 'No'}</strong><span>approved supporting assets</span></div>
        </div>
      </Panel>,
    },
    {
      id: 'components', label: 'Components', icon: Layers3, description: 'Reusable pieces that carry the system into output.', content: <Panel title="Components" description="Small, repeatable structures assembled into each template." headingLevel={3}>
        <div className="bs-foundation-components"><div><Heart size={21} aria-hidden="true" /><strong>Feature card</strong><span>Icon, title, and proof.</span></div><div><Users size={21} aria-hidden="true" /><strong>People row</strong><span>Human context and trust.</span></div><div><ArrowUpRight size={21} aria-hidden="true" /><strong>Action</strong><span>One clear next step.</span></div></div>
      </Panel>,
    },
  ]
}

function templatePreview(snapshot, template) {
  const primary = tokenValue(snapshot, 'primary', '#2458E6')
  const accent = tokenValue(snapshot, 'accent', '#FF5E68')
  const canvas = tokenValue(snapshot, 'canvas', '#F3F4F6')
  const isNovartis = snapshot?.name?.trim().toLowerCase() === 'novartis'
  const reference = isNovartis ? REFERENCE_ART[template.type] : undefined
  if (reference) return <img src={`/assets/novartis/${reference}`} alt="" />
  return <div className="bs-template-preview__mock" style={{ '--bs-brand-primary': primary, '--bs-brand-accent': accent, '--bs-brand-canvas': canvas }}><span /><span /><i /><b /></div>
}

function templateItems(snapshot) {
  return snapshot?.campaignKit?.templates?.length ? snapshot.campaignKit.templates : FALLBACK_TEMPLATES
}

function FoundationPanel({ snapshot, query, onReadAsset }) {
  const items = useMemo(() => foundationItems(snapshot, onReadAsset), [snapshot, onReadAsset])
  const [activeId, setActiveId] = useState(() => {
    const prefix = '#brand-foundation-'
    const hash = typeof window === 'undefined' ? '' : window.location.hash
    const requested = hash.startsWith(prefix) ? hash.slice(prefix.length) : ''
    return items.some(item => item.id === requested) ? requested : items[0]?.id
  })
  useEffect(() => {
    const syncActiveSection = () => {
      const prefix = '#brand-foundation-'
      const hash = window.location.hash
      const requested = hash.startsWith(prefix) ? hash.slice(prefix.length) : ''
      setActiveId(items.some(item => item.id === requested) ? requested : items[0]?.id)
    }
    syncActiveSection()
    window.addEventListener('hashchange', syncActiveSection)
    return () => window.removeEventListener('hashchange', syncActiveSection)
  }, [items])
  const normalized = query.trim().toLowerCase()
  const visible = items.filter(item => !normalized || `${item.label} ${item.description}`.toLowerCase().includes(normalized))
  return <div className="bs-foundation-layout">
    <nav className="bs-foundation-index" aria-label="Foundation sections">
      {items.map(item => <a key={item.id} className={activeId === item.id ? 'is-active' : undefined} aria-current={activeId === item.id ? 'location' : undefined} href={`#brand-foundation-${item.id}`} onClick={() => setActiveId(item.id)}><item.icon size={15} aria-hidden="true" /><span>{item.label}</span></a>)}
    </nav>
    <div className="bs-foundation-panels">
      {visible.length ? visible.map(item => <section id={`brand-foundation-${item.id}`} className="bs-foundation-panel" key={item.id}>{item.content}</section>) : <div className="bs-system-empty" role="status">No foundation items match “{query}”.</div>}
    </div>
  </div>
}

function TemplatesPanel({ snapshot, query }) {
  const normalized = query.trim().toLowerCase()
  const templates = templateItems(snapshot).filter(template => `${template.name} ${TYPE_LABELS[template.type] ?? template.type} ${template.formats.join(' ')}`.toLowerCase().includes(normalized))
  return templates.length ? <div className="bs-template-grid">{templates.map(template => <article className="bs-template-card" key={template.id}>
    <div className={`bs-template-preview bs-template-preview--${template.type}`}>{templatePreview(snapshot, template)}</div>
    <div className="bs-template-card__body"><span className="bs-template-card__eyebrow">{TYPE_LABELS[template.type] ?? template.type}</span><h3>{template.name}</h3><p>{template.formats.join(' · ')}</p><span className="bs-template-card__meta-note">Reference preview</span></div>
  </article>)}</div> : <div className="bs-system-empty" role="status">No templates match “{query}”.</div>
}

export function BrandSystemShowcase({ snapshot, onReadAsset, heading, actions }) {
  const [tab, setTab] = useState('foundation')
  const [query, setQuery] = useState('')
  return <section id="brand-published-showcase" className="bs-system-showcase" aria-label={`${snapshot.name} design system`}>
    <header className="bs-system-showcase__toolbar">
      {heading && <div className="bs-system-showcase__title">{heading}</div>}
      <div className="bs-system-showcase__switch"><SegmentedControl label={`${snapshot.name} design system sections`} options={SECTION_OPTIONS} value={tab} onChange={setTab} /></div>
      <div className="bs-system-showcase__search"><TextField label="" aria-label="Search foundations and templates" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search…" /></div>
      {actions && <div className="bs-system-showcase__actions">{actions}</div>}
    </header>
    <BentoBoard snapshot={snapshot} onReadAsset={onReadAsset} />
    <div className="bs-system-showcase__content" role="region" aria-label={`${SECTION_OPTIONS.find(option => option.value === tab)?.label} design system content`}>
      {tab === 'foundation'
        ? <FoundationPanel snapshot={snapshot} query={query} onReadAsset={onReadAsset} />
        : <TemplatesPanel snapshot={snapshot} query={query} />}
    </div>
  </section>
}

// Kept as a compatibility export for existing imports and tests.
export const NovartisSystemShowcase = BrandSystemShowcase
