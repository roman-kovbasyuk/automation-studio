import { z } from 'zod'

export const assetTypes = ['banners', 'presentations', 'websites', 'templates']
const id = z
  .string()
  .regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/)
  .refine((s) => !['__proto__', 'constructor', 'prototype'].includes(s))
const path = z
  .string()
  .max(200)
  .regex(/^(input|answers|nodes)(\.[a-zA-Z][a-zA-Z0-9_-]*)*$/)
  .refine(
    (s) =>
      !s
        .split('.')
        .some((p) => ['__proto__', 'prototype', 'constructor'].includes(p)),
  )
const scalar = z.union([
  z.string().max(10000),
  z.number().finite(),
  z.boolean(),
  z.null(),
])
export function safeJson(value) {
  let count = 0
  function walk(v, depth) {
    if (++count > 10000 || depth > 12) return false
    if (v === null || typeof v === 'boolean' || typeof v === 'string')
      return true
    if (typeof v === 'number') return Number.isFinite(v)
    if (typeof v !== 'object') return false
    return Object.entries(v).every(
      ([k, x]) =>
        !['__proto__', 'prototype', 'constructor'].includes(k) &&
        walk(x, depth + 1),
    )
  }
  try {
    return walk(value, 0) && JSON.stringify(value).length <= 200000
  } catch {
    return false
  }
}
export const fixtureValueSchema = z
  .unknown()
  .refine(safeJson, 'Expected bounded safe JSON')
export const conditionSchema = z.strictObject({
  path,
  op: z.enum(['exists', 'equals', 'notEquals']),
  value: scalar.optional(),
})
export const questionSchema = z.strictObject({
  id,
  label: z.string().min(1).max(500),
  required: z.boolean(),
  inputPath: path.optional(),
  type: z.enum(['text', 'number', 'select', 'boolean']).default('text'),
  options: z.array(z.string().min(1).max(200)).max(30).default([]),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
})
export const assetWorkflowNodeSchema = z.strictObject({
  id,
  capability: z.string().min(1).max(64),
  version: z.number().int().positive().max(1000),
  label: z.string().min(1).max(160),
  instructions: z.string().max(20000).default(''),
  config: z.strictObject({}).default({}),
  bindings: z.record(id, path).default({}),
  outputs: z.array(id).max(30).default([]),
  questions: z.array(questionSchema).max(30).default([]),
  condition: conditionSchema.optional(),
  position: z
    .strictObject({
      x: z.number().finite().min(-100000).max(100000),
      y: z.number().finite().min(-100000).max(100000),
    })
    .default({ x: 0, y: 0 }),
})
export const assetWorkflowDraftSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    entry: id,
    nodes: z.array(assetWorkflowNodeSchema).min(1).max(100),
    edges: z
      .array(
        z.strictObject({
          id,
          source: id,
          target: id,
          branch: z.boolean().optional(),
        }),
      )
      .max(200),
  })
  .refine(safeJson, 'Draft exceeds safe bounds')
export const revisionRequestSchema = z.strictObject({
  expectedRevision: z.number().int().nonnegative(),
})
export const createAssetWorkflowSchema = z.strictObject({
  key: id,
  assetType: z.enum(assetTypes),
  title: z.string().trim().min(1).max(160),
  draft: assetWorkflowDraftSchema,
})
export const saveAssetWorkflowSchema = revisionRequestSchema.extend({
  draft: assetWorkflowDraftSchema,
})
export const simulationFixtureSchema = z.strictObject({
  input: fixtureValueSchema.default({}),
  answers: z.record(id, fixtureValueSchema).default({}),
  outputs: z.record(id, fixtureValueSchema).default({}),
})
export const simulateAssetWorkflowSchema = revisionRequestSchema.extend({
  draftHash: z.string().regex(/^[a-f0-9]{64}$/),
  fixture: simulationFixtureSchema,
})
export const publishAssetWorkflowSchema = revisionRequestSchema.extend({
  changeNote: z.string().trim().min(1).max(2000),
  idempotencyKey: z.string().regex(/^[!-~]{1,128}$/),
})
export const activateAssetWorkflowSchema = z.strictObject({
  versionId: z.uuid(),
})
export const versionMetadataSchema = z.strictObject({
  id: z.uuid(),
  version: z.number().int().positive(),
  hash: z.string(),
  changeNote: z.string(),
  createdAt: z.string(),
})
export const assetWorkflowDetailSchema = z.strictObject({
  id: z.uuid(),
  key: z.string(),
  assetType: z.enum(assetTypes),
  title: z.string(),
  draft: assetWorkflowDraftSchema,
  draftRevision: z.number().int(),
  draftHash: z.string(),
  activeVersionId: z.uuid().nullable(),
  versions: z.array(versionMetadataSchema),
  updatedAt: z.string(),
})
export const issueSchema = z.strictObject({
  code: z.string(),
  message: z.string(),
  nodeId: z.string().optional(),
  edgeId: z.string().optional(),
})
export const validationResultSchema = z.strictObject({
  valid: z.boolean(),
  issues: z.array(issueSchema),
})
export const simulationResultSchema = z.strictObject({
  simulated: z.literal(true),
  draftHash: z.string(),
  trace: z.array(
    z.strictObject({
      nodeId: z.string(),
      status: z.enum(['completed', 'pending', 'missing_fixture']),
      simulated: z.literal(true),
      decision: z.boolean().optional(),
      output: fixtureValueSchema.optional(),
    }),
  ),
  pendingQuestions: z.array(questionSchema.extend({ nodeId: z.string() })),
  output: fixtureValueSchema.optional(),
})
export const referenceSchema = z.strictObject({
  id: z.uuid(),
  versionId: z.uuid(),
  version: z.number().int(),
  hash: z.string(),
  definition: assetWorkflowDraftSchema,
})
