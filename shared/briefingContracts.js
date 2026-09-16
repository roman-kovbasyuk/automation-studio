import { z } from 'zod'
import { MAX_BRIEF_UPLOAD_BYTES } from './briefUploadLimits.js'

export const MAX_VISUAL_TAGS = 12
export const MAX_VISUAL_TAG_LENGTH = 60
export const MAX_BRIEF_SOURCES = 10
export const MAX_SOURCE_BYTES = MAX_BRIEF_UPLOAD_BYTES
export const MAX_COLLECTION_BYTES = MAX_BRIEF_UPLOAD_BYTES
export const MAX_SOURCE_TEXT = 20_000
export const MAX_COLLECTION_TEXT = 60_000
export const MAX_SOURCE_PAGES = 30
export const analysisSourceSchema = z.strictObject({
  id:z.string().min(1),name:z.string().min(1),contentHash:z.string().min(1),
  blocks:z.array(z.strictObject({id:z.string().min(1),text:z.string().max(MAX_SOURCE_TEXT),page:z.number().int().positive().optional()})),
  attachmentRefs:z.array(z.strictObject({kind:z.enum(['image','pdf']),mimeType:z.string().min(1)})),
  attachments:z.array(z.strictObject({mimeType:z.string().min(1),data:z.string().max(Math.ceil(MAX_SOURCE_BYTES/3)*4)})).optional(),
})
export const AGE_GROUPS = Object.freeze(['under_18', '18_24', '25_34', '35_44', '45_54', '55_64', '65_plus'])
const id = z.string().trim().min(1).max(200)
const hash = z.string().regex(/^[a-f0-9]{64}$/)
const distinct = values => new Set(values).size === values.length

export function normalizeVisualTag(value) {
  const label = value.trim()
  return { label, key: label.toLocaleLowerCase('en-US') }
}
export const visualTagsSchema = z.array(z.string().trim().min(1).max(MAX_VISUAL_TAG_LENGTH)).max(MAX_VISUAL_TAGS)
  .refine(tags => distinct(tags.map(tag => normalizeVisualTag(tag).key)), 'Visual keywords must be unique.')
export const briefAnswersDraftSchema = z.strictObject({
  summary: z.string().trim().max(1000), audience: z.string().trim().max(500),
  copyMode: z.enum(['keep_original', 'create_new']).nullable(),
  ageGroups: z.array(z.enum(AGE_GROUPS)).max(AGE_GROUPS.length).refine(distinct, 'Choose each age group once.'),
  gender: z.enum(['all', 'women', 'men']),
  reach: z.enum(['local', 'national', 'global']).nullable(),
  goal: z.enum(['awareness', 'traffic', 'leads', 'signups', 'sales', 'other']).nullable(),
  goalCustom: z.string().trim().max(500), visualTags: visualTagsSchema,
})
export const briefAnswersConfirmedSchema = briefAnswersDraftSchema.superRefine((answers, ctx) => {
  for (const field of ['summary', 'audience', 'copyMode', 'reach', 'goal']) {
    if (!answers[field]) ctx.addIssue({ code:'custom', path:[field], message:'Review this field before confirming.' })
  }
  if (answers.goal === 'other' && !answers.goalCustom) ctx.addIssue({code:'custom',path:['goalCustom'],message:'Describe the campaign goal.'})
})
export function emptyBriefAnswers() {
  return { summary:'', audience:'', copyMode:null, ageGroups:[], gender:'all', reach:null, goal:null, goalCustom:'', visualTags:[] }
}

// Unlike generated copy, authored strings must not be trimmed or completed by AI.
export const authoredCopyFieldsSchema = z.strictObject({
  headline:z.string().max(MAX_SOURCE_TEXT), body:z.string().max(MAX_SOURCE_TEXT),
  offer:z.string().max(MAX_SOURCE_TEXT), cta:z.string().max(MAX_SOURCE_TEXT),
}).refine(fields => ['headline','body','offer','cta'].some(key => fields[key].trim()), 'Enter a headline, body, offer, or CTA.')
  .refine(fields => ['headline','body','offer','cta'].reduce((sum, key) => sum + fields[key].length, 0) <= MAX_SOURCE_TEXT, 'Copy exceeds the 20,000 character limit.')
export const authoredCopyVariantSchema = authoredCopyFieldsSchema.safeExtend({ id, visualPrompt:z.string().max(2000).default('') })
export const sourceRefSchema = z.strictObject({ sourceId:id,label:z.string().min(1).max(255),blockId:id,
  page:z.number().int().positive().max(MAX_SOURCE_PAGES).optional(),start:z.number().int().nonnegative().optional(),end:z.number().int().nonnegative().optional() })
export const foundCopySchema = z.strictObject({id,fields:authoredCopyFieldsSchema,sourceRefs:z.array(sourceRefSchema).min(1).max(30),
  verification:z.enum(['text_verified','needs_review'])})
export const briefingProposalSchema = z.strictObject({sourceKey:hash,foundCopy:z.array(foundCopySchema).max(30),
  answers:briefAnswersDraftSchema,suggestedVisualTags:visualTagsSchema.refine(tags=>tags.length<=7,'Suggest at most seven visual keywords.')})
export const briefSourceSummarySchema = z.strictObject({id,name:z.string().min(1).max(255),kind:z.enum(['text','file']),
  mimeType:z.string().min(1).max(200),byteSize:z.number().int().nonnegative().max(MAX_SOURCE_BYTES),
  status:z.enum(['processing','ready','failed']),errorCode:z.string().max(100).nullable(),
  contentHash:hash,contentRevision:z.number().int().positive()})
export const briefConfirmationSchema = z.strictObject({id,analysisJobId:id,sourceKey:hash,copyKey:hash,visualKey:hash,answersKey:hash,
  confirmedAt:z.string().datetime({offset:true}),confirmedBy:id,importedCopySetId:id.nullable()})
export const briefingStateSchema = z.strictObject({schemaVersion:z.literal(2),sourceIds:z.array(id).max(MAX_BRIEF_SOURCES).refine(distinct),
  sourceKey:hash,analysisJobId:id.nullable(),answers:briefAnswersDraftSchema,confirmation:briefConfirmationSchema.nullable()})
// This marker is the only v2 field accepted during campaign creation.
export const briefingCreateSchema = z.strictObject({schemaVersion:z.literal(2)})
export const briefConfirmationRequestSchema = z.strictObject({analysisJobId:id,sourceKey:hash,answers:briefAnswersConfirmedSchema})
export const briefConfirmationResponseSchema = z.strictObject({confirmationId:id,campaignRevision:z.number().int().nonnegative(),
  initialCopy:z.enum(['skip','offer_generation']),importedCopySetId:id.nullable()})
