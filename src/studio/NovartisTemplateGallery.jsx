import { AppButton } from '../components/design-system/compatibility.jsx'
import { useState } from 'react'
import { AnimatedBanner } from './AnimatedBanner.jsx'
import './novartis-template-gallery.css'

export const DESIGN_SYSTEMS = Object.freeze([
  { id: 'novartis', label: 'Novartis', eyebrow: 'NOVARTIS · V1 KIT', description: 'Progress in every heartbeat, carried through the supplied cardiovascular campaign board.' },
  { id: 'folkeuniversitetet', label: 'FOK University', matchNames: ['folkeuniversitetet', 'fok university'], eyebrow: 'FOK UNIVERSITY', description: 'Folkeuniversitetet foundations and approved template assignments.' },
  { id: 'msd', label: 'MSD', eyebrow: 'MSD · CORE DIRECTION', description: 'MSD template layouts assigned to the published brand system.' },
])

export const DESIGN_SYSTEM_OPTIONS = DESIGN_SYSTEMS.map(system => ({ value: system.id, label: system.label }))

function getSystem(systemId) {
  return DESIGN_SYSTEMS.find(system => system.id === systemId) ?? DESIGN_SYSTEMS[0]
}

function manifestBrandNames(template) {
  const brand = template?.manifest?.brand ?? template?.brand
  return [brand?.name, brand?.systemId].filter(Boolean).map(value => String(value).trim().toLowerCase())
}

export function templateBelongsToSystem(template, systemId) {
  if (systemId === 'novartis') return manifestBrandNames(template).some(value => value === 'novartis' || value === 'novartis-system')
  const system = getSystem(systemId)
  const names = system.matchNames ?? [system.id]
  return manifestBrandNames(template).some(value => names.includes(value))
}

export function templatesForDesignSystem(templates = [], systemId) {
  const branded = templates.filter(template => manifestBrandNames(template).length > 0)
  const scoped = templates.filter(template => templateBelongsToSystem(template, systemId))
  // Older catalogs predate brand assignment. Keep those templates usable in
  // the local catalog until an explicit brand binding exists.
  return scoped.length || branded.length ? scoped : templates
}

const NOVARTIS_TEMPLATES = Object.freeze([
  {
    id: 'novartis-banner',
    title: 'Campaign banner',
    type: 'banners',
    label: 'Ads',
    formats: 'Square preview · 3 responsive sizes',
    description: 'The supplied campaign composition, with responsive sizes available in the banner detail view.',
    // The supplied derivative named `banner-vertical` is the square crop in
    // the reference board; keep the catalog preview physically square and
    // retain the other two supplied crops for the responsive detail view.
    previews: ['banner-vertical'],
    responsivePreviews: ['banner-vertical', 'banner-horizontal', 'banner-square'],
  },
  {
    id: 'novartis-cover-slide',
    title: 'Playbook cover slide',
    type: 'presentations',
    label: 'Presentations',
    formats: '16:9 · 1280 × 720',
    description: 'The wide campaign playbook cover from the supplied reference board.',
    previews: ['playbook-cover'],
  },
  {
    id: 'novartis-landing-page',
    title: 'Cardiovascular landing page',
    type: 'landing-page',
    label: 'Web',
    formats: 'Responsive · Desktop + mobile',
    description: 'The complete page sequence: hero, proof points, focus, impact, CTA, and footer.',
    previews: ['landing-page'],
  },
  {
    id: 'novartis-business-card',
    title: 'Business card',
    type: 'business-cards',
    label: 'Other',
    formats: 'Front + back · 85 × 55 mm',
    description: 'The two printed sides shown in the supplied reference board.',
    previews: ['business-card-front', 'business-card-back'],
  },
])

function previewSrc(name) {
  return `/assets/novartis/${name}.webp`
}

