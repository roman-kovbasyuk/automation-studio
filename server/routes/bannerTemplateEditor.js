import { ZipArchive } from 'archiver'
import { bannerDraftExportSchema, bannerDraftActionSchema, bannerDraftCapabilities, draftContentIssues, draftSlotValues } from '../../shared/bannerTemplateDraft.js'
import { renderComposition, RendererError } from '../rendering/inProcessRenderer.js'
import { parse, notFound, PublicApiError } from './support.js'

// Draft-only adapter. No campaign, review, approval or delivery state is changed.
export function registerBannerTemplateEditorRoutes(app, { requireRole, workflowService, render = renderComposition }) {
  const authorize = requireRole('marketer', 'designer', 'admin')
  async function resolve(request, input) {
    const accessible = await workflowService.listTemplates({ actor: request.actor })
    if (!accessible.some(item => item.id === input.templateId)) return notFound('Template')
    const template = await workflowService.getTemplateVersion({ actor: request.actor, templateId: input.templateId, version: input.templateVersion })
    if (!template) return notFound('Template version')
    const issues = draftContentIssues(template.manifest, input.values, input.ratioIds)
    if (issues.length) throw new PublicApiError(400, 'invalid_draft', issues.join(' '))
    return template
  }
  app.get('/api/v1/banner-template-editor/capabilities', { preHandler: authorize }, async () => ({ capabilities: bannerDraftCapabilities }))
  app.post('/api/v1/banner-template-editor/actions', { preHandler: authorize }, async request => {
    const input = parse(bannerDraftActionSchema, request.body)
    await resolve(request, input)
    if (input.action === 'image-to-video' && input.imageSource !== 'upload') {
      throw new PublicApiError(400, 'image_required', 'Upload an image before converting it to video.')
    }
    throw new PublicApiError(501, 'template_action_not_connected', 'This action is not connected in the template editor yet. It is available in the campaign creation flow.')
  })
  app.post('/api/v1/banner-template-editor/exports', { preHandler: authorize, bodyLimit: 12 * 1024 * 1024 }, async (request, reply) => {
    const input = parse(bannerDraftExportSchema, request.body)
    const template = await resolve(request, input)
    const image = { bytes: Buffer.from(input.image.base64, 'base64'), mimeType: input.image.mimeType }
    if (image.bytes.length > 8 * 1024 * 1024) throw new PublicApiError(400, 'image_too_large', 'Use an image under 8 MB.')
    const entries = []
    // Render serially to bound memory; validate every output before returning an archive.
    try {
      for (const ratio of input.ratioIds) {
        const result = await render({ manifest: template.manifest, slots: draftSlotValues(template.manifest, input.values, image), ratio })
        const size = template.manifest.ratios.find(item => item.id === ratio)
        entries.push({ name: `banner-${entries.length + 1}-${size.width}x${size.height}.png`, bytes: result.bytes })
      }
    } catch (error) {
      if (error instanceof RendererError) throw new PublicApiError(400, error.code, error.message)
      throw error
    }
    const zip = new ZipArchive({ store: true })
    const chunks = []
    const complete = new Promise((resolve, reject) => {
      zip.on('data', chunk => chunks.push(chunk))
      zip.on('error', reject)
      zip.on('end', () => resolve(Buffer.concat(chunks)))
    })
    for (const entry of entries) zip.append(entry.bytes, { name: entry.name })
    zip.append(JSON.stringify({ type: 'banner-template-draft', status: 'not-reviewed', templateId: input.templateId,
      templateVersion: input.templateVersion, values: input.values, ratioIds: input.ratioIds }, null, 2), { name: 'draft.json' })
    await zip.finalize()
    return reply.header('Cache-Control', 'no-store').header('Content-Disposition', 'attachment; filename="banner-drafts.zip"')
      .type('application/zip').send(await complete)
  })
}
