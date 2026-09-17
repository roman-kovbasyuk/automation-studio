import { z } from 'zod'
import { campaignRecordSchema, copyVariantSchema, visualDirectionSchema, compositionSchema, campaignVersionRecordSchema, generationJobDetailsSchema, deliveryRecordSchema } from './contracts.js'
import {authoredCopyVariantSchema,briefSourceSummarySchema} from './briefingContracts.js'

const copySetSchema=z.strictObject({id:z.string().min(1),selectedCandidateId:z.string().nullable(),approvedCandidateIds:z.array(z.string().min(1)).default([]),hasApprovalHistory:z.boolean().optional(),stale:z.boolean(),sourceBriefKey:z.string().optional()})
const storedCopySetSchema=z.union([
  copySetSchema.extend({origin:z.literal('generated').optional(),candidates:z.array(copyVariantSchema)}),
  copySetSchema.extend({origin:z.enum(['supplied','manual']),candidates:z.array(authoredCopyVariantSchema)}),
])

export const workspaceRecordSchema = z.strictObject({
  campaign: campaignRecordSchema,
  sources:z.array(briefSourceSummarySchema).optional(),
  copies: z.array(storedCopySetSchema),
  directions: z.array(visualDirectionSchema.extend({ stale: z.boolean(),
    scope: z.enum(['legacy', 'campaign', 'selected_copy']).default('legacy'),
    copy: authoredCopyVariantSchema.nullable().default(null), batchId: z.string().nullable().default(null),
    source: z.enum(['upload', 'generation']).nullable().default(null),
    generation: z.strictObject({ id: z.string(), status: z.enum(['pending', 'unknown', 'succeeded', 'failed', 'blocked']), errorCode: z.string().nullable(),
      unknownReason: z.string().nullable().optional(), timeoutAt: z.string().datetime({ offset: true }).optional() }).nullable().default(null),
  })),
  composition: compositionSchema.nullable(),
  versions: z.array(campaignVersionRecordSchema),
  jobs: z.array(generationJobDetailsSchema),
  delivery: deliveryRecordSchema.nullable(),
})
export const workspaceResponseSchema = workspaceRecordSchema.extend({ requestId: z.string().min(1).max(128) })
