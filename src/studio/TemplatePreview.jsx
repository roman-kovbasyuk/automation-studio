import { AnimatedBanner } from './AnimatedBanner.jsx'

export function GenericTemplateArt({ template }) {
  const manifest = template.manifest
  const ratioId = manifest.ratios?.find(ratio => ratio.id === 'square')?.id ?? manifest.ratios?.[0]?.id
  const sampleValues = Object.fromEntries((manifest.slots ?? []).filter(slot => slot.type !== 'image').map(slot => [slot.id, {
    headline: 'A clearer way forward.', body: 'A focused layout for the next story.', cta: 'Explore the direction', tag: 'BRAND SYSTEM',
  }[slot.id] ?? 'Sample content']))
  return <AnimatedBanner manifest={manifest} slotValues={sampleValues} ratioId={ratioId} playing={false} title={`${template.name} template preview`} />
}
