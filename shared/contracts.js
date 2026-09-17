import { projectTypes } from './projectTypes.js'
import { videoAssetSchema, reviewVideoSchema } from './videoContracts.js'
import { z } from 'zod'
import { hashCanonical } from './canonicalJson.js'
import { templateManifestSchema } from './templateManifest.js'
import { briefAnalysisSchema } from './briefAnalysis.js'
import { briefingStateSchema, briefingCreateSchema, analysisSourceSchema, authoredCopyVariantSchema } from './briefingContracts.js'
import { MAX_BRIEF_UPLOAD_BASE64 } from './briefUploadLimits.js'
export { briefAnalysisSchema } from './briefAnalysis.js'

const nonEmptyString = z.string().trim().min(1)
const nullableAssetId = nonEmptyString.nullable().optional()
const timestampSchema = z.union([
  z.date().transform((value) => value.toISOString()),
  z.string().datetime({ offset: true }),
])
const requestIdSchema = nonEmptyString.max(128)

export const roleSchema = z.enum(['marketer', 'designer', 'admin'])

export const campaignStatusSchema = z.enum([
  'draft',
  'copy_ready',
  'direction_selected',
  'composed',
  'in_review',
  'changes_requested',
  'ready',
  'approved',
  'delivered',
])

export const reviewStatusSchema = z.enum([
  'in_review',
  'changes_requested',
  'ready',
  'approved',
  'delivered',
  'superseded',
])

export const assetHashSchema = z.string().regex(/^[a-f0-9]{64}$/)

const briefFields = {
  product: z.string().trim().max(200).default(''),
  audience: z.string().trim().max(500).default(''),
  objective: z.string().trim().max(500).default(''),
  offer: z.string().trim().max(500).default(''),
  locale: z.string().trim().min(1).max(35).default('auto'),
  notes: z.string().trim().max(20_000).default(''),
  analysis: briefAnalysisSchema.nullable().optional(),
}
const hasBriefInput = brief => brief.briefing?.schemaVersion === 2 || brief.notes.length > 0
  || (brief.product.length > 0 && brief.audience.length > 0 && brief.objective.length > 0)
export const briefSchema = z.strictObject({...briefFields, briefing:briefingStateSchema.optional()}).refine(
  hasBriefInput,
  { message: 'Provide campaign notes or the product, audience, and objective fields.' },
)
const briefCreateInputSchema = z.strictObject({...briefFields,briefing:briefingCreateSchema.optional()}).refine(hasBriefInput,'Provide campaign input.')
// Whether an empty raw brief is valid depends on the persisted source-backed
// state. The service validates the merged brief, never client-owned evidence.
const briefPatchInputSchema = z.strictObject(briefFields)

export const projectTypeSchema = z.enum(projectTypes)

export const createCampaignRequestSchema = z.strictObject({
  projectType: projectTypeSchema.default('banners'),
  title: nonEmptyString.max(200),
  brief: briefCreateInputSchema,
})

export const extractBriefFileRequestSchema = z.strictObject({
  name: nonEmptyString.max(255),
  mimeType: nonEmptyString.max(200),
  data: z.string().max(MAX_BRIEF_UPLOAD_BASE64),
})

export const extractBriefFileResponseSchema = z.strictObject({
  text: nonEmptyString.max(20_000),
  requestId: requestIdSchema,
})

export const campaignPatchRequestSchema = z.strictObject({
  title: nonEmptyString.max(200).optional(),
  brief: briefPatchInputSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one editable field is required')

const persistedCampaignFields = {
  projectType: projectTypeSchema.default('banners'),
  id: nonEmptyString,
  title: nonEmptyString.max(200),
  brief: briefSchema,
  status: campaignStatusSchema,
  revision: z.number().int().nonnegative(),
  selectedCopyId: nonEmptyString.nullable(),
  selectedDirectionId: nonEmptyString.nullable(),
  compositionId: nonEmptyString.nullable(),
  currentVersionNumber: z.number().int().nonnegative(),
  openVersionId: nonEmptyString.nullable(),
  createdBy: nonEmptyString,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  archivedAt: timestampSchema.nullable(),
}

export const campaignRecordSchema = z.strictObject(persistedCampaignFields)

export const campaignResponseSchema = z.strictObject({
  ...persistedCampaignFields,
  requestId: requestIdSchema,
})

export const campaignListResponseSchema = z.strictObject({
  campaigns: z.array(campaignRecordSchema),
  requestId: requestIdSchema,
})

export const createInvitationRequestSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email().max(320),
  role: roleSchema,
})

const invitationFields = {
  id: nonEmptyString,
  email: z.string().email(),
  role: roleSchema,
  invitedBy: nonEmptyString,
  acceptedUserId: nonEmptyString.nullable(),
  expiresAt: timestampSchema,
  acceptedAt: timestampSchema.nullable(),
  revokedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
}

export const invitationResponseSchema = z.strictObject({
  ...invitationFields,
  requestId: requestIdSchema,
})

export const userResponseSchema = z.strictObject({
  id: nonEmptyString,
  email: z.string().email(),
  firebaseUid: nonEmptyString.nullable(),
  role: roleSchema,
  displayName: nonEmptyString,
  disabled: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  requestId: requestIdSchema,
})

export const sessionResponseSchema = z.strictObject({
  id: nonEmptyString,
  email: z.string().email(),
  role: roleSchema,
  displayName: nonEmptyString,
  requestId: requestIdSchema,
})

