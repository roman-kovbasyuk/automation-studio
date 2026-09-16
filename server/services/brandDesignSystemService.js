import { createHash, randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { PDFParse } from 'pdf-parse'
import { brandDraftSchema, brandProposalSchema } from '../../shared/contracts.js'
import { withTransaction } from '../db/pool.js'
import { createBrandDesignSystemRepository } from '../repositories/brandDesignSystemRepository.js'
import { PublicApiError } from '../routes/support.js'
import { createEmptyBrandDraft, getBrandReadiness } from '../../shared/brandDesignSystem.js'
import { BRAND_SYSTEM_POLICY } from '../policies/brandDesignSystemPolicy.js'

export { createEmptyBrandDraft } from '../../shared/brandDesignSystem.js'

function workspaceFor(actor) {
  if (!actor?.workspaceId) reject(403, 'workspace_required', 'A workspace assignment is required for brand-system access')
  return actor.workspaceId
}
const canManage = (actor) => actor?.role === 'designer' || actor?.role === 'admin'
export const BRAND_UPLOAD_LIMITS = Object.freeze({
  maxFileBytes: 5 * 1024 * 1024,
  maxSources: 30,
  maxAssets: 100,
  maxPdfPages: 200,
  maxImagePixels: 40_000_000,
  maxImageDimension: 8_192,
})

function reject(statusCode, code, message, details) {
  throw new PublicApiError(statusCode, code, message, details)
}

function requireManager(actor) {
  if (!canManage(actor)) reject(403, 'forbidden', 'Only designers and administrators can manage brand systems')
}

function requireOwnedBrand(actor, brand) {
  if (!brand) reject(404, 'not_found', 'Brand design system was not found')
  if (actor.role !== 'admin' && brand.ownerId !== actor.id) reject(404, 'not_found', 'Brand design system was not found')
}

function marketerCanReadAsset(asset) {
  const publishedAsset = asset.activeSnapshot?.assets?.find((item) => item.id === asset.id)
  return asset.brandState === 'published' && publishedAsset?.approved === true
}

function sanitizedPublishedDraft(snapshot) {
  const assets = snapshot.assets.filter((asset) => asset.approved)
  const approvedIds = new Set(assets.map((asset) => asset.id))
  const logoRoles = Object.fromEntries(Object.entries(snapshot.logoRoles).map(([role, id]) => [
    role, id === 'not_applicable' || approvedIds.has(id) ? id : null,
  ]))
  return brandDraftSchema.parse({ ...snapshot, sources: [], assets, logoRoles })
}

function publishedView(brand) {
  if (!brand?.activeVersion?.snapshot) return null
  const snapshot = sanitizedPublishedDraft(brand.activeVersion.snapshot)
  return { ...brand, draft: snapshot, activeVersion: { ...brand.activeVersion, snapshot } }
}

function assetKindAcceptsMime(kind, mimeType) {
  if (kind === 'font') return ['font/woff', 'application/font-woff', 'font/woff2', 'font/ttf', 'font/otf'].includes(mimeType)
  if (kind === 'logo' || kind === 'icon' || kind === 'illustration' || kind === 'pattern') return mimeType.startsWith('image/')
  return true
}

async function validateDraftRegistries(repository, brandId, draft) {
  const [storedAssets, storedSources] = await Promise.all([repository.listAssets(brandId), repository.listSources(brandId)])
  const assets = new Map(storedAssets.map((asset) => [asset.id, asset]))
  const sources = new Map(storedSources.map((source) => [source.id, source]))
  const duplicateAsset = new Set(draft.assets.map((asset) => asset.id)).size !== draft.assets.length
  const duplicateSource = new Set(draft.sources.map((source) => source.id)).size !== draft.sources.length
  const badAsset = draft.assets.find((asset) => {
    const stored = assets.get(asset.id)
    return !stored || stored.mimeType !== asset.mimeType || !assetKindAcceptsMime(asset.kind, stored.mimeType)
      || (asset.downloadPath && asset.downloadPath !== `/api/v1/brand-design-systems/${encodeURIComponent(brandId)}/assets/${encodeURIComponent(asset.id)}`)
  })
  const badSource = draft.sources.find((source) => {
    const stored = sources.get(source.id)
    return !stored || stored.kind !== source.kind || (stored.mimeType ?? undefined) !== (source.mimeType ?? undefined)
      || (stored.url ?? undefined) !== (source.url ?? undefined)
  })
  if (duplicateAsset || duplicateSource || badAsset || badSource) {
    reject(422, 'invalid_brand_registry', 'Draft sources and assets must reference stored records from this brand')
  }
}

async function decodeBrandFile(input) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input.data) || input.data.length % 4 !== 0) reject(400, 'invalid_brand_file', 'File data is not valid base64')
  const bytes = Buffer.from(input.data, 'base64')
  if (!bytes.length || bytes.length > BRAND_UPLOAD_LIMITS.maxFileBytes) reject(413, 'brand_file_too_large', 'Brand files must be between 1 byte and 5 MB')
  if (bytes.toString('base64') !== input.data) reject(400, 'invalid_brand_file', 'File data is not canonical base64')
  const text = input.mimeType === 'image/svg+xml' ? bytes.toString('utf8') : ''
  if (text && (!/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(text) || /<!DOCTYPE|<!ENTITY|<script|\son\w+\s*=|javascript:|<foreignObject|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(text))) {
    reject(400, 'unsafe_brand_file', 'SVG contains active or external content')
  }
  if (input.mimeType === 'application/pdf' && !bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) reject(400, 'invalid_brand_file', 'The file is not a valid PDF')
  if (input.mimeType === 'image/png' && !bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) reject(400, 'invalid_brand_file', 'The file is not a valid PNG')
  if (input.mimeType === 'image/jpeg' && !bytes.subarray(0, 2).equals(Buffer.from([0xff, 0xd8]))) reject(400, 'invalid_brand_file', 'The file is not a valid JPEG')
  if (input.mimeType === 'image/webp' && !(bytes.subarray(0, 4).equals(Buffer.from('RIFF')) && bytes.subarray(8, 12).equals(Buffer.from('WEBP')))) reject(400, 'invalid_brand_file', 'The file is not a valid WebP image')
  if (['image/png', 'image/jpeg', 'image/webp'].includes(input.mimeType)) {
    try {
      const metadata = await sharp(bytes, { animated: true, failOn: 'warning', limitInputPixels: BRAND_UPLOAD_LIMITS.maxImagePixels, pages: -1 }).metadata()
      const expected = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/webp': 'webp' }[input.mimeType]
      if (metadata.format !== expected || (metadata.pages ?? 1) !== 1 || !metadata.width || !metadata.height
        || metadata.width > BRAND_UPLOAD_LIMITS.maxImageDimension || metadata.height > BRAND_UPLOAD_LIMITS.maxImageDimension
        || metadata.width * metadata.height > BRAND_UPLOAD_LIMITS.maxImagePixels) throw new Error('invalid image dimensions')
    } catch { reject(400, 'invalid_brand_file', 'The image is corrupt, animated, or exceeds the decoded-image limits') }
  }
  if (input.mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: new Uint8Array(bytes) })
    try {
      const info = await parser.getInfo()
      if (!Number.isInteger(info.total) || info.total < 1 || info.total > BRAND_UPLOAD_LIMITS.maxPdfPages) {
        reject(400, 'invalid_brand_file', `PDF files may contain at most ${BRAND_UPLOAD_LIMITS.maxPdfPages} pages`)
      }
    } catch (error) {
      if (error instanceof PublicApiError) throw error
      reject(400, 'invalid_brand_file', 'The file is not a readable PDF')
    } finally { await parser.destroy().catch(() => {}) }
  }
  if (input.mimeType === 'application/json') {
    try { JSON.parse(bytes.toString('utf8')) } catch { reject(400, 'invalid_brand_file', 'The file is not valid JSON') }
  }
  const fontSignatures = {
    'font/woff': ['wOFF'], 'application/font-woff': ['wOFF'], 'font/woff2': ['wOF2'],
    'font/ttf': ['\u0000\u0001\u0000\u0000', 'true'], 'application/x-font-ttf': ['\u0000\u0001\u0000\u0000', 'true'],
    'font/otf': ['OTTO'], 'application/x-font-opentype': ['OTTO'],
  }
  if (fontSignatures[input.mimeType] && !fontSignatures[input.mimeType].some((signature) => bytes.subarray(0, 4).equals(Buffer.from(signature, 'binary')))) {
    reject(400, 'invalid_brand_file', 'The file does not match its declared font format')
  }
  return bytes
}

