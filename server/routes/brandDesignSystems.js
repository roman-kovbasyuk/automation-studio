import { z } from 'zod'
import {
  brandDesignSystemListResponseSchema,
  templateListResponseSchema,
  brandDesignSystemConfigResponseSchema,
  brandDesignSystemResponseSchema,
  brandProposalResponseSchema,
  brandVersionListResponseSchema,
  brandSourceInspectionResponseSchema,
  addBrandSourceRequestSchema,
  addBrandAssetRequestSchema,
  analyseBrandSourcesRequestSchema,
  createBrandDesignSystemRequestSchema,
  createBrandProposalRequestSchema,
  patchBrandDraftRequestSchema,
  publishBrandDesignSystemRequestSchema,
  restoreBrandVersionRequestSchema,
  grantBrandViewerRequestSchema,
} from '../../shared/contracts.js'
import { parse, parseIdempotencyKey, parseIfMatch, setRevisionEtag, strictResponse } from './support.js'

const brandParamsSchema = z.strictObject({ brandId: z.string().trim().min(1) })
const proposalParamsSchema = z.strictObject({ brandId: z.string().trim().min(1), proposalId: z.string().trim().min(1) })
const versionParamsSchema = z.strictObject({ brandId: z.string().trim().min(1), versionId: z.string().trim().min(1) })
const assetParamsSchema = z.strictObject({ brandId: z.string().trim().min(1), assetId: z.string().trim().min(1) })
const emptySchema = z.strictObject({})
const editors = ['designer', 'admin']

