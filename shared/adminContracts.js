import { z } from 'zod'

const text = z.string()
const nullableText = text.nullable()
const timestamp = text.datetime({ offset: true })
const nullableTimestamp = timestamp.nullable()
const safeInteger = z.number().int().safe()
const nullableSafeInteger = safeInteger.nullable()
const boolQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
const trimmedSearch = z
  .string()
  .trim()
  .max(200)
  .transform((value) => value || undefined)
  .optional()
const positiveInt = z.coerce.number().int().positive()
const pageNumber = positiveInt.max(1_000_000)

export const campaignStatuses = [
  'draft',
  'copy_ready',
  'direction_selected',
  'composed',
  'in_review',
  'changes_requested',
  'ready',
  'approved',
  'delivered',
]
export const projectTypes = [
  'banners',
  'reels',
  'landing-page',
  'website-page',
  'presentations',
  'business-cards',
  'email-signature',
]
export const assetKinds = [
  'direction',
  'final_image',
  'review_png',
  'manifest',
  'delivery_zip',
  'video',
  'file',
  'figma',
  'logo',
  'icon',
  'illustration',
  'pattern',
  'reference',
  'font',
]
export const jobStatuses = [
  'pending',
  'succeeded',
  'failed',
  'blocked',
  'unknown',
  'queued',
  'running',
  'cancelled',
]

export const paginationQuerySchema = z.strictObject({
  search: trimmedSearch,
  page: pageNumber.default(1),
  pageSize: positiveInt.max(100).default(25),
})
export const usersQuerySchema = paginationQuerySchema.extend({
  role: z.enum(['marketer', 'designer', 'admin']).optional(),
  disabled: boolQuery.optional(),
})
export const projectsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(campaignStatuses).optional(),
  projectType: z.enum(projectTypes).optional(),
  archived: boolQuery.optional(),
  creatorId: z.string().trim().min(1).max(200).optional(),
})
export const assetsQuerySchema = paginationQuerySchema.extend({
  sourceType: z.enum(['campaign', 'brand-source', 'brand-asset']).optional(),
  kind: z.enum(assetKinds).optional(),
  projectId: z.string().trim().min(1).max(200).optional(),
  brandId: z.string().trim().min(1).max(200).optional(),
  source: z
    .enum(['upload', 'generation', 'render', 'review', 'delivery'])
    .optional(),
})
export const jobsQuerySchema = paginationQuerySchema.extend({
  jobType: z.enum(['campaign-generation', 'brand-ai']).optional(),
  status: z.enum(jobStatuses).optional(),
  projectId: z.string().trim().min(1).max(200).optional(),
  brandId: z.string().trim().min(1).max(200).optional(),
  provider: z.string().trim().min(1).max(100).optional(),
  step: z
    .enum(['brief_analysis', 'copy', 'directions', 'image', 'video'])
    .optional(),
})
export const activityTypes = ['generation', 'review', 'delivery', 'audit']
export const activityQuerySchema = paginationQuerySchema.extend({
  type: z.enum(activityTypes).optional(),
  projectId: z.string().trim().min(1).max(200).optional(),
  actorId: z.string().trim().min(1).max(200).optional(),
  status: z.enum([...jobStatuses, 'delivered']).optional(),
})
export const projectActivityQuerySchema = z.strictObject({
  page: pageNumber.default(1),
  pageSize: positiveInt.max(100).default(25),
  type: z.enum(activityTypes).optional(),
})

