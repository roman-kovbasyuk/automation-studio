import { briefSourceSummarySchema, emptyBriefAnswers } from '../../shared/briefingContracts.js'
import { sourceProjection } from '../../shared/briefingDependencies.js'
import { hashCanonical } from '../../shared/canonicalJson.js'

export function initialBriefingState(brief) {
  return {schemaVersion:2,sourceIds:[],sourceKey:hashCanonical(sourceProjection(brief,[])),
    analysisJobId:null,answers:emptyBriefAnswers(),confirmation:null}
}
export function sourceSummary(row) {
  return briefSourceSummarySchema.parse({id:row.id,name:row.name,kind:row.kind,mimeType:row.mime_type,
    byteSize:Number(row.byte_size),status:row.status,errorCode:row.error_code,
    contentHash:row.content_hash,contentRevision:row.content_revision})
}
export function createBriefingRepository(client) {
  return {
    async listSources(campaignId) {
      return (await client.query('SELECT * FROM brief_sources WHERE campaign_id=$1 AND removed_at IS NULL ORDER BY created_at,id',[campaignId])).rows
    },
    async findSource(campaignId,sourceId,{includeRemoved=false}={}) {
      return (await client.query(`SELECT * FROM brief_sources WHERE campaign_id=$1 AND id=$2 ${includeRemoved?'':'AND removed_at IS NULL'}`,[campaignId,sourceId])).rows[0]??null
    },
    async insertSource(campaignId,source) {
      return (await client.query(`INSERT INTO brief_sources(campaign_id,id,name,kind,mime_type,byte_size,content_hash,object_key,status)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'processing') RETURNING *`,
      [campaignId,source.id,source.name,source.kind,source.mimeType,source.byteSize,source.contentHash,source.objectKey])).rows[0]
    },
  }
}
