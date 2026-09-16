import { createHash } from 'node:crypto'
import { createBriefingRepository } from '../repositories/briefingRepository.js'
import { briefSourceError } from './sourceExtractor.js'
import { detectSourceType } from './sourceType.js'
import { MAX_COLLECTION_TEXT } from '../../shared/briefingContracts.js'

export function campaignInputSource(campaign) {
  const text=['product','audience','objective','offer','notes'].map(key=>campaign.brief[key]).filter(Boolean).join('\n\n')
  return text?{id:'campaign-input',name:'Campaign input',contentHash:createHash('sha256').update(text).digest('hex'),blocks:[{id:'text-1',text}],attachmentRefs:[]}:null
}
export async function loadAnalysisSources(client,campaign) {
  const rows=await createBriefingRepository(client).listSources(campaign.id)
  if (rows.some(row=>row.status!=='ready')) throw briefSourceError('brief_sources_not_ready','Remove or retry unreadable sources before analyzing.',409)
  const sources=rows.map(row=>({id:row.id,name:row.name,contentHash:row.content_hash,blocks:row.blocks,
    // Byte format is validated again when resolving the private object.
    attachmentRefs:row.attachment_refs??[]}))
  const raw=campaignInputSource(campaign)
  if(raw) sources.unshift(raw)
  if(!sources.length) throw briefSourceError('brief_required','Add campaign materials before analyzing.',422)
  if(sources.reduce((sum,source)=>sum+source.blocks.reduce((n,b)=>n+b.text.length,0),0)>MAX_COLLECTION_TEXT)
    throw briefSourceError('brief_text_too_large','The combined source text exceeds the safe analysis limit.',413)
  return sources
}

export async function resolveAnalysisSources(sources,assetStore,{pool,campaignId}) {
  return Promise.all(sources.map(async(source)=>{
    if(!source.attachmentRefs.length) return source
    if(!assetStore) throw briefSourceError('brief_storage_unavailable','Source storage is unavailable.',503)
    const row=await createBriefingRepository(pool).findSource(campaignId,source.id)
    if(!row || row.content_hash!==source.contentHash) throw briefSourceError('source_bytes_unavailable','The saved source changed. Analyze it again.',409)
    const stored=await assetStore.get({objectKey:row.object_key})
    if(!stored) throw briefSourceError('source_bytes_unavailable','The saved source could not be read.')
    const bytes=Buffer.from(stored)
    if(createHash('sha256').update(bytes).digest('hex')!==source.contentHash) throw briefSourceError('source_bytes_unavailable','The saved source could not be verified.')
    const detected=detectSourceType(bytes,source.attachmentRefs[0].mimeType)
    return {...source,attachments:[{mimeType:detected.mimeType,data:bytes.toString('base64')}]}
  }))
}
