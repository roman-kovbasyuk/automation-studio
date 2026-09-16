import { projectTypeSections } from '../../shared/projectTypes.js'
import { AtSign, Globe2, LayoutTemplate, Mail, Presentation, Video } from 'lucide-react'
import { AppButton, ActionCard } from "../components/design-system/compatibility.jsx"
import { Button } from './primitives.jsx'

const icons = { AtSign, Globe2, LayoutTemplate, Mail, Presentation, Video }
export const assetTemplateSections = projectTypeSections.map(section => ({
  ...section, items: section.items.map(item => ({ ...item, accent: section.accent, Icon: icons[item.icon] })),
}))
const typeById = new Map(assetTemplateSections.flatMap(section => section.items.map(item => [item.id, item])))
export const getProjectType = id => typeById.get(id) ?? typeById.get('banners')

export function ProjectTypeIcon({ type }) {
  const { Icon, id } = getProjectType(type)
  return <Icon size={16} aria-hidden="true" data-project-type={id} className="bs-project-type-icon" />
}

export function NewAssetScreen({ onChoose }) {
  return (
    <section id="asset-template-groups" className="bs-new-asset" aria-labelledby="new-asset-title">
      <header className="bs-new-asset__header">
        <h1 id="new-asset-title">What are you making?</h1>
        <p>Choose a starting point. You can add your brief and let AI shape the first draft.</p>
      </header>
      <div className="bs-new-asset__grid" role="list" aria-label="Creation types">
        {assetTemplateSections.flatMap(({ label: categoryLabel, slug, items }) =>
          items.map(({ id, label, illustration, formats, available = true }) => <ActionCard
            key={id} role="listitem" label={categoryLabel} aria-label={label} data-template-group={id} data-template-section={slug}>
            <div className="bs-new-asset__content">
              <img src={illustration} alt="" width="128" height="128" />
              <h3>{label}</h3>
              <span>{formats.length} {formats.length === 1 ? 'template' : 'templates'}</span>
              <div className="bs-new-asset__action">{available && <AppButton variant="primary" onClick={() => onChoose(id)}>Create with AI</AppButton>}</div>
            </div>
          </ActionCard>)
        )}
      </div>
    </section>
  )
}

export function AssetComingSoon({ asset, onBack }) {
  const group = assetTemplateSections.flatMap(section => section.items).find(item => item.id === asset)
  const label = group?.label ?? 'Template group'
  return (
    <section className="bs-new-asset" aria-labelledby="new-asset-title">
      <Button onClick={onBack}>Back to creation types</Button>
      <header className="bs-new-asset__header">
        <p className="bs-note">{label}</p>
        <h1 id="new-asset-title">{label} templates are being prepared</h1>
        <p>{group ? `${group.formats.join(' and ')} will use this dedicated template group.` : 'This asset type will use its own dedicated template group.'}</p>
      </header>
    </section>
  )
}