export function registerBrandDesignSystemRoutes(app, { requireRole, brandDesignSystemService, templateBrandService }) {
  if (templateBrandService) app.post('/api/v1/brand-design-systems/:brandId/templates', { preHandler: requireRole('admin') }, async request => {
    const { brandId } = parse(brandParamsSchema, request.params)
    const { templateIds } = parse(z.strictObject({ templateIds: z.array(z.string().trim().min(1)).min(1).max(50) }), request.body)
    return strictResponse(templateListResponseSchema, request, { templates: await templateBrandService.assign({ actor: request.actor, brandId, templateIds }) })
  })
  app.get('/api/v1/brand-design-systems/config', { preHandler: requireRole() }, async (request) => strictResponse(
    brandDesignSystemConfigResponseSchema, request, brandDesignSystemService.getConfig(),
  ))
  app.get('/api/v1/brand-design-systems', { preHandler: requireRole() }, async (request) => {
    const brands = await brandDesignSystemService.list({ actor: request.actor })
    return strictResponse(brandDesignSystemListResponseSchema, request, { brands })
  })

  app.post('/api/v1/brand-design-systems', { preHandler: requireRole(...editors) }, async (request, reply) => {
    const input = parse(createBrandDesignSystemRequestSchema, request.body)
    reply.code(201)
    return setRevisionEtag(reply, strictResponse(brandDesignSystemResponseSchema, request,
      await brandDesignSystemService.create({ actor: request.actor, input })))
  })

  app.get('/api/v1/brand-design-systems/:brandId', { preHandler: requireRole() }, async (request, reply) => {
    const { brandId } = parse(brandParamsSchema, request.params)
    return setRevisionEtag(reply, strictResponse(brandDesignSystemResponseSchema, request,
      await brandDesignSystemService.get({ actor: request.actor, id: brandId })))
  })

  app.post('/api/v1/brand-design-systems/:brandId/viewers', { preHandler: requireRole(...editors) }, async (request, reply) => {
    const { brandId } = parse(brandParamsSchema, request.params)
    const { userId } = parse(grantBrandViewerRequestSchema, request.body)
    await brandDesignSystemService.grantViewer({ actor: request.actor, id: brandId, userId })
    return reply.code(204).send()
  })

  app.get('/api/v1/brand-design-systems/:brandId/sources/inspect', { preHandler: requireRole(...editors) }, async (request) => {
    const { brandId } = parse(brandParamsSchema, request.params)
    return strictResponse(brandSourceInspectionResponseSchema, request,
      await brandDesignSystemService.inspectSources({ actor: request.actor, id: brandId }))
  })

  app.patch('/api/v1/brand-design-systems/:brandId/draft', { preHandler: requireRole(...editors) }, async (request, reply) => {
    const { brandId } = parse(brandParamsSchema, request.params)
    const { draft } = parse(patchBrandDraftRequestSchema, request.body)
    return setRevisionEtag(reply, strictResponse(brandDesignSystemResponseSchema, request,
      await brandDesignSystemService.patchDraft({ actor: request.actor, id: brandId, expectedRevision: parseIfMatch(request), draft })))
  })

  app.post('/api/v1/brand-design-systems/:brandId/sources', {
    preHandler: requireRole(...editors),
    bodyLimit: 7_100_000,
  }, async (request, reply) => {
    const { brandId } = parse(brandParamsSchema, request.params)
    const input = parse(addBrandSourceRequestSchema, request.body)
    return setRevisionEtag(reply, strictResponse(brandDesignSystemResponseSchema, request,
      await brandDesignSystemService.addSource({ actor: request.actor, id: brandId, expectedRevision: parseIfMatch(request), input })))
  })

  app.post('/api/v1/brand-design-systems/:brandId/analyse', { preHandler: requireRole(...editors) }, async (request, reply) => {
    const { brandId } = parse(brandParamsSchema, request.params)
    const input = parse(analyseBrandSourcesRequestSchema, request.body ?? {})
    return setRevisionEtag(reply, strictResponse(brandDesignSystemResponseSchema, request,
      await brandDesignSystemService.analyseSources({ actor: request.actor, id: brandId, expectedRevision: parseIfMatch(request), input })))
  })

  app.post('/api/v1/brand-design-systems/:brandId/assets', {
    preHandler: requireRole(...editors),
    bodyLimit: 7_100_000,
  }, async (request, reply) => {
    const { brandId } = parse(brandParamsSchema, request.params)
    const input = parse(addBrandAssetRequestSchema, request.body)
    return setRevisionEtag(reply, strictResponse(brandDesignSystemResponseSchema, request,
      await brandDesignSystemService.addAsset({ actor: request.actor, id: brandId, expectedRevision: parseIfMatch(request), input })))
  })

  app.get('/api/v1/brand-design-systems/:brandId/assets/:assetId', { preHandler: requireRole() }, async (request, reply) => {
    const { brandId, assetId } = parse(assetParamsSchema, request.params)
    const asset = await brandDesignSystemService.readAsset({ actor: request.actor, id: brandId, assetId })
    reply.header('Content-Type', asset.mimeType)
    reply.header('Content-Length', String(asset.byteSize))
    reply.header('ETag', `"${asset.checksum}"`)
    reply.header('Cache-Control', 'private, max-age=31536000, immutable')
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('Content-Disposition', `inline; filename="${asset.name.replace(/[^A-Za-z0-9._-]/g, '_')}"`)
    return reply.send(asset.bytes)
  })

  app.post('/api/v1/brand-design-systems/:brandId/publish', { preHandler: requireRole(...editors) }, async (request, reply) => {
    const { brandId } = parse(brandParamsSchema, request.params)
    parse(publishBrandDesignSystemRequestSchema, request.body ?? {})
    return setRevisionEtag(reply, strictResponse(brandDesignSystemResponseSchema, request,
      await brandDesignSystemService.publish({ actor: request.actor, id: brandId, expectedRevision: parseIfMatch(request), idempotencyKey: parseIdempotencyKey(request) })))
  })

  app.get('/api/v1/brand-design-systems/:brandId/versions', { preHandler: requireRole(...editors) }, async (request) => {
    const { brandId } = parse(brandParamsSchema, request.params)
    return strictResponse(brandVersionListResponseSchema, request,
      { versions: await brandDesignSystemService.listVersions({ actor: request.actor, id: brandId }) })
  })

  app.post('/api/v1/brand-design-systems/:brandId/versions/:versionId/restore', { preHandler: requireRole(...editors) }, async (request, reply) => {
    const { brandId, versionId } = parse(versionParamsSchema, request.params)
    parse(restoreBrandVersionRequestSchema, request.body ?? {})
    return setRevisionEtag(reply, strictResponse(brandDesignSystemResponseSchema, request,
      await brandDesignSystemService.restoreVersion({ actor: request.actor, id: brandId, versionId, expectedRevision: parseIfMatch(request) })))
  })

  app.post('/api/v1/brand-design-systems/:brandId/proposals', { preHandler: requireRole(...editors) }, async (request) => {
    const { brandId } = parse(brandParamsSchema, request.params)
    const { prompt, approvalFingerprint } = parse(createBrandProposalRequestSchema, request.body)
    return strictResponse(brandProposalResponseSchema, request, { proposal: await brandDesignSystemService.proposeChange({ actor: request.actor, id: brandId, prompt, approvalFingerprint }) })
  })

  app.post('/api/v1/brand-design-systems/:brandId/proposals/:proposalId/apply', { preHandler: requireRole(...editors) }, async (request, reply) => {
    const { brandId, proposalId } = parse(proposalParamsSchema, request.params)
    parse(emptySchema, request.body ?? {})
    return setRevisionEtag(reply, strictResponse(brandDesignSystemResponseSchema, request,
      await brandDesignSystemService.applyProposal({ actor: request.actor, id: brandId, proposalId, expectedRevision: parseIfMatch(request) })))
  })

  app.post('/api/v1/brand-design-systems/:brandId/proposals/:proposalId/discard', { preHandler: requireRole(...editors) }, async (request) => {
    const { brandId, proposalId } = parse(proposalParamsSchema, request.params)
    parse(emptySchema, request.body ?? {})
    return strictResponse(brandProposalResponseSchema, request,
      { proposal: await brandDesignSystemService.discardProposal({ actor: request.actor, id: brandId, proposalId }) })
  })
}
