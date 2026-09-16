import { z } from 'zod'
const id = z.string().trim().min(1).max(255)
export const videoPlanRequestSchema = z.strictObject({ directionId: id, aspectRatio: z.enum(['16:9','9:16']).default('16:9'), prompt: z.string().trim().min(1).max(8000).optional() })
export const videoPlanSchema = z.strictObject({ id, campaignId: id, directionId: id, model: id, prompt: z.string(),
  aspectRatio: z.enum(['16:9','9:16']), durationSeconds: z.literal(4), resolution: z.literal('720p'),
  estimatedCostMicrounits: z.number().int().nonnegative(), expiresAt: z.string() })
export const videoAssetSchema = z.strictObject({ id, sha256: z.string().regex(/^[a-f0-9]{64}$/), mimeType: z.literal('video/mp4'),
  width: z.number().int().positive(), height: z.number().int().positive(), durationSeconds: z.number().positive(),
  frameRate: z.number().positive(), hasAudio: z.boolean(), byteSize: z.number().int().positive() })
export const videoJobRecordSchema = z.strictObject({ id, campaignId: id, directionId: id, model: id,
  phase: z.enum(['queued','submitting','running','retrieving','succeeded','failed','blocked','unknown','cancelled']),
  errorCode: z.string().nullable(), asset: videoAssetSchema.nullable(), createdAt: z.string(), updatedAt: z.string() })

export const reviewVideoSchema = videoAssetSchema.extend({ generationJobId: id, directionId: id, model: id, origin: z.enum(['generation','external_live_check']) })