function TemplateArt({ template }) {
  const previews = template.previews ?? []
  if (template.type === 'banners') return <div className="nv-template-card__art nv-template-card__art--banners" data-banner-preview>
    <img className="nv-template-card__single-preview" src={previewSrc(previews[0])} alt={`${template.title} square banner preview`} />
  </div>
  return <div className={`nv-template-card__art nv-template-card__art--${template.type}`} aria-label={`${template.title} reference preview`}>
    {template.type === 'business-cards' ? <div className="nv-template-card__card-pair">
      {previews.map(name => <img key={name} src={previewSrc(name)} alt="" />)}
    </div> : <img className="nv-template-card__single-preview" src={previewSrc(previews[0])} alt="" />}
  </div>
}

function ResponsiveBannerDetail({ template, onBack }) {
  const previews = template.responsivePreviews ?? template.previews ?? []
  const labels = ['Square', 'Horizontal', 'Vertical']
  return <div className="nv-template-gallery__detail">
    <AppButton variant="secondary" size="compact" onClick={onBack}>Back to banner cards</AppButton>
    <section className="nv-template-gallery__responsive" aria-label={`${template.title} responsive versions`}>
      <header className="nv-template-gallery__heading">
        <div><p className="nv-template-gallery__eyebrow">RESPONSIVE VERSIONS</p><h3>{template.title}</h3><p>Review the supplied square, horizontal, and vertical crops before choosing this banner.</p></div>
        <span className="nv-template-gallery__count">{previews.length} sizes</span>
      </header>
      <div className="nv-template-gallery__responsive-grid">
        {previews.map((name, index) => <figure key={name} className="nv-template-gallery__responsive-item">
          <img src={previewSrc(name)} alt={`${template.title} ${labels[index] ?? 'responsive'} version`} />
          <figcaption>{labels[index] ?? 'Responsive'} <span>{index === 0 ? '1:1' : index === 1 ? '16:9' : '9:16'}</span></figcaption>
        </figure>)}
      </div>
    </section>
  </div>
}

export function BannerTemplateCard({ systemLabel, title, description, formats, preview, onUse, onInspect, canChoose = true, concept = `${systemLabel} concept template` }) {
  return <article className="nv-template-card">
    <div className="nv-template-card__art nv-template-card__art--banners" data-banner-preview>{preview}</div>
    <div className="nv-template-card__body">
      <div className="nv-template-card__meta"><span>Ads</span><span>{formats}</span></div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="nv-template-card__actions">
        {onInspect && <AppButton variant="secondary" size="compact" aria-label={`View responsive versions for ${title}`} onClick={onInspect}>View responsive versions</AppButton>}
        {onUse && <AppButton variant="primary" size="compact" aria-label={`Use ${title} template`} disabled={!canChoose} onClick={onUse}>Use template</AppButton>}
      </div>
    </div>
    <span className="nv-template-card__concept">{concept}</span>
  </article>
}

export function GenericTemplateArt({ template }) {
  const manifest = template.manifest
  const ratioId = manifest.ratios?.find(ratio => ratio.id === 'square')?.id ?? manifest.ratios?.[0]?.id
  const sampleValues = Object.fromEntries((manifest.slots ?? []).filter(slot => slot.type !== 'image').map(slot => [slot.id, {
    headline: 'A clearer way forward.', body: 'A focused layout for the next story.', cta: 'Explore the direction', tag: 'BRAND SYSTEM',
  }[slot.id] ?? 'Sample content']))
  return <AnimatedBanner manifest={manifest} slotValues={sampleValues} ratioId={ratioId} playing={false} title={`${template.name} template preview`} />
}