export const createTemplateVersionRequestSchema = z.strictObject({
  id: nonEmptyString.max(200),
  version: nonEmptyString.max(100),
  name: nonEmptyString.max(200),
  manifest: templateManifestSchema,
})

const templateVersionFields = {
  id: nonEmptyString,
  version: nonEmptyString,
  name: nonEmptyString,
  manifest: templateManifestSchema,
  manifestHash: assetHashSchema,
  createdBy: nonEmptyString,
  createdAt: timestampSchema,
}

export const templateVersionResponseSchema = z.strictObject({
  ...templateVersionFields,
  requestId: requestIdSchema,
})

export const templateListResponseSchema = z.strictObject({
  templates: z.array(z.strictObject(templateVersionFields)),
  requestId: requestIdSchema,
})

const settingsFields = {
  provider: z.enum(['mock', 'gemini', 'anthropic', 'openai', 'openrouter']),
  model: nonEmptyString.max(200),
  region: nonEmptyString.max(100),
  dailyBudgetMicrounits: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  perStepRegenerationLimit: z.number().int().nonnegative(),
  generationDisabled: z.boolean(),
}

export const settingsPatchRequestSchema = z.strictObject({
  provider: settingsFields.provider.optional(),
  model: settingsFields.model.optional(),
  region: settingsFields.region.optional(),
  dailyBudgetMicrounits: settingsFields.dailyBudgetMicrounits.optional(),
  perStepRegenerationLimit: settingsFields.perStepRegenerationLimit.optional(),
  generationDisabled: settingsFields.generationDisabled.optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one setting is required')

export const settingsResponseSchema = z.strictObject({
  ...settingsFields,
  revision: z.number().int().nonnegative(),
  updatedBy: nonEmptyString.nullable(),
  updatedAt: timestampSchema,
  requestId: requestIdSchema,
})

export const personalAiProviderSchema = z.enum(['anthropic', 'openai', 'google', 'openrouter'])
export const personalAiConnectionRequestSchema = z.strictObject({
  provider: personalAiProviderSchema,
  apiKey: z.string().trim().min(10).max(500),
})
export const personalAiDefaultsRequestSchema = z.strictObject({
  text: z.strictObject({ provider: personalAiProviderSchema, model: nonEmptyString.max(200) }).nullable().optional(),
  textSecondary: z.strictObject({ provider: personalAiProviderSchema, model: nonEmptyString.max(200) }).nullable().optional(),
  image: z.strictObject({ provider: z.enum(['google', 'openai']), model: nonEmptyString.max(200) }).nullable().optional(),
  imageSecondary: z.strictObject({ provider: z.enum(['google', 'openai']), model: nonEmptyString.max(200) }).nullable().optional(),
}).refine(value => Object.keys(value).length > 0, 'At least one default is required')

export const personalIntegrationPlatformSchema = z.enum(['slack', 'discord'])
export const personalIntegrationRequestSchema = z.strictObject({
  destination: nonEmptyString.max(200),
  webhookUrl: z.string().trim().url().max(2_000),
  secret: z.string().trim().min(1).max(2_000),
})
export const notificationPreferencesRequestSchema = z.strictObject({
  slack: z.strictObject({ enabled: z.boolean() }).optional(),
  discord: z.strictObject({ enabled: z.boolean() }).optional(),
  projectScope: z.enum(['all', 'selected']).optional(),
  selectedProjectIds: z.array(nonEmptyString.max(200)).max(100).optional(),
  events: z.strictObject({
    anyProjectChange: z.boolean().optional(),
    newImageGenerations: z.boolean().optional(),
    newVideoGenerations: z.boolean().optional(),
    approvalStatusChanged: z.boolean().optional(),
  }).optional(),
  includeOwnChanges: z.boolean().optional(),
  digestInterval: z.enum(['immediate', 'hourly']).optional(),
  quietHours: z.record(z.string(), z.unknown()).optional(),
}).refine(value => Object.keys(value).length > 0, 'At least one notification setting is required')

export const apiErrorResponseSchema = z.strictObject({
  code: nonEmptyString,
  message: nonEmptyString,
  details: z.unknown().optional(),
  requestId: requestIdSchema,
})

export const copyVariantSchema = z.strictObject({
  id: nonEmptyString,
  headline: nonEmptyString.max(160),
  body: nonEmptyString.max(500),
  offer: z.string().trim().max(200),
  cta: nonEmptyString.max(80),
  visualPrompt: nonEmptyString.max(2_000),
})

export const copyEditRequestSchema = copyVariantSchema.pick({ headline: true, body: true, offer: true, cta: true })
// Persisted/user-authored content is not a generated-output contract.
export const campaignCopyVariantSchema=z.union([copyVariantSchema,authoredCopyVariantSchema])

export const generatedBannerCopySchema = z.strictObject({
  id: nonEmptyString,
  headline: nonEmptyString.max(80),
  body: nonEmptyString.max(160),
  offer: z.string().trim().max(40).default(''),
  cta: nonEmptyString.max(24),
  visualPrompt: nonEmptyString.max(2_000),
})

export const visualDirectionSchema = z.strictObject({
  id: nonEmptyString,
  title: nonEmptyString.max(160),
  prompt: z.string().max(2_000), // Uploaded-only directions have no generated prompt.
  status: z.enum(['pending', 'ready', 'blocked', 'failed']),
  previewAssetId: nullableAssetId,
})

export const visualContextSchema = z.strictObject({
  tags: z.array(nonEmptyString.max(60)).max(12).refine(tags => new Set(tags).size === tags.length, 'Visual context tags must be unique'),
  note: z.string().trim().max(1_000),
})

const compositionValidationSchema = z.strictObject({
  valid: z.boolean(),
  errors: z.array(z.string()),
})

export const bannerDesignSelectionSchema = z.strictObject({
  templateId: nonEmptyString,
  templateVersion: nonEmptyString,
  copySetId: nonEmptyString,
  copyId: nonEmptyString,
  directionId: nonEmptyString,
})

export const bannerDesignSchema = bannerDesignSelectionSchema.extend({
  id: nonEmptyString,
  slotValues: z.record(z.string(), z.string()),
  validation: compositionValidationSchema,
})

export const saveBannerBatchRequestSchema = z.strictObject({
  designs: z.array(bannerDesignSelectionSchema).min(1).refine(
    values => new Set(values.map(value => hashCanonical(value))).size === values.length,
    'Design selections must be unique',
  ),
  ratioIds: z.array(nonEmptyString).min(1).refine(values => new Set(values).size === values.length, 'Ratio ids must be unique'),
})

export const compositionSchema = z.strictObject({
  id: nonEmptyString,
  templateId: nonEmptyString,
  templateVersion: nonEmptyString,
  ratioIds: z.array(nonEmptyString).min(1),
  slotValues: z.record(z.string(), z.string()),
  validation: compositionValidationSchema,
  stale: z.boolean(),
  designs: z.array(bannerDesignSchema).min(1).optional(),
})

export const saveCompositionRequestSchema = z.strictObject({
  templateId: nonEmptyString,
  templateVersion: nonEmptyString,
  ratioIds: z.array(nonEmptyString).min(1).refine((values) => new Set(values).size === values.length, 'Ratio ids must be unique'),
  slotValues: z.record(z.string(), z.string()),
})

export const assetReferenceSchema = z.strictObject({
  id: nonEmptyString,
  kind: z.enum(['direction', 'final_image', 'review_png', 'manifest', 'delivery_zip', 'video']),
  sha256: assetHashSchema,
})

export const campaignVersionSnapshotSchema = z.strictObject({
  videos: z.array(reviewVideoSchema).min(1).max(3).optional(),
  selectedCopy: campaignCopyVariantSchema,
  selectedDirection: visualDirectionSchema,
  composition: compositionSchema,
  assets: z.array(assetReferenceSchema),
  templateManifest: templateManifestSchema,
  templateManifestHash: assetHashSchema,
  designs: z.array(z.strictObject({
    id: nonEmptyString,
    selectedCopy: campaignCopyVariantSchema,
    selectedDirection: visualDirectionSchema,
    templateManifest: templateManifestSchema,
    templateManifestHash: assetHashSchema,
  })).min(1).optional(),
}).superRefine((snapshot, context) => {
  const videoReferences = snapshot.assets.filter(asset => asset.kind === 'video')
  const videos = snapshot.videos ?? []
  if (videoReferences.length !== videos.length || new Set(videos.map(video => video.id)).size !== videos.length
    || videos.some(video => videoReferences.filter(asset => asset.id === video.id && asset.sha256 === video.sha256).length !== 1)) {
    context.addIssue({ code: 'custom', path: ['videos'], message: 'Every selected video requires one exact immutable asset reference.' })
  }

  if (snapshot.composition.designs) {
    if (!snapshot.designs || snapshot.designs.length !== snapshot.composition.designs.length) {
      context.addIssue({ code: 'custom', path: ['designs'], message: 'Every batch design requires an immutable source snapshot.' })
    } else for (const [index, design] of snapshot.designs.entries()) {
      const selection = snapshot.composition.designs[index]
      if (design.id !== selection.id || design.selectedCopy.id !== selection.copyId
        || design.selectedDirection.id !== selection.directionId
        || design.templateManifest.id !== selection.templateId || design.templateManifest.version !== selection.templateVersion
        || design.templateManifestHash !== hashCanonical(design.templateManifest)) {
        context.addIssue({ code: 'custom', path: ['designs', index], message: 'Batch design sources must match their immutable selection.' })
      }
      const previewId = design.selectedDirection.previewAssetId
      const source = snapshot.assets.filter(asset => asset.id === previewId)
      if (!previewId || source.length !== 1 || !['direction', 'final_image'].includes(source[0]?.kind)) {
        context.addIssue({ code: 'custom', path: ['designs', index, 'selectedDirection', 'previewAssetId'], message: 'Every design preview requires one immutable source asset.' })
      }
      for (const slot of design.templateManifest.slots.filter(slot => slot.type === 'image')) {
        const assetId = selection.slotValues[slot.id]
        if ((slot.required || assetId) && assetId !== previewId) {
          context.addIssue({ code: 'custom', path: ['composition', 'designs', index, 'slotValues', slot.id], message: 'Design image slots must match their verified direction preview.' })
        }
      }
    }
  } else if (snapshot.designs) context.addIssue({ code: 'custom', path: ['designs'], message: 'Design snapshots require a batch composition.' })
  if (snapshot.templateManifestHash !== hashCanonical(snapshot.templateManifest)) {
    context.addIssue({ code: 'custom', path: ['templateManifestHash'], message: 'Template manifest hash must match its canonical manifest.' })
  }
  if (snapshot.composition.templateId !== snapshot.templateManifest.id) {
    context.addIssue({ code: 'custom', path: ['composition', 'templateId'], message: 'Composition template id must match its manifest.' })
  }
  if (snapshot.composition.templateVersion !== snapshot.templateManifest.version) {
    context.addIssue({ code: 'custom', path: ['composition', 'templateVersion'], message: 'Composition template version must match its manifest.' })
  }
})

const campaignVersionFields = {
  id: nonEmptyString,
  campaignId: nonEmptyString,
  versionNumber: z.number().int().positive(),
  snapshot: campaignVersionSnapshotSchema,
  contentHash: assetHashSchema,
  createdBy: nonEmptyString,
  createdAt: timestampSchema,
}

export const campaignVersionRecordSchema = z.strictObject(campaignVersionFields).superRefine((version, context) => {
  if (version.contentHash !== hashCanonical(version.snapshot)) {
    context.addIssue({ code: 'custom', path: ['contentHash'], message: 'Version content hash must match its canonical snapshot.' })
  }
})

export const createCampaignVersionRequestSchema = z.strictObject({ videoAssetIds: z.array(nonEmptyString).max(3).refine(ids => new Set(ids).size === ids.length, 'Video ids must be unique').optional() })

export const compositionCommandResponseSchema = z.strictObject({
  composition: compositionSchema,
  campaign: campaignRecordSchema,
  requestId: requestIdSchema,
})

export const campaignVersionCommandResponseSchema = z.strictObject({
  version: campaignVersionRecordSchema,
  campaign: campaignRecordSchema,
  requestId: requestIdSchema,
})

export const campaignVersionResponseSchema = z.strictObject({
  ...campaignVersionFields,
  requestId: requestIdSchema,
}).superRefine((version, context) => {
  if (version.contentHash !== hashCanonical(version.snapshot)) {
    context.addIssue({ code: 'custom', path: ['contentHash'], message: 'Version content hash must match its canonical snapshot.' })
  }
})

export const campaignVersionListResponseSchema = z.strictObject({
  versions: z.array(campaignVersionRecordSchema),
  requestId: requestIdSchema,
})

const reviewCommentSchema = z.string().trim().min(1).max(2_000)

function isFigmaHttpsUrl(value) {
  try {
    const authority = /^https:\/\/([^/?#]*)(?:[/?#]|$)/i.exec(value)?.[1]
    if (!authority || !/^[\x00-\x7f]+$/.test(authority) || authority.includes('@')) return false
    const rawHostname = authority.toLowerCase().endsWith(':443') ? authority.slice(0, -4) : authority
    if (rawHostname.includes(':')) return false
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    const labels = hostname.split('.')
    return url.protocol === 'https:'
      && url.username === ''
      && url.password === ''
      && (url.port === '' || url.port === '443')
      && rawHostname.toLowerCase() === hostname
      && hostname.length <= 253
      && labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
      && (hostname === 'figma.com' || hostname.endsWith('.figma.com'))
  } catch {
    return false
  }
}

export const reviewChecklistSchema = z.strictObject({
  copyAccuracy: z.literal(true),
  layoutQuality: z.literal(true),
  exportReadiness: z.literal(true),
})

export const requestVersionChangesRequestSchema = z.strictObject({ comment: reviewCommentSchema })
export const rejectVersionRequestSchema = requestVersionChangesRequestSchema
export const markVersionReadyRequestSchema = z.strictObject({
  figmaUrl: z.string().trim().max(2_000).refine(isFigmaHttpsUrl, 'A valid HTTPS Figma URL is required'),
  checklistAnswers: reviewChecklistSchema,
})
export const approveVersionRequestSchema = z.union([z.strictObject({}), z.strictObject({ submissionId: z.string().min(1).max(256), submissionHash: z.string().regex(/^[a-f0-9]{64}$/) })])
export const reopenCampaignRequestSchema = z.strictObject({})

const reviewEventBase = {
  id: nonEmptyString,
  campaignId: nonEmptyString,
  versionId: nonEmptyString,
  actorId: nonEmptyString,
  createdAt: timestampSchema,
}

const sentReviewEventSchema = z.strictObject({
  ...reviewEventBase,
  actorRole: z.enum(['marketer', 'admin']),
  eventType: z.literal('sent'),
  payload: z.strictObject({ contentHash: assetHashSchema, assetHashes: z.array(assetHashSchema) }),
})
const changesRequestedReviewEventSchema = z.strictObject({
  ...reviewEventBase,
  actorRole: z.literal('designer'),
  eventType: z.literal('changes_requested'),
  payload: z.strictObject({ comment: reviewCommentSchema }),
})
const readyReviewEventSchema = z.strictObject({
  ...reviewEventBase,
  actorRole: z.literal('designer'),
  eventType: z.literal('ready'),
  payload: z.strictObject({
    figmaUrl: markVersionReadyRequestSchema.shape.figmaUrl,
    checklistAnswers: reviewChecklistSchema,
    readyActorId: nonEmptyString,
    contentHash: assetHashSchema,
    assetHashes: z.array(assetHashSchema).optional(),
  }),
})
const rejectedReviewEventSchema = z.strictObject({
  ...reviewEventBase,
  actorRole: z.enum(['marketer', 'admin']),
  eventType: z.literal('rejected'),
  payload: z.strictObject({ comment: reviewCommentSchema }),
})
const approvedReviewEventSchema = z.strictObject({
  ...reviewEventBase,
  actorRole: z.enum(['marketer', 'admin']),
  eventType: z.literal('approved'),
  payload: z.strictObject({ contentHash: assetHashSchema, assetHashes: z.array(assetHashSchema).optional() }),
})
const deliveredReviewEventSchema = z.strictObject({
  ...reviewEventBase,
  actorRole: z.enum(['marketer', 'admin']),
  eventType: z.literal('delivered'),
  payload: z.strictObject({
    deliveryId: nonEmptyString,
    contentHash: assetHashSchema,
    assetHashes: z.array(assetHashSchema),
  }),
})

export const reviewEventRecordSchema = z.discriminatedUnion('eventType', [
  sentReviewEventSchema,
  changesRequestedReviewEventSchema,
  readyReviewEventSchema,
  rejectedReviewEventSchema,
  approvedReviewEventSchema,
  deliveredReviewEventSchema,
])

export const reviewCommandResponseSchema = z.strictObject({
  version: campaignVersionRecordSchema,
  campaign: campaignRecordSchema,
  reviewStatus: reviewStatusSchema,
  event: reviewEventRecordSchema,
  requestId: requestIdSchema,
})

export const reopenCampaignResponseSchema = z.strictObject({
  campaign: campaignRecordSchema,
  requestId: requestIdSchema,
})

export const reviewHistoryResponseSchema = z.strictObject({
  version: campaignVersionRecordSchema,
  status: reviewStatusSchema,
  events: z.array(reviewEventRecordSchema),
  requestId: requestIdSchema,
})

const safeArchiveFilenameSchema = z.string().regex(
  /^(?:banners\/banner-[0-9]{3}\.png|videos\/video-[0-9]{3}\.mp4|render-manifest\.json)$/,
  'Delivery filenames must be server-owned safe POSIX paths',
)

const deliveryFileSchema = z.strictObject({
  filename: safeArchiveFilenameSchema,
  assetId: nonEmptyString,
  mimeType: z.enum(['image/png', 'application/json', 'video/mp4']),
  durationSeconds: z.number().positive().max(12).optional(),
  frameRate: z.number().positive().max(60).optional(),
  hasAudio: z.boolean().optional(),
  byteSize: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  width: z.number().int().positive().max(4_096).nullable(),
  height: z.number().int().positive().max(4_096).nullable(),
  sha256: assetHashSchema,
}).superRefine((file, context) => {
  if ((file.mimeType === 'video/mp4') !== (file.durationSeconds != null && file.frameRate != null && file.hasAudio != null)
    || file.mimeType !== 'video/mp4' && [file.durationSeconds,file.frameRate,file.hasAudio].some(value => value != null)) {
    context.addIssue({ code: 'custom', path: ['durationSeconds'], message: 'Only video files require duration, frame rate and audio metadata.' })
  }
  const image = file.mimeType === 'image/png'
  const video = file.mimeType === 'video/mp4'
  if ((image || video) !== (file.width !== null && file.height !== null)) {
    context.addIssue({ code: 'custom', path: ['width'], message: 'Media files require dimensions.' })
  }
  if (image !== file.filename.startsWith('banners/') || video !== file.filename.startsWith('videos/')) {
    context.addIssue({ code: 'custom', path: ['filename'], message: 'Filename does not match its MIME type.' })
  }
})

export const deliveryManifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  campaignId: nonEmptyString,
  versionId: nonEmptyString,
  versionNumber: z.number().int().positive(),
  contentHash: assetHashSchema,
  approval: z.strictObject({ actorId: nonEmptyString, at: timestampSchema }),
  files: z.array(deliveryFileSchema).min(2),
}).superRefine((manifest, context) => {
  const filenames = manifest.files.map((file) => file.filename)
  const sorted = [...filenames].sort()
  if (new Set(filenames).size !== filenames.length || filenames.some((value, index) => value !== sorted[index])) {
    context.addIssue({ code: 'custom', path: ['files'], message: 'Delivery files must be unique and sorted by filename.' })
  }
  if (manifest.files.filter((file) => file.filename === 'render-manifest.json').length !== 1) {
    context.addIssue({ code: 'custom', path: ['files'], message: 'One render manifest is required.' })
  }
  if (!manifest.files.some((file) => file.mimeType === 'image/png')) {
    context.addIssue({ code: 'custom', path: ['files'], message: 'At least one banner PNG is required.' })
  }
})

export const createDeliveryRequestSchema = z.strictObject({})

const deliveryFields = {
  id: nonEmptyString,
  campaignId: nonEmptyString,
  versionId: nonEmptyString,
  contentHash: assetHashSchema,
  asset: assetReferenceSchema.refine((asset) => asset.kind === 'delivery_zip', 'A delivery ZIP asset is required'),
  byteSize: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  createdBy: nonEmptyString,
  createdAt: timestampSchema,
}

export const deliveryRecordSchema = z.strictObject(deliveryFields)

export const deliveryCommandResponseSchema = z.strictObject({
  delivery: deliveryRecordSchema,
  campaign: campaignRecordSchema,
  reviewStatus: z.literal('delivered'),
  event: deliveredReviewEventSchema,
  requestId: requestIdSchema,
})

export const deliveryResponseSchema = z.strictObject({
  ...deliveryFields,
  requestId: requestIdSchema,
})

export const campaignSchema = z.strictObject({
  projectType: projectTypeSchema.optional(),
  id: nonEmptyString,
  title: nonEmptyString.max(200),
  status: campaignStatusSchema,
  revision: z.number().int().nonnegative(),
  brief: briefSchema,
  selectedCopy: copyVariantSchema.optional(),
  selectedDirection: visualDirectionSchema.optional(),
  composition: compositionSchema.optional(),
})

export const generationJobSchema = z.strictObject({
  id: nonEmptyString,
  campaignId: nonEmptyString,
  step: z.enum(['brief_analysis', 'copy', 'directions', 'image', 'video']),
  provider: z.enum(['mock', 'gemini', 'anthropic', 'openai', 'openrouter']),
  model: nonEmptyString,
  region: nonEmptyString,
  status: z.enum(['pending', 'succeeded', 'failed', 'blocked', 'unknown']),
  attempts: z.number().int().min(0),
  safety: z.record(z.string(), z.unknown()),
  usage: z.record(z.string(), z.number().nonnegative()),
  reservedCostMicrounits: z.number().int().nonnegative(),
  actualCostMicrounits: z.number().int().nonnegative().nullable(),
  timeoutAt: z.string().datetime({ offset: true }),
})

const providerMetadataFields = {
  provider: z.enum(['mock', 'gemini', 'anthropic', 'openai', 'openrouter']),
  model: nonEmptyString.max(200),
  region: nonEmptyString.max(100),
  usage: z.record(z.string(), z.number().int().nonnegative()),
  actualCostMicrounits: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  safety: z.strictObject({
    verdict: z.enum(['safe', 'blocked']),
    categories: z.array(nonEmptyString.max(100)),
  }),
}

export const analyseBriefInputSchema = z.strictObject({ brief: briefSchema, instruction: nonEmptyString.max(4000).optional(), sources:z.array(analysisSourceSchema).max(11).optional() })
export const generateCopyInputSchema = z.strictObject({ brief: briefSchema, analysis: briefAnalysisSchema,
  previousHeadlines: z.array(nonEmptyString.max(500)).max(30).optional() })
export const generateDirectionsInputSchema = z.union([
  z.strictObject({ brief: briefSchema, copy: campaignCopyVariantSchema, context: visualContextSchema.optional() }),
  z.strictObject({ brief: briefSchema, analysis: briefAnalysisSchema, mode: z.literal('campaign'), copies: z.array(campaignCopyVariantSchema).max(30), context: visualContextSchema.optional() }),
  z.strictObject({ brief: briefSchema, analysis: briefAnalysisSchema, mode: z.literal('selected_copy'), copies: z.array(campaignCopyVariantSchema).min(1).max(30), context: visualContextSchema.optional() }),
])
export const generatedVisualDirectionSchema = visualDirectionSchema.extend({ prompt: nonEmptyString.max(2_000), copyId: nonEmptyString.optional() })
export const generateImageInputSchema = z.strictObject({
  direction: visualDirectionSchema.extend({ prompt: nonEmptyString.max(2_000) }),
  width: z.number().int().min(64).max(4_096),
  height: z.number().int().min(64).max(4_096),
})

const providerErrorSchema = z.strictObject({
  code: z.enum(['content_rejected', 'provider_blocked', 'rate_limited', 'quota_exhausted', 'billing_required', 'provider_unavailable', 'invalid_output', 'invalid_key']),
  message: nonEmptyString.max(500),
  retryable: z.boolean(),
})

const providerFailureSchema = z.strictObject({ ...providerMetadataFields, error: providerErrorSchema })
export const analyseBriefResultSchema = z.union([
  z.strictObject({ ...providerMetadataFields, analysis: briefAnalysisSchema }),
  providerFailureSchema,
])
export const generateCopyResultSchema = z.union([
  z.strictObject({ ...providerMetadataFields, copies: z.array(generatedBannerCopySchema).length(5) }),
  providerFailureSchema,
])
export const generateDirectionsResultSchema = z.union([
  z.strictObject({ ...providerMetadataFields, directions: z.array(generatedVisualDirectionSchema).min(1).max(30) }),
  providerFailureSchema,
])
export const generateImageResultSchema = z.union([
  z.strictObject({
    ...providerMetadataFields,
    image: z.strictObject({
      bytes: z.instanceof(Uint8Array),
      mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
      width: z.number().int().positive().max(4_096),
      height: z.number().int().positive().max(4_096),
    }),
  }),
  providerFailureSchema,
])

export const analyseBriefRequestSchema = z.strictObject({ instruction: nonEmptyString.max(4000).optional(), expectedRevision: z.number().int().nonnegative().optional() })
export const copyGenerationRequestSchema = z.strictObject({})
export const directionGenerationRequestSchema = z.union([
  z.strictObject({}),
  z.strictObject({ mode: z.literal('campaign'), context: visualContextSchema.optional() }),
  z.strictObject({ mode: z.literal('selected_copy'), copyIds: z.array(nonEmptyString).min(1).max(30).refine(ids => new Set(ids).size === ids.length, 'Copy IDs must be unique'), context: visualContextSchema.optional() }),
])
export const imageGenerationRequestSchema = z.strictObject({
  directionId: nonEmptyString,
  width: z.number().int().min(64).max(4_096),
  height: z.number().int().min(64).max(4_096),
})
export const copySelectionRequestSchema = z.strictObject({ copyId: nonEmptyString, revoke: z.boolean().optional() })
export const directionSelectionRequestSchema = z.strictObject({ directionId: nonEmptyString })

const historicalImageMetadataFields = {
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  width: z.number().int().positive().max(4_096),
  height: z.number().int().positive().max(4_096),
  byteSize: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}

const legacyImageResultMetadataSchema = z.strictObject({
  image: z.strictObject(historicalImageMetadataFields),
})

const interimImageResultMetadataSchema = z.strictObject({
  image: z.strictObject({ assetId: nonEmptyString, ...historicalImageMetadataFields }),
})

const durableImageResultMetadataSchema = z.strictObject({
  image: z.strictObject({ asset: assetReferenceSchema, ...historicalImageMetadataFields }),
})

export const generationResultMetadataSchema = z.union([
  z.strictObject({ analysis: briefAnalysisSchema }),
  z.strictObject({ copySetId: nonEmptyString, copies: z.array(copyVariantSchema) }),
  z.strictObject({ directions: z.array(generatedVisualDirectionSchema) }),
  legacyImageResultMetadataSchema,
  interimImageResultMetadataSchema,
  durableImageResultMetadataSchema,
  z.strictObject({ video: videoAssetSchema }),
])

export const generationJobDetailsSchema = generationJobSchema.extend({
  result: generationResultMetadataSchema.nullable(),
  errorCode: nonEmptyString.nullable(),
  // Optional so responses stored before reasons were exposed still replay.
  unknownReason: nonEmptyString.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})

export const generationCommandResponseSchema = z.strictObject({
  job: generationJobDetailsSchema,
  requestId: requestIdSchema,
})

export const generationJobResponseSchema = z.strictObject({
  ...generationJobDetailsSchema.shape,
  requestId: requestIdSchema,
})

export const brandStateSchema = z.enum(['draft', 'published', 'archived'])
export const brandWizardStepSchema = z.enum(['materials', 'review', 'publish'])
export const brandSourceStatusSchema = z.enum(['added', 'inspecting', 'ready', 'failed'])
export const brandEvidenceMethodSchema = z.enum(['structured_import', 'visual_inference', 'ai_suggestion', 'manual'])
export const brandAssetKindSchema = z.enum(['logo', 'icon', 'illustration', 'pattern', 'reference', 'font'])

const brandEvidenceSchema = z.strictObject({
  method: brandEvidenceMethodSchema,
  sourceId: nonEmptyString.optional(),
})

export const brandSourceSchema = z.strictObject({
  id: nonEmptyString,
  kind: z.enum(['file', 'figma']),
  label: nonEmptyString.max(255),
  url: z.string().url().max(2_000).optional(),
  mimeType: nonEmptyString.max(200).optional(),
  byteSize: z.number().int().positive().max(10 * 1024 * 1024).optional(),
  status: brandSourceStatusSchema,
  error: nonEmptyString.max(500).optional(),
}).superRefine((source, context) => {
  if (source.kind === 'figma' && !source.url) context.addIssue({ code: 'custom', message: 'Figma sources require a URL', path: ['url'] })
  if (source.kind === 'file' && !source.mimeType) context.addIssue({ code: 'custom', message: 'File sources require a media type', path: ['mimeType'] })
})

export const brandAssetSchema = z.strictObject({
  id: nonEmptyString,
  name: nonEmptyString.max(255),
  kind: brandAssetKindSchema,
  mimeType: nonEmptyString.max(200),
  sourceId: nonEmptyString.optional(),
  approved: z.boolean(),
  downloadPath: z.string().startsWith('/api/v1/').optional(),
})

export const brandPaletteTokenSchema = z.strictObject({
  id: z.string().trim().regex(/^[a-z][a-z0-9-]{0,63}$/),
  name: nonEmptyString.max(100),
  value: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  confirmed: z.boolean(),
  evidence: brandEvidenceSchema,
})

const brandColorRolesSchema = z.strictObject({
  primary: z.string().trim(),
  accent: z.string().trim(),
  canvas: z.string().trim(),
  surface: z.string().trim(),
  primaryText: z.string().trim(),
  inverseText: z.string().trim(),
})

const fontChoiceSchema = z.strictObject({
  family: z.string().trim().max(150),
  weight: z.number().int().min(100).max(900).multipleOf(100),
  fallbacks: z.array(nonEmptyString.max(100)).max(5),
  confirmed: z.boolean(),
  evidence: brandEvidenceSchema.optional(),
})

const typeScaleValueSchema = z.strictObject({
  size: z.number().positive().max(240),
  lineHeight: z.number().positive().max(4),
})

const campaignBlobSchema = z.strictObject({
  seed: z.number().int(),
  lobes: z.number().positive().max(20),
  irregularity: z.number().min(0).max(0.8),
  pointsPerLobe: z.number().int().min(2).max(40),
})

const brandCampaignKitSchema = z.strictObject({
  hero: z.strictObject({
    eyebrow: nonEmptyString.max(100),
    headline: nonEmptyString.max(300),
    body: nonEmptyString.max(1_000),
    cta: nonEmptyString.max(100),
  }),
  blobs: z.strictObject({
    hero: campaignBlobSchema,
    feature: campaignBlobSchema,
    accent: campaignBlobSchema,
  }),
  templates: z.array(z.strictObject({
    id: nonEmptyString.max(100),
    name: nonEmptyString.max(200),
    type: projectTypeSchema,
    formats: z.array(nonEmptyString.max(50)).min(1).max(10),
  })).max(20),
})

export const brandDraftSchema = z.strictObject({
  name: nonEmptyString.max(200),
  context: z.string().trim().max(2_000),
  currentStep: brandWizardStepSchema,
  sources: z.array(brandSourceSchema).max(30),
  assets: z.array(brandAssetSchema).max(100),
  logoRoles: z.strictObject({
    primary: nonEmptyString.nullable(),
    secondary: nonEmptyString.nullable(),
    symbol: nonEmptyString.nullable(),
    light: nonEmptyString.nullable(),
    dark: nonEmptyString.nullable(),
  }),
  colors: z.strictObject({
    palette: z.array(brandPaletteTokenSchema).max(100),
    roles: brandColorRolesSchema,
  }),
  typography: z.strictObject({
    heading: fontChoiceSchema,
    body: fontChoiceSchema,
    licenseConfirmed: z.boolean(),
    scale: z.strictObject({
      h1: typeScaleValueSchema,
      h2: typeScaleValueSchema,
      h3: typeScaleValueSchema,
      body: typeScaleValueSchema,
      caption: typeScaleValueSchema,
    }),
  }),
  campaignKit: brandCampaignKitSchema.optional(),
  conflicts: z.array(z.strictObject({
    id: nonEmptyString,
    field: nonEmptyString,
    message: nonEmptyString.max(500),
    resolved: z.boolean(),
  })).max(100),
})

export const brandVersionSchema = z.strictObject({
  id: nonEmptyString,
  brandId: nonEmptyString,
  versionNumber: z.number().int().positive(),
  snapshot: brandDraftSchema,
  publishedBy: nonEmptyString,
  publishedAt: timestampSchema,
  schemaVersion: z.literal(1),
})

export const brandChangeOperationSchema = z.discriminatedUnion('operation', [
  z.strictObject({ operation: z.literal('set_color'), tokenId: nonEmptyString, value: z.string().regex(/^#[0-9A-Fa-f]{6}$/) }),
  z.strictObject({ operation: z.literal('scale_typography'), factor: z.number().min(0.5).max(2) }),
])

export const brandProposalSchema = z.strictObject({
  id: nonEmptyString,
  brandId: nonEmptyString,
  baseRevision: z.number().int().nonnegative(),
  prompt: nonEmptyString.max(2_000),
  operations: z.array(brandChangeOperationSchema).min(1).max(20),
  unchanged: z.array(nonEmptyString).max(20),
  state: z.enum(['proposed', 'applied', 'discarded']),
  createdAt: timestampSchema,
})

const brandRecordFields = {
  id: nonEmptyString,
  workspaceId: nonEmptyString,
  ownerId: nonEmptyString,
  state: brandStateSchema,
  revision: z.number().int().nonnegative(),
  activeVersionId: nonEmptyString.nullable(),
  draft: brandDraftSchema,
  activeVersion: brandVersionSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}

export const brandDesignSystemRecordSchema = z.strictObject(brandRecordFields)
export const brandDesignSystemResponseSchema = z.strictObject({ ...brandRecordFields, requestId: requestIdSchema })
export const brandDesignSystemListResponseSchema = z.strictObject({ brands: z.array(brandDesignSystemRecordSchema), requestId: requestIdSchema })
export const createBrandDesignSystemRequestSchema = z.strictObject({ name: nonEmptyString.max(200) })
export const patchBrandDraftRequestSchema = z.strictObject({ draft: brandDraftSchema })
export const createBrandProposalRequestSchema = z.strictObject({
  prompt: nonEmptyString.max(2_000),
  approvalFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
})
export const brandProposalResponseSchema = z.strictObject({ proposal: brandProposalSchema, requestId: requestIdSchema })
export const brandVersionListResponseSchema = z.strictObject({ versions: z.array(brandVersionSchema), requestId: requestIdSchema })
export const publishBrandDesignSystemRequestSchema = z.strictObject({})
export const restoreBrandVersionRequestSchema = z.strictObject({})
export const grantBrandViewerRequestSchema = z.strictObject({ userId: nonEmptyString })
export const brandDesignSystemConfigResponseSchema = z.strictObject({
  limits: z.strictObject({
    maxFileBytes: z.number().int().positive(), maxSources: z.number().int().positive(), maxAssets: z.number().int().positive(),
    maxPdfPages: z.number().int().positive(), maxImagePixels: z.number().int().positive(), maxImageDimension: z.number().int().positive(),
  }),
  provider: nonEmptyString,
  model: nonEmptyString,
  requestId: requestIdSchema,
})

const brandUploadMimeTypeSchema = z.enum([
  'application/pdf', 'application/json',
  'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml',
  'font/woff2', 'font/woff', 'font/ttf', 'font/otf',
  'application/font-woff', 'application/x-font-ttf', 'application/x-font-opentype',
])

export const addBrandSourceRequestSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('figma'), label: nonEmptyString.max(255), url: z.string().url().max(2_000) }),
  z.strictObject({ kind: z.literal('file'), name: nonEmptyString.max(255), mimeType: brandUploadMimeTypeSchema, data: z.string().max(7_000_000) }),
])
export const addBrandAssetRequestSchema = z.strictObject({
  name: nonEmptyString.max(255),
  kind: brandAssetKindSchema,
  mimeType: brandUploadMimeTypeSchema.exclude(['application/pdf', 'application/json']),
  data: z.string().max(7_000_000),
})
export const analyseBrandSourcesRequestSchema = z.strictObject({ approvalFingerprint: nonEmptyString.max(128).optional() })

export const brandSourceInspectionResponseSchema = z.strictObject({
  brandId: nonEmptyString,
  revision: z.number().int().nonnegative(),
  sources: z.array(brandSourceSchema).max(30),
  provider: nonEmptyString,
  model: nonEmptyString,
  estimatedUsd: z.number().nonnegative().nullable(),
  thresholdUsd: z.number().nonnegative().nullable(),
  requiresApproval: z.boolean(),
  approvalFingerprint: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  pricingAvailable: z.boolean(),
  requestId: requestIdSchema,
})