const actorSchema = z.strictObject({
  id: text,
  displayName: text,
  role: z.enum(['marketer', 'designer', 'admin']),
})
const creatorSchema = z.strictObject({
  id: text,
  email: text.email(),
  displayName: text,
})
const countsSchema = z.strictObject({
  assets: safeInteger.nonnegative(),
  jobs: safeInteger.nonnegative(),
  versions: safeInteger.nonnegative(),
  reviewEvents: safeInteger.nonnegative(),
  deliveries: safeInteger.nonnegative(),
})
export const userAdminSchema = z.strictObject({
  id: text,
  email: text.email(),
  displayName: text,
  firstName: nullableText,
  lastName: nullableText,
  role: z.enum(['marketer', 'designer', 'admin']),
  disabled: z.boolean(),
  passwordConfigured: z.boolean(),
  googleConnected: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
})
export const projectAdminSchema = z.strictObject({
  id: text,
  title: text,
  projectType: z.enum(projectTypes),
  status: z.enum(campaignStatuses),
  revision: safeInteger,
  creator: creatorSchema,
  counts: countsSchema,
  createdAt: timestamp,
  updatedAt: timestamp,
  archivedAt: nullableTimestamp,
})
export const projectDetailAdminSchema = z.strictObject({
  project: projectAdminSchema.extend({
    workflow: z.strictObject({
      currentVersionNumber: safeInteger.nonnegative(),
      openVersionId: nullableText,
      selectedCopyId: nullableText,
      selectedDirectionId: nullableText,
      compositionId: nullableText,
    }),
  }),
})
export const assetAdminSchema = z.strictObject({
  id: text,
  sourceType: z.enum(['campaign', 'brand-source', 'brand-asset']),
  rawId: text,
  name: text,
  projectId: nullableText,
  brandId: nullableText,
  sourceId: nullableText,
  kind: text,
  source: nullableText,
  status: nullableText,
  mimeType: text,
  byteSize: safeInteger.nonnegative(),
  width: nullableSafeInteger,
  height: nullableSafeInteger,
  generationJobId: nullableText,
  versionId: nullableText,
  createdAt: timestamp,
  updatedAt: nullableTimestamp,
})
export const jobAdminSchema = z.strictObject({
  id: text,
  rawId: text,
  jobType: z.enum(['campaign-generation', 'brand-ai']),
  projectId: nullableText,
  brandId: nullableText,
  step: nullableText,
  operation: nullableText,
  provider: text,
  model: text,
  region: nullableText,
  status: text,
  videoPhase: nullableText,
  attempts: safeInteger.nonnegative(),
  errorCode: nullableText,
  reservedCostMicrounits: nullableSafeInteger,
  actualCostMicrounits: nullableSafeInteger,
  estimatedUsd: z.number().finite().nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: nullableTimestamp,
  timeoutAt: nullableTimestamp,
})
export const activityAdminSchema = z.strictObject({
  id: text,
  rawId: text,
  type: z.enum(activityTypes),
  projectId: nullableText,
  occurredAt: timestamp,
  action: nullableText,
  status: nullableText,
  actor: actorSchema.nullable(),
  references: z.strictObject({
    versionId: nullableText,
    assetId: nullableText,
    jobId: nullableText,
    entityType: nullableText,
    entityId: nullableText,
  }),
})
export const moduleAdminSchema = z.strictObject({
  id: text,
  name: text,
  category: z.enum(['campaign-module', 'recipe-runtime']),
  order: safeInteger.nullable(),
  availability: z.record(
    text,
    z.enum(['available', 'unavailable', 'not-applicable']),
  ),
  unavailableReason: text.optional(),
})
export const modulesResponseSchema = z.strictObject({
  items: z.array(moduleAdminSchema),
})
export const usersResponseSchema = z.strictObject({
  items: z.array(userAdminSchema),
  page: safeInteger,
  pageSize: safeInteger,
  total: safeInteger,
})
export const projectsResponseSchema = z.strictObject({
  items: z.array(projectAdminSchema),
  page: safeInteger,
  pageSize: safeInteger,
  total: safeInteger,
})
export const assetsResponseSchema = z.strictObject({
  items: z.array(assetAdminSchema),
  page: safeInteger,
  pageSize: safeInteger,
  total: safeInteger,
})
export const jobsResponseSchema = z.strictObject({
  items: z.array(jobAdminSchema),
  page: safeInteger,
  pageSize: safeInteger,
  total: safeInteger,
})
export const activityResponseSchema = z.strictObject({
  items: z.array(activityAdminSchema),
  page: safeInteger,
  pageSize: safeInteger,
  total: safeInteger,
})

const metricSchema = z.strictObject({
  average: safeInteger.nullable(),
  sampleCount: safeInteger.nonnegative(),
  unavailableReason: nullableText,
})
export const overviewResponseSchema = z.strictObject({
  scope: z.literal('all-workspaces'),
  window: z.strictObject({
    hours: z.literal(24),
    from: timestamp,
    to: timestamp,
  }),
  counts: z.strictObject({
    users: safeInteger.nonnegative(),
    activeUsers: safeInteger.nonnegative(),
    disabledUsers: safeInteger.nonnegative(),
    projects: safeInteger.nonnegative(),
    activeProjects: safeInteger.nonnegative(),
    assets: safeInteger.nonnegative(),
    jobs: safeInteger.nonnegative(),
    assetWorkflows: safeInteger.nonnegative(),
    publishedAssetWorkflows: safeInteger.nonnegative(),
  }),
  jobStatusCounts: z.strictObject(
    Object.fromEntries(
      jobStatuses.map((status) => [status, safeInteger.nonnegative()]),
    ),
  ),
  performance: z.strictObject({
    completedJobDurationMs: metricSchema,
    providerLatencyMs: metricSchema,
    humanTaskDurationMs: metricSchema,
  }),
  recentActivity: z.array(activityAdminSchema).max(10),
  modules: z.array(moduleAdminSchema),
})