export const brandReadiness = getBrandReadiness

function createAnalysisFingerprint({ id, revision, sources, provider, model, estimatedUsd }) {
  const inputHash = createHash('sha256').update(JSON.stringify({ operation: 'analyse_materials', brandId: id,
    revision, policyVersion: BRAND_SYSTEM_POLICY.version, provider, model, sources })).digest('hex')
  return { inputHash, approvalFingerprint: createHash('sha256').update(`${inputHash}:${estimatedUsd}`).digest('hex') }
}

function applyOperations(draft, operations) {
  const next = structuredClone(draft)
  for (const operation of operations) {
    if (operation.operation === 'set_color') {
      const token = next.colors.palette.find((item) => item.id === operation.tokenId)
      if (!token) reject(422, 'invalid_proposal', `Color ${operation.tokenId} is no longer available`)
      token.value = operation.value.toUpperCase()
      token.confirmed = false
      token.evidence = { method: 'ai_suggestion' }
    } else if (operation.operation === 'scale_typography') {
      for (const value of Object.values(next.typography.scale)) {
        value.size = Math.round(value.size * operation.factor * 100) / 100
      }
    }
  }
  return brandDraftSchema.parse(next)
}

export function createBrandDesignSystemService({
  pool,
  provider,
  repositoryFactory = createBrandDesignSystemRepository,
  transaction = withTransaction,
  idGenerator = () => randomUUID(),
  assetStore,
  figmaInspector,
  onPublish = async () => {},
} = {}) {
  if (!pool) throw new TypeError('A PostgreSQL pool is required')
  const repository = () => repositoryFactory(pool)

  return Object.freeze({
    getConfig() {
      return { limits: BRAND_UPLOAD_LIMITS, provider: provider?.provider ?? 'unavailable', model: provider?.model ?? 'unavailable' }
    },
    async list({ actor }) {
      workspaceFor(actor)
      if (actor.role === 'marketer') return (await repository().listForMember(actor.id)).map(publishedView).filter(Boolean)
      const brands = await repository().list(actor.workspaceId)
      return brands.filter((brand) => actor.role === 'admin' || brand.ownerId === actor.id)
    },
    async get({ actor, id }) {
      workspaceFor(actor)
      if (actor.role === 'marketer') {
        const brand = publishedView(await repository().getForMember(id, actor.id))
        if (!brand) reject(404, 'not_found', 'Brand design system was not found')
        return brand
      }
      const brand = await repository().get(id, actor.workspaceId)
      if (!brand) reject(404, 'not_found', 'Brand design system was not found')
      if (actor.role !== 'admin' && actor.role !== 'marketer' && brand.ownerId !== actor.id) reject(404, 'not_found', 'Brand design system was not found')
      return brand
    },
    async inspectSources({ actor, id }) {
      requireManager(actor)
      const brand = await repository().get(id, workspaceFor(actor))
      requireOwnedBrand(actor, brand)
      const selectedProvider = provider?.provider ?? 'unavailable'
      const selectedModel = provider?.model ?? 'unavailable'
      const estimate = provider?.estimateWorkload
        ? provider.estimateWorkload({ sourceBytes: brand.draft.sources.reduce((sum, source) => sum + (source.byteSize ?? 0), 0) })
        : { available: false, reason: 'pricing_unavailable' }
      const { approvalFingerprint } = createAnalysisFingerprint({ id, revision: brand.revision, sources: brand.draft.sources,
        provider: selectedProvider, model: selectedModel, estimatedUsd: estimate.available ? estimate.estimatedUsd : null })
      return {
        brandId: id, revision: brand.revision, sources: brand.draft.sources,
        provider: selectedProvider, model: selectedModel,
        estimatedUsd: estimate.available ? estimate.estimatedUsd : null,
        thresholdUsd: estimate.available ? estimate.thresholdUsd : null,
        requiresApproval: Boolean(estimate.available && estimate.requiresApproval),
        approvalFingerprint: estimate.available ? approvalFingerprint : null,
        pricingAvailable: Boolean(estimate.available),
      }
    },
    async create({ actor, input }) {
      requireManager(actor)
      return repository().create({
        id: idGenerator('brand'), workspaceId: workspaceFor(actor), ownerId: actor.id,
        draft: createEmptyBrandDraft(input.name),
      })
    },
    async patchDraft({ actor, id, expectedRevision, draft }) {
      requireManager(actor)
      const parsed = brandDraftSchema.parse(draft)
      const current = await repository().get(id, workspaceFor(actor))
      requireOwnedBrand(actor, current)
      await validateDraftRegistries(repository(), id, parsed)
      return repository().patchDraft({ id, workspaceId: workspaceFor(actor), expectedRevision, draft: parsed })
    },
    async addSource({ actor, id, expectedRevision, input }) {
      requireManager(actor)
      const current = await repository().get(id, workspaceFor(actor))
      requireOwnedBrand(actor, current)
      if (current.revision !== expectedRevision) reject(409, 'revision_conflict', 'The brand draft changed. Refresh before adding this source.')
      if (current.draft.sources.length >= BRAND_UPLOAD_LIMITS.maxSources) reject(422, 'brand_source_limit', `A brand may have up to ${BRAND_UPLOAD_LIMITS.maxSources} sources`)
      const sourceId = idGenerator('source')
      let objectKey = null
      let checksum = null
      let bytes = null
      let source
      if (input.kind === 'figma') {
        const url = new URL(input.url)
        if (url.protocol !== 'https:' || !['figma.com', 'www.figma.com'].includes(url.hostname)) {
          reject(400, 'unsafe_figma_url', 'Use an HTTPS link from figma.com')
        }
        if (!figmaInspector?.inspect) {
          source = { id: sourceId, kind: 'figma', label: input.label, url: url.toString(), status: 'failed',
            error: 'Figma access is not connected. Export the relevant frames, variables, or styles and upload them instead.' }
        } else {
          try {
            await figmaInspector.inspect({ url: url.toString(), actor, signal: AbortSignal.timeout(15_000) })
            source = { id: sourceId, kind: 'figma', label: input.label, url: url.toString(), status: 'ready' }
          } catch (error) {
            source = { id: sourceId, kind: 'figma', label: input.label, url: url.toString(), status: 'failed',
              error: String(error?.message || 'Figma access could not be verified. Export materials and upload them instead.').slice(0, 500) }
          }
        }
      } else {
        if (!assetStore?.put) reject(503, 'brand_storage_unavailable', 'Brand material storage is unavailable')
        bytes = await decodeBrandFile(input)
        checksum = createHash('sha256').update(bytes).digest('hex')
        objectKey = `brands/${createHash('sha256').update(id).digest('hex')}/sources/${sourceId}`
        await assetStore.put({ objectKey, bytes, contentType: input.mimeType })
        source = { id: sourceId, kind: 'file', label: input.name, mimeType: input.mimeType, byteSize: bytes.length, status: 'ready' }
      }
      try {
        return await transaction(pool, async (client) => {
          const scoped = repositoryFactory(client)
          const brand = await scoped.getForUpdate(id, workspaceFor(actor))
          requireOwnedBrand(actor, brand)
          if (brand.revision !== expectedRevision) reject(409, 'revision_conflict', 'The brand draft changed. Refresh before adding this source.')
          await scoped.recordSource({ id: sourceId, brandId: id, kind: source.kind, label: source.label, url: source.url,
            mimeType: source.mimeType, byteSize: source.byteSize, objectKey, checksum, status: source.status, error: source.error })
          return scoped.patchDraft({ id, workspaceId: workspaceFor(actor), expectedRevision,
            draft: brandDraftSchema.parse({ ...brand.draft, sources: [...brand.draft.sources, source] }) })
        })
      } catch (error) {
        if (objectKey && assetStore?.delete) {
          try { await assetStore.delete({ objectKey }) } catch { /* Best-effort orphan cleanup. */ }
        }
        throw error
      }
    },
    async addAsset({ actor, id, expectedRevision, input }) {
      requireManager(actor)
      if (!assetStore?.put) reject(503, 'brand_storage_unavailable', 'Brand asset storage is unavailable')
      const current = await repository().get(id, workspaceFor(actor))
      requireOwnedBrand(actor, current)
      if (current.revision !== expectedRevision) reject(409, 'revision_conflict', 'The brand draft changed. Refresh before adding this asset.')
      if (current.draft.assets.length >= BRAND_UPLOAD_LIMITS.maxAssets) reject(422, 'brand_asset_limit', `A brand may have up to ${BRAND_UPLOAD_LIMITS.maxAssets} assets`)
      if (!assetKindAcceptsMime(input.kind, input.mimeType)) reject(422, 'invalid_brand_asset_kind', `A ${input.kind} asset cannot use ${input.mimeType}`)
      const assetId = idGenerator('asset')
      const bytes = await decodeBrandFile(input)
      const checksum = createHash('sha256').update(bytes).digest('hex')
      const objectKey = `brands/${createHash('sha256').update(id).digest('hex')}/assets/${assetId}`
      await assetStore.put({ objectKey, bytes, contentType: input.mimeType })
      try {
        return await transaction(pool, async (client) => {
          const scoped = repositoryFactory(client)
          const brand = await scoped.getForUpdate(id, workspaceFor(actor))
          requireOwnedBrand(actor, brand)
          if (brand.revision !== expectedRevision) reject(409, 'revision_conflict', 'The brand draft changed. Refresh before adding this asset.')
          const asset = { id: assetId, name: input.name, kind: input.kind, mimeType: input.mimeType, approved: false,
            downloadPath: `/api/v1/brand-design-systems/${encodeURIComponent(id)}/assets/${encodeURIComponent(assetId)}` }
          await scoped.recordAsset({ id: assetId, brandId: id, name: input.name, kind: input.kind, mimeType: input.mimeType,
            objectKey, byteSize: bytes.length, checksum })
          return scoped.patchDraft({ id, workspaceId: workspaceFor(actor), expectedRevision,
            draft: brandDraftSchema.parse({ ...brand.draft, assets: [...brand.draft.assets, asset] }) })
        })
      } catch (error) {
        if (assetStore?.delete) { try { await assetStore.delete({ objectKey }) } catch { /* Best-effort orphan cleanup. */ } }
        throw error
      }
    },
    async readAsset({ actor, id, assetId }) {
      let workspaceId = workspaceFor(actor)
      if (actor.role === 'marketer') {
        const accessibleBrand = await repository().getForMember(id, actor.id)
        if (!accessibleBrand) reject(404, 'not_found', 'Brand asset was not found')
        workspaceId = accessibleBrand.workspaceId
      }
      const asset = await repository().getAsset(assetId, workspaceId)
      if (!asset || asset.brandId !== id) reject(404, 'not_found', 'Brand asset was not found')
      if (actor.role === 'marketer' ? !marketerCanReadAsset(asset) : actor.role !== 'admin' && asset.ownerId !== actor.id) {
        reject(404, 'not_found', 'Brand asset was not found')
      }
      if (!assetStore?.get) reject(503, 'brand_storage_unavailable', 'Brand asset storage is unavailable')
      const stored = await assetStore.get({ objectKey: asset.objectKey, maxBytes: asset.byteSize })
      if (stored == null) reject(502, 'brand_asset_missing', 'Stored brand asset is unavailable')
      const bytes = Buffer.from(stored.buffer, stored.byteOffset, stored.byteLength)
      const checksum = createHash('sha256').update(bytes).digest('hex')
      if (bytes.length !== asset.byteSize || checksum !== asset.checksum) reject(502, 'brand_asset_integrity_failure', 'Stored brand asset failed its integrity check')
      return { ...asset, bytes }
    },
    async grantViewer({ actor, id, userId }) {
      requireManager(actor)
      const brand = await repository().get(id, workspaceFor(actor))
      requireOwnedBrand(actor, brand)
      await repository().grantMember({ brandId: id, userId })
    },
    async analyseSources({ actor, id, expectedRevision, input = {} }) {
      requireManager(actor)
      const inspectMaterials = provider?.inspectBrandMaterials ?? provider?.inspectMaterials
      if (!inspectMaterials || !provider?.estimateWorkload) {
        reject(503, 'brand_ai_unavailable', 'Brand analysis is unavailable. Continue with manual setup.')
      }
      const current = await repository().get(id, workspaceFor(actor))
      requireOwnedBrand(actor, current)
      if (current.revision !== expectedRevision) reject(409, 'revision_conflict', 'The brand draft changed. Refresh before analysing materials.')
      if (!current.draft.sources.length) reject(422, 'brand_sources_required', 'Add at least one source before analysing materials')
      const estimate = provider.estimateWorkload({ sourceBytes: current.draft.sources.reduce((sum, source) => sum + (source.byteSize ?? 0), 0) })
      if (!estimate.available) reject(503, 'brand_ai_pricing_unavailable', 'Analysis pricing is unavailable. Continue with manual setup.')
      const { inputHash, approvalFingerprint } = createAnalysisFingerprint({ id, revision: current.revision,
        sources: current.draft.sources, provider: provider.provider, model: provider.model, estimatedUsd: estimate.estimatedUsd })
      if (estimate.requiresApproval && input.approvalFingerprint !== approvalFingerprint) {
        reject(402, 'brand_cost_approval_required', `Brand analysis is estimated at $${estimate.estimatedUsd.toFixed(2)}. Approve this cost to continue.`,
          { estimatedUsd: estimate.estimatedUsd, thresholdUsd: estimate.thresholdUsd, provider: provider.provider, model: provider.model, approvalFingerprint })
      }
      const jobId = idGenerator('job')
      await repository().createAIJob({ id: jobId, brandId: id, operation: 'analyse_materials', inputRevision: current.revision,
        inputHash, policyVersion: BRAND_SYSTEM_POLICY.version, provider: provider.provider, model: provider.model,
        estimatedUsd: estimate.estimatedUsd, approvalFingerprint: estimate.requiresApproval ? approvalFingerprint : null, createdBy: actor.id })
      try {
        const analysed = await inspectMaterials({ draft: current.draft, sources: current.draft.sources,
          policyVersion: BRAND_SYSTEM_POLICY.version, policyInstruction: BRAND_SYSTEM_POLICY.instruction }, AbortSignal.timeout(60_000))
        const analysedDraft = brandDraftSchema.parse(analysed.draft)
        await validateDraftRegistries(repository(), id, analysedDraft)
        const updated = await repository().patchDraft({ id, workspaceId: workspaceFor(actor), expectedRevision, draft: analysedDraft })
        await repository().resolveAIJob({ id: jobId, status: 'succeeded', usage: analysed.usage ?? {} })
        return updated
      } catch (error) {
        try {
          const failedDraft = brandDraftSchema.parse({
            ...current.draft,
            sources: current.draft.sources.map((source) => ({
              ...source,
              status: 'failed',
              error: String(error?.message || 'Material analysis failed').slice(0, 500),
            })),
          })
          await repository().patchDraft({ id, workspaceId: workspaceFor(actor), expectedRevision: current.revision, draft: failedDraft })
        } catch { /* Preserve the original provider error if the failure marker cannot be saved. */ }
        await repository().resolveAIJob({ id: jobId, status: error?.name === 'AbortError' ? 'cancelled' : 'failed', errorCode: error?.code ?? 'brand_ai_failed' })
        throw error
      }
    },
    async publish({ actor, id, expectedRevision, idempotencyKey }) {
      requireManager(actor)
      return transaction(pool, async (client) => {
        const scoped = repositoryFactory(client)
        const brand = await scoped.getForUpdate(id, workspaceFor(actor))
        requireOwnedBrand(actor, brand)
        const replay = await scoped.findPublication(id, idempotencyKey)
        if (replay) return replay
        if (brand.revision !== expectedRevision) reject(409, 'revision_conflict', 'The brand draft changed. Refresh before publishing.')
        await validateDraftRegistries(scoped, id, brand.draft)
        const errors = brandReadiness(brand.draft)
        if (errors.length) reject(422, 'brand_not_ready', 'Complete the required brand fields before publishing', errors)
        const versions = await scoped.listVersions(id)
        const versionId = idGenerator('version')
        const published = await scoped.publish({
          id, workspaceId: workspaceFor(actor), versionId, versionNumber: (versions[0]?.versionNumber ?? 0) + 1,
          snapshot: brand.draft, publishedBy: actor.id, expectedRevision,
        })
        await onPublish({ client, brand: published, actor })
        await scoped.recordPublication({ id, key: idempotencyKey, versionId })
        return published
      })
    },
    async listVersions({ actor, id }) {
      requireManager(actor)
      const brand = await repository().get(id, workspaceFor(actor))
      requireOwnedBrand(actor, brand)
      return repository().listVersions(id)
    },
    async restoreVersion({ actor, id, versionId, expectedRevision }) {
      requireManager(actor)
      return transaction(pool, async (client) => {
        const scoped = repositoryFactory(client)
        const brand = await scoped.getForUpdate(id, workspaceFor(actor))
        requireOwnedBrand(actor, brand)
        if (brand.revision !== expectedRevision) reject(409, 'revision_conflict', 'The brand draft changed. Refresh before restoring this version.')
        const version = await scoped.getVersion(versionId, id)
        if (!version) reject(404, 'not_found', 'Brand version was not found')
        const snapshot = brandDraftSchema.parse(version.snapshot)
        await validateDraftRegistries(scoped, id, snapshot)
        const versions = await scoped.listVersions(id)
        const published = await scoped.publish({ id, workspaceId: workspaceFor(actor), expectedRevision,
          versionId: idGenerator('version'), versionNumber: (versions[0]?.versionNumber ?? 0) + 1,
          snapshot, publishedBy: actor.id })
        await onPublish({ client, brand: published, actor })
        return published
      })
    },
    async proposeChange({ actor, id, prompt, approvalFingerprint }) {
      requireManager(actor)
      const brand = await repository().get(id, workspaceFor(actor))
      requireOwnedBrand(actor, brand)
      if (!provider?.proposeChanges || !provider?.estimateWorkload) reject(503, 'brand_ai_unavailable', 'Brand AI is unavailable. Continue with manual editing.')
      const estimate = provider.estimateWorkload({ sourceBytes: Buffer.byteLength(prompt, 'utf8') })
      if (!estimate.available) reject(503, 'brand_ai_pricing_unavailable', 'Brand AI pricing is unavailable. Continue with manual editing.')
      const inputHash = createHash('sha256').update(JSON.stringify({ operation: 'propose_change', brandId: id,
        revision: brand.revision, policyVersion: BRAND_SYSTEM_POLICY.version, provider: provider.provider, model: provider.model, prompt })).digest('hex')
      const requiredFingerprint = createHash('sha256').update(`${inputHash}:${estimate.estimatedUsd}`).digest('hex')
      if (estimate.requiresApproval && approvalFingerprint !== requiredFingerprint) {
        reject(402, 'brand_cost_approval_required', `This change is estimated at $${estimate.estimatedUsd.toFixed(2)}. Approve this cost to continue.`,
          { estimatedUsd: estimate.estimatedUsd, thresholdUsd: estimate.thresholdUsd, provider: provider.provider,
            model: provider.model, approvalFingerprint: requiredFingerprint })
      }
      const jobId = idGenerator('job')
      await repository().createAIJob({ id: jobId, brandId: id, operation: 'propose_change', inputRevision: brand.revision,
        inputHash, policyVersion: BRAND_SYSTEM_POLICY.version, provider: provider.provider, model: provider.model,
        estimatedUsd: estimate.estimatedUsd, approvalFingerprint: estimate.requiresApproval ? requiredFingerprint : null, createdBy: actor.id })
      try {
        const result = await provider.proposeChanges({ draft: brand.draft, prompt,
          policyVersion: BRAND_SYSTEM_POLICY.version, policyInstruction: BRAND_SYSTEM_POLICY.instruction }, AbortSignal.timeout(30_000))
        const proposal = brandProposalSchema.omit({ id: true, brandId: true, baseRevision: true, prompt: true, state: true, createdAt: true }).parse(result)
        const created = await repository().createProposal({
          id: idGenerator('proposal'), brandId: id, baseRevision: brand.revision, prompt,
          operations: proposal.operations, unchanged: proposal.unchanged, createdBy: actor.id,
        })
        await repository().resolveAIJob({ id: jobId, status: 'succeeded', usage: result.usage ?? {} })
        return created
      } catch (error) {
        await repository().resolveAIJob({ id: jobId, status: error?.name === 'AbortError' ? 'cancelled' : 'failed', errorCode: error?.code ?? 'brand_ai_failed' })
        throw error
      }
    },
    async applyProposal({ actor, id, proposalId, expectedRevision }) {
      requireManager(actor)
      return transaction(pool, async (client) => {
        const scoped = repositoryFactory(client)
        const brand = await scoped.getForUpdate(id, workspaceFor(actor))
        requireOwnedBrand(actor, brand)
        const proposal = await scoped.getProposal(proposalId, id)
        if (!proposal || proposal.state !== 'proposed') reject(404, 'not_found', 'Change proposal was not found')
        if (brand.revision !== expectedRevision || proposal.baseRevision !== brand.revision) {
          reject(409, 'proposal_stale', 'The draft changed after this proposal. Create a new proposal.')
        }
        const updated = await scoped.patchDraft({ id, workspaceId: workspaceFor(actor), expectedRevision, draft: applyOperations(brand.draft, proposal.operations) })
        await scoped.resolveProposal({ id: proposalId, brandId: id, state: 'applied' })
        return updated
      })
    },
    async discardProposal({ actor, id, proposalId }) {
      requireManager(actor)
      const brand = await repository().get(id, workspaceFor(actor))
      requireOwnedBrand(actor, brand)
      const proposal = await repository().resolveProposal({ id: proposalId, brandId: id, state: 'discarded' })
      if (!proposal) reject(404, 'not_found', 'Change proposal was not found')
      return proposal
    },
  })
}