export function DesignSystemTemplateGallery({ systemId, kind = 'all', templates = [], onUse, canChoose = true }) {
  const system = getSystem(systemId)
  const scoped = templatesForDesignSystem(templates, system.id)
  const isBannerGallery = kind === 'banners'
  const category = kind === 'banners' ? 'Ads' : kind === 'landing-page' ? 'Web' : kind === 'business-cards' ? 'Other' : 'Presentations'
  return <section className={`nv-template-gallery nv-template-gallery--system nv-template-gallery--${system.id}`} aria-label={`${system.label} template catalog`}>
    <header className="nv-template-gallery__heading">
      <div><p className="nv-template-gallery__eyebrow">{system.eyebrow}</p><h2>{category} templates</h2><p>{system.description}</p></div>
      <span className="nv-template-gallery__count">{scoped.length} {scoped.length === 1 ? 'template' : 'templates'}</span>
    </header>
    {scoped.length ? <div className="nv-template-gallery__grid">
      {scoped.map(template => isBannerGallery ? <BannerTemplateCard key={template.id} systemLabel={system.label} title={template.name} description={`Published layout assigned to the ${system.label} design system.`} formats={template.manifest?.ratios?.map(ratio => `${ratio.width} × ${ratio.height}`).join(' · ')} preview={<GenericTemplateArt template={template} />} onUse={onUse ? () => onUse(template.id) : undefined} canChoose={canChoose} concept={`${system.label} template`} /> : <article className="nv-template-card" key={template.id}>
        <div className="nv-template-card__art nv-template-card__art--generic"><GenericTemplateArt template={template} /></div>
        <div className="nv-template-card__body"><div className="nv-template-card__meta"><span>{system.label}</span><span>{template.manifest?.ratios?.map(ratio => `${ratio.width} × ${ratio.height}`).join(' · ')}</span></div><h3>{template.name}</h3><p>Published layout assigned to the {system.label} design system.</p>{onUse && <AppButton variant="primary" size="compact" aria-label={`Use ${template.name} template`} disabled={!canChoose} onClick={() => onUse(template.id)}>Use template</AppButton>}</div>
        <span className="nv-template-card__concept">{system.label} template</span>
      </article>)}
    </div> : <div className="nv-template-gallery__empty" role="status"><strong>No {category.toLowerCase()} templates are assigned yet.</strong><span>Publish or assign a template to this design system to make it available here.</span></div>}
  </section>
}

export function NovartisTemplateGallery({ kind = 'all', onUse, canChoose = true }) {
  const [responsiveId, setResponsiveId] = useState(null)
  const templates = kind === 'all' ? NOVARTIS_TEMPLATES : NOVARTIS_TEMPLATES.filter(template => template.type === kind)
  const responsiveTemplate = templates.find(template => template.id === responsiveId)
  const isSingle = templates.length === 1
  return <section className={`nv-template-gallery${isSingle ? ' nv-template-gallery--single' : ''}`} aria-label="Novartis V1 templates">
    {responsiveTemplate ? <ResponsiveBannerDetail template={responsiveTemplate} onBack={() => setResponsiveId(null)} /> : <>
    <header className="nv-template-gallery__heading">
      <div><p className="nv-template-gallery__eyebrow">NOVARTIS · V1 KIT</p><h2>Progress in every heartbeat</h2><p>{isSingle ? 'Reference-led starter artwork for this format, reproduced from the supplied campaign board.' : 'The supplied campaign board carries one visual language through the launch formats.'}</p></div>
      <span className="nv-template-gallery__count">{templates.length} {templates.length === 1 ? 'template' : 'templates'}</span>
    </header>
    <div className="nv-template-gallery__grid">
      {templates.map(template => template.type === 'banners' ? <BannerTemplateCard key={template.id} systemLabel="Novartis" title={template.title} description={template.description} formats={template.formats} preview={<img className="nv-template-card__single-preview" src={previewSrc(template.previews[0])} alt={`${template.title} square banner preview`} />} onInspect={() => setResponsiveId(template.id)} onUse={onUse ? () => onUse(template.id) : undefined} canChoose={canChoose} /> : <article className="nv-template-card" key={template.id}>
        <TemplateArt template={template} />
        <div className="nv-template-card__body"><div className="nv-template-card__meta"><span>{template.label}</span><span>{template.formats}</span></div><h3>{template.title}</h3><p>{template.description}</p>{onUse && <AppButton variant="primary" size="compact" disabled={!canChoose} onClick={() => onUse(template.id)}>Use template</AppButton>}</div>
        <span className="nv-template-card__concept">Novartis concept template</span>
      </article>)}
    </div>
    </>}
  </section>
}

export { NOVARTIS_TEMPLATES }
