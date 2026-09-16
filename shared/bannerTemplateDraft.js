import { z } from 'zod'

export const bannerDraftSchema = z.strictObject({
  templateId: z.string().min(1).max(120),
  templateVersion: z.string().min(1).max(80),
  values: z.strictObject({
    caption: z.string().max(40), headline: z.string().max(2000),
    body: z.string().max(2000), cta: z.string().max(100),
  }),
  ratioIds: z.array(z.string().min(1).max(80)).min(1).max(7).refine(ids => new Set(ids).size === ids.length, 'Choose each format once'),
})
export const bannerDraftExportSchema = bannerDraftSchema.extend({
  image: z.strictObject({
    mimeType: z.enum(['image/png', 'image/jpeg']),
    base64: z.string().min(4).max(11200000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
  }),
})
export const bannerDraftActionSchema = bannerDraftSchema.extend({
  action: z.enum(['generate-image', 'image-to-video', 'figma-review']),
  prompt: z.string().max(2000).default(''),
  imageSource: z.enum(['sample', 'upload']).default('sample'),
})
export const bannerDraftCapabilities = Object.freeze({
  imageGeneration: false, imageToVideo: false, figmaReview: false, pngDownload: true,
})
export function draftSlotValues(manifest, values, image) {
  const copy = { tag: values.caption, headline: values.headline, body: values.body, cta: values.cta }
  return Object.fromEntries(manifest.slots.map(slot => [slot.id, slot.type === 'image' ? image : copy[slot.id] ?? '']))
}
export function draftContentIssues(manifest, values, ratioIds) {
  const issues = []
  if (!ratioIds.length) issues.push('Select at least one format.')
  if (ratioIds.some(id => !manifest.ratios.some(ratio => ratio.id === id))) issues.push('Choose formats supported by this template.')
  const copy = draftSlotValues(manifest, values)
  for (const slot of manifest.slots.filter(slot => slot.type !== 'image')) {
    const label = { tag: 'Caption', headline: 'Headline', body: 'Body text', cta: 'CTA' }[slot.id] ?? slot.id
    if (slot.required && !copy[slot.id].trim()) issues.push(`${label} is required.`)
    if (copy[slot.id].length > slot.maxCharacters) issues.push(`${label} must be at most ${slot.maxCharacters} characters.`)
  }
  if (values.caption.trim() && !manifest.slots.some(slot => slot.id === 'tag')) issues.push('This template does not have a caption slot.')
  return issues
}
