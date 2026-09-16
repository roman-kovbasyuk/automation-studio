import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { withTransaction } from '../db/pool.js'
import { createCampaignRepository } from '../repositories/campaignRepository.js'
import { createBriefingRepository, initialBriefingState, sourceSummary } from '../repositories/briefingRepository.js'
import { sourceProjection } from '../../shared/briefingDependencies.js'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { MAX_BRIEF_SOURCES, MAX_SOURCE_BYTES, MAX_COLLECTION_BYTES, MAX_COLLECTION_TEXT } from '../../shared/briefingContracts.js'
import { applyArtifactEdit } from '../../shared/workflowRules.js'
import { extractSource, briefSourceError } from '../briefSources/sourceExtractor.js'
import { MAX_BRIEF_UPLOAD_BASE64 } from '../../shared/briefUploadLimits.js'
import { campaignInputSource } from '../briefSources/analysisSnapshot.js'

const identity=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/)
const inputSchema=z.discriminatedUnion('kind',[
  z.strictObject({kind:z.literal('text'),text:z.string().min(1).max(20_000)}),
  z.strictObject({kind:z.literal('file'),name:z.string().min(1).max(255),mimeType:z.string().min(1).max(200),data:z.string().min(1).max(MAX_BRIEF_UPLOAD_BASE64)}),
])
const extractionSchema=z.strictObject({
  blocks:z.array(z.strictObject({id:z.string().min(1).max(200),text:z.string().max(20_000),page:z.number().int().min(1).max(30).optional()})).max(10_000),
  attachments:z.array(z.strictObject({kind:z.enum(['image','pdf']),mimeType:z.string().min(1),bytes:z.custom(value=>Buffer.isBuffer(value)&&value.length>0&&value.length<=MAX_SOURCE_BYTES)})).max(1),
  parserVersion:z.string().min(1).max(100),
}).refine(value=>new Set(value.blocks.map(block=>block.id)).size===value.blocks.length)
  .refine(value=>value.blocks.reduce((sum,block)=>sum+block.text.length,0)<=20_000)
  .refine(value=>value.attachments.length>0||value.blocks.some(block=>block.text.trim()))
function authorize(actor,edit=false) {
  if (!actor?.id || actor.disabled || actor.disabledAt || !(edit?['marketer','admin']:['marketer','designer','admin']).includes(actor.role))
    throw briefSourceError('forbidden','You cannot access these campaign sources.',403)
}
function requireSourceRevision(sourceId,expectedRevision) {
  if (!identity.safeParse(sourceId).success || !Number.isSafeInteger(expectedRevision) || expectedRevision<0)
    throw briefSourceError('invalid_request','A source identity and revision are required.',400)
}
function decodeInput(value) {
  const parsed=inputSchema.safeParse(value)
  if (!parsed.success) throw briefSourceError('invalid_brief_file','Invalid source input.',400)
  const input=parsed.data, bytes=Buffer.from(input.kind==='text'?input.text:input.data,input.kind==='text'?'utf8':'base64')
  if (input.kind==='file' && bytes.toString('base64')!==input.data) throw briefSourceError('invalid_brief_file','Malformed attachment data.',400)
  if (!bytes.length || bytes.length>MAX_SOURCE_BYTES) throw briefSourceError('brief_file_too_large','Use a source of at most 25 MB.',413)
  return {bytes,name:input.kind==='text'?'Pasted text':input.name,kind:input.kind,mimeType:input.kind==='text'?'text/plain':input.mimeType,
    contentHash:createHash('sha256').update(bytes).digest('hex'),byteSize:bytes.length}
}
async function loadCampaign(client,campaignId,expectedRevision,edit) {
  const repo=createCampaignRepository(client), campaign=edit?await repo.findByIdForUpdate(campaignId):await repo.findById(campaignId)
  if (!campaign) throw briefSourceError('not_found','Campaign not found.',404)
  if (edit) {
    const allowed=applyArtifactEdit(campaign,'brief')
    if (!allowed.ok) throw briefSourceError(allowed.code,allowed.message,allowed.status)
    if (expectedRevision!==undefined && campaign.revision!==expectedRevision) throw briefSourceError('revision_conflict','The campaign changed. Refresh before editing sources.',409)
  }
  return campaign
}
async function refreshSourceIdentity(client,campaign) {
  const sources=await createBriefingRepository(client).listSources(campaign.id)
  const briefing=campaign.brief.briefing??initialBriefingState(campaign.brief)
  const sourceKey=hashCanonical(sourceProjection(campaign.brief,sources.map(row=>({id:row.id,contentHash:row.content_hash,parserVersion:row.parser_version}))))
  return createCampaignRepository(client).updateState({...campaign,expectedRevision:campaign.revision,
    brief:{...campaign.brief,analysis:null,briefing:{...briefing,sourceIds:sources.map(row=>row.id),sourceKey,analysisJobId:null,confirmation:null}},
    status:'draft',selectedCopyId:null,selectedDirectionId:null,compositionId:null})
}

export function createBriefSourceService({pool,assetStore,extractor=extractSource,idGenerator=randomUUID,clock=()=>new Date()}) {
  const expired=row=>clock().getTime()-new Date(row.updated_at).getTime()>30_000
  async function restart(client,campaign,row) {
    const source=(await client.query(`UPDATE brief_sources SET content_revision=content_revision+1,status='processing',error_code=NULL,
      blocks='[]'::jsonb,updated_at=now() WHERE campaign_id=$1 AND id=$2 RETURNING *`,[campaign.id,row.id])).rows[0]
    await refreshSourceIdentity(client,campaign)
    await createCampaignRepository(client).markArtifactsStale(campaign.id,{copy:true,directions:true,composition:true})
    return source
  }
  async function processSource({campaignId,sourceId,contentRevision,source,bytes,store=false}) {
    let parsed,errorCode=null
    try {
      if (store) {
        try {await assetStore.put({objectKey:source.object_key,bytes,contentType:source.mime_type})}
        catch (error) {
          if (error.code!=='object_exists') throw briefSourceError('source_storage_failed','The upload could not be saved. Retry the upload.')
          bytes=await assetStore.get({objectKey:source.object_key})
        }
      }
      else bytes=await assetStore.get({objectKey:source.object_key})
      if (!bytes) throw briefSourceError('source_bytes_unavailable','Upload this source again.')
      if (createHash('sha256').update(bytes).digest('hex')!==source.content_hash)
        throw briefSourceError('source_identity_conflict','Stored source content does not match the upload.')
      parsed=extractionSchema.parse(await extractor({bytes,mimeType:source.mime_type,name:source.name}))
    } catch (error) { errorCode=error.expose&&typeof error.code==='string'?error.code:'source_processing_failed' }
    return withTransaction(pool,async client=>{
      // Lock campaign before source writes, consistent with all source commands.
      const locked=await loadCampaign(client,campaignId,undefined,true)
      const current=await createBriefingRepository(client).findSource(campaignId,sourceId)
      if (!current || current.content_revision!==contentRevision) throw briefSourceError('source_changed','A newer source operation replaced this result.',409)
      if (parsed) {
        const others=await createBriefingRepository(client).listSources(campaignId)
        const characters=others.filter(row=>row.id!==sourceId).flatMap(row=>row.blocks).concat(parsed.blocks).reduce((sum,block)=>sum+block.text.length,0)
        if (characters>MAX_COLLECTION_TEXT) { parsed=null; errorCode='brief_collection_text_too_large' }
      }
      const result=await client.query(`UPDATE brief_sources SET status=$4,error_code=$5,blocks=$6,parser_version=$7,attachment_refs=$8,updated_at=now()
        WHERE campaign_id=$1 AND id=$2 AND content_revision=$3 RETURNING *`,
      [campaignId,sourceId,contentRevision,parsed?'ready':'failed',errorCode,JSON.stringify(parsed?.blocks??[]),parsed?.parserVersion??current.parser_version,JSON.stringify((parsed?.attachments??[]).map(({kind,mimeType})=>({kind,mimeType})))])
      const updated=await refreshSourceIdentity(client,locked)
      return {source:sourceSummary(result.rows[0]),campaignRevision:updated.revision}
    })
  }
  return {
    async putSource({actor,campaignId,sourceId,expectedRevision,input}) {
      authorize(actor,true)
      requireSourceRevision(sourceId,expectedRevision)
      const decoded=decodeInput(input)
      const reserved=await withTransaction(pool,async client=>{
        const campaign=await loadCampaign(client,campaignId,undefined,true),repo=createBriefingRepository(client)
        const existing=await repo.findSource(campaignId,sourceId,{includeRemoved:true})
        if (existing) {
          if (existing.removed_at || existing.content_hash!==decoded.contentHash || existing.mime_type!==decoded.mimeType || existing.name!==decoded.name)
            throw briefSourceError('source_identity_conflict','Use a new source identity for different material.',409)
          if (existing.status==='failed' && ['source_storage_failed','source_bytes_unavailable'].includes(existing.error_code)
            || existing.status==='processing' && expired(existing)) return {source:await restart(client,campaign,existing)}
          return {existing,revision:campaign.revision}
        }
        if (campaign.revision!==expectedRevision) throw briefSourceError('revision_conflict','The campaign changed. Refresh before uploading.',409)
        const sources=await repo.listSources(campaignId)
        if (sources.length>=MAX_BRIEF_SOURCES || sources.reduce((sum,row)=>sum+Number(row.byte_size),0)+decoded.byteSize>MAX_COLLECTION_BYTES)
          throw briefSourceError('brief_collection_too_large','Use at most 10 sources and 25 MB combined.',413)
        const source=await repo.insertSource(campaignId,{...decoded,id:sourceId,objectKey:`brief-sources/${idGenerator()}`})
        await refreshSourceIdentity(client,campaign)
        await createCampaignRepository(client).markArtifactsStale(campaignId,{copy:true,directions:true,composition:true})
        return {source}
      })
      if (reserved.existing) return {source:sourceSummary(reserved.existing),campaignRevision:reserved.revision}
      return processSource({campaignId,sourceId,contentRevision:reserved.source.content_revision,source:reserved.source,bytes:decoded.bytes,store:true})
    },
    async getSource({actor,campaignId,sourceId}) {
      authorize(actor)
      return withTransaction(pool,async client=>{
        const campaign=await loadCampaign(client,campaignId,undefined,false)
        if(sourceId==='campaign-input') {
          const raw=campaignInputSource(campaign)
          if(!raw) throw briefSourceError('not_found','Source not found.',404)
          return {source:{id:raw.id,name:raw.name,kind:'text',mimeType:'text/plain',byteSize:Buffer.byteLength(raw.blocks[0].text),status:'ready',errorCode:null,contentHash:raw.contentHash,contentRevision:1},blocks:raw.blocks}
        }
        const source=await createBriefingRepository(client).findSource(campaignId,sourceId)
        if (!source) throw briefSourceError('not_found','Source not found.',404)
        return {source:sourceSummary(source),blocks:source.blocks}
      })
    },
    async retrySource({actor,campaignId,sourceId,expectedRevision}) {
      authorize(actor,true)
      requireSourceRevision(sourceId,expectedRevision)
      const source=await withTransaction(pool,async client=>{
        const campaign=await loadCampaign(client,campaignId,expectedRevision,true)
        const row=await createBriefingRepository(client).findSource(campaignId,sourceId)
        if (!row) throw briefSourceError('not_found','Source not found.',404)
        if (row.status==='ready') throw briefSourceError('source_already_ready','This source is already ready to analyze.',409)
        if (row.status==='processing' && !expired(row)) throw briefSourceError('source_processing','This source is still processing.',409)
        return restart(client,campaign,row)
      })
      return processSource({campaignId,sourceId,contentRevision:source.content_revision,source})
    },
    async removeSource({actor,campaignId,sourceId,expectedRevision}) {
      authorize(actor,true)
      requireSourceRevision(sourceId,expectedRevision)
      return withTransaction(pool,async client=>{
        const campaign=await loadCampaign(client,campaignId,expectedRevision,true)
        const source=await createBriefingRepository(client).findSource(campaignId,sourceId)
        if (!source) throw briefSourceError('not_found','Source not found.',404)
        await client.query('UPDATE brief_sources SET removed_at=now() WHERE campaign_id=$1 AND id=$2',[campaignId,sourceId])
        const updated=await refreshSourceIdentity(client,campaign)
        await createCampaignRepository(client).markArtifactsStale(campaignId,{copy:true,directions:true,composition:true})
        return {campaignRevision:updated.revision}
      })
    },
  }
}
