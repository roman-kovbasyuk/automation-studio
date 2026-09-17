import { expect, test, vi } from 'vitest'
import { createIsolatedStudio } from '../testing/isolatedStudio.js'
import { createBriefSourceService } from './briefSourceService.js'
import { createMemoryAssetStore } from '../storage/memoryAssetStore.js'
import { createWorkflowService } from './workflowService.js'

test('permits sources over five MB but enforces 25 MB combined and frees the budget on removal',async()=>{
  const studio=await createIsolatedStudio(),assetStore=createMemoryAssetStore()
  try {
    const actor=studio.actor('marketer'),workflow=createWorkflowService({pool:studio.pool})
    const campaign=await workflow.createCampaign({actor,input:{title:'Upload budget',brief:{briefing:{schemaVersion:2}}}})
    const extractor=vi.fn(async()=>({blocks:[{id:'text-1',text:'Synthetic context'}],attachments:[],parserVersion:'test'}))
    const service=createBriefSourceService({pool:studio.pool,assetStore,extractor})
    const request={actor,campaignId:campaign.id,sourceId:'large',expectedRevision:campaign.revision,
      input:{kind:'file',name:'context.custom',mimeType:'application/octet-stream',data:Buffer.alloc(13*1024*1024,65).toString('base64')}}
    const first=await service.putSource(request)
    expect(first.source).toMatchObject({status:'ready',byteSize:13*1024*1024})
    await expect(service.putSource({...request,sourceId:'overflow',expectedRevision:first.campaignRevision}))
      .rejects.toMatchObject({code:'brief_collection_too_large'})
    expect(extractor).toHaveBeenCalledTimes(1)
    const removed=await service.removeSource({...request,expectedRevision:first.campaignRevision})
    expect((await service.putSource({...request,sourceId:'replacement',expectedRevision:removed.campaignRevision})).source.status).toBe('ready')
  } finally {await assetStore.close();await studio.close()}
},30000)

test('v2 campaign creation always starts the canonical briefing',async()=>{
  const studio=await createIsolatedStudio()
  try {
    const created=await createWorkflowService({pool:studio.pool}).createCampaign({actor:studio.actor('marketer'),
      input:{title:'Always canonical',brief:{briefing:{schemaVersion:2}}}})
    expect(created.brief.briefing).toMatchObject({schemaVersion:2,analysisJobId:null,confirmation:null})
  } finally {await studio.close()}
},30000)

test('sources persist independently, replay safely, fail visibly and invalidate analysis on removal', async () => {
  const studio = await createIsolatedStudio()
  const assetStore = createMemoryAssetStore()
  try {
    const actor=studio.actor('marketer'), workflow=createWorkflowService({pool:studio.pool})
    const campaign=await workflow.createCampaign({actor,input:{title:'Sources',brief:{briefing:{schemaVersion:2}}}})
    expect(campaign.brief.briefing).toMatchObject({schemaVersion:2,sourceIds:[],analysisJobId:null,confirmation:null})
    const service=createBriefSourceService({pool:studio.pool,assetStore})
    const request={actor,campaignId:campaign.id,sourceId:'source-1',expectedRevision:campaign.revision,
      input:{kind:'text',text:'  Learn Norwegian — together.\n'}}
    const first=await service.putSource(request), replay=await service.putSource(request)
    expect(first.source.status).toBe('ready')
    await expect(service.retrySource({...request,expectedRevision:first.campaignRevision})).rejects.toMatchObject({code:'source_already_ready'})
    expect((await workflow.getCampaign({actor,campaignId:campaign.id})).revision).toBe(first.campaignRevision)
    expect(replay).toEqual(first)
    expect((await service.getSource(request)).blocks[0].text).toBe(request.input.text)
    await expect(service.putSource({...request,input:{kind:'text',text:'Different'}})).rejects.toMatchObject({code:'source_identity_conflict'})
    await expect(service.getSource({...request,actor:{...actor,disabled:true}})).rejects.toMatchObject({code:'forbidden'})
    await expect(service.getSource({...request,campaignId:'foreign'})).rejects.toMatchObject({code:'not_found'})
    await expect(service.retrySource({...request,expectedRevision:undefined})).rejects.toMatchObject({code:'invalid_request'})
    await expect(service.removeSource({...request,expectedRevision:undefined})).rejects.toMatchObject({code:'invalid_request'})
    const bad=await service.putSource({...request,sourceId:'bad-pdf',expectedRevision:first.campaignRevision,
      input:{kind:'file',name:'brief.pdf',mimeType:'application/pdf',data:Buffer.from('%PDF-1.7\ninvalid').toString('base64')}})
    expect(bad.source).toMatchObject({status:'failed',errorCode:'unreadable_brief_file'})
    const removed=await service.removeSource({...request,sourceId:'bad-pdf',expectedRevision:bad.campaignRevision})
    const loaded=await workflow.getCampaign({actor,campaignId:campaign.id})
    expect(loaded.brief.briefing.sourceIds).toEqual(['source-1'])
    expect(loaded.brief.briefing.analysisJobId).toBeNull()
    expect(removed.campaignRevision).toBe(loaded.revision)
    expect((await studio.pool.query('SELECT count(*)::int AS n FROM generation_jobs')).rows[0].n).toBe(0)
  } finally { await assetStore.close(); await studio.close() }
},30000)

test('processing uploads cannot be superseded by retry, and recovered immutable objects are verified', async () => {
  const studio=await createIsolatedStudio(),store=createMemoryAssetStore()
  try {
    const actor=studio.actor('marketer'),workflow=createWorkflowService({pool:studio.pool})
    const campaign=await workflow.createCampaign({actor,input:{title:'Fenced recovery',brief:{briefing:{schemaVersion:2}}}})
    let release,start
    const started=new Promise(resolve=>{start=resolve}),gate=new Promise(resolve=>{release=resolve})
    const service=createBriefSourceService({pool:studio.pool,assetStore:{...store,put:async input=>{start();await gate;return store.put(input)}}})
    const request={actor,campaignId:campaign.id,sourceId:'s1',expectedRevision:campaign.revision,input:{kind:'text',text:'Exact original'}}
    const pending=service.putSource(request)
    await started
    const current=await workflow.getCampaign({actor,campaignId:campaign.id})
    await expect(service.retrySource({...request,expectedRevision:current.revision})).rejects.toMatchObject({code:'source_processing'})
    expect((await service.putSource(request)).source.status).toBe('processing')
    release()
    expect((await pending).source.status).toBe('ready')
    // Simulate a crash after private bytes were saved but before parsing committed.
    await studio.pool.query("UPDATE brief_sources SET status='processing',updated_at=now()-interval '31 seconds' WHERE campaign_id=$1 AND id='s1'",[campaign.id])
    const recovered=await service.putSource(request)
    expect(recovered.source).toMatchObject({status:'ready',contentRevision:2})
    expect((await service.getSource(request)).blocks[0].text).toBe('Exact original')
  } finally {await store.close();await studio.close()}
},30000)

test('an identical upload can recover original bytes after a storage failure', async () => {
  const studio=await createIsolatedStudio(),store=createMemoryAssetStore()
  try {
    const actor=studio.actor('marketer'),workflow=createWorkflowService({pool:studio.pool})
    const campaign=await workflow.createCampaign({actor,input:{title:'Recovery',brief:{briefing:{schemaVersion:2}}}})
    const put=vi.fn().mockRejectedValueOnce(new Error('Temporary storage failure')).mockImplementation(input=>store.put(input))
    const service=createBriefSourceService({pool:studio.pool,assetStore:{...store,put}})
    const request={actor,campaignId:campaign.id,sourceId:'s1',expectedRevision:campaign.revision,input:{kind:'text',text:'Original copy'}}
    const first=await service.putSource(request)
    expect(first.source.status).toBe('failed')
    const recovered=await service.putSource(request)
    expect(recovered.source.status).toBe('ready')
    expect((await service.getSource(request)).blocks[0].text).toBe('Original copy')
    expect(put).toHaveBeenCalledTimes(2)
  } finally {await store.close();await studio.close()}
},30000)

test('invalid extractor output is recorded as a visible failure rather than stuck processing', async () => {
  const studio=await createIsolatedStudio(),assetStore=createMemoryAssetStore()
  try {
    const actor=studio.actor('marketer'),workflow=createWorkflowService({pool:studio.pool})
    const campaign=await workflow.createCampaign({actor,input:{title:'Parser result',brief:{briefing:{schemaVersion:2}}}})
    const service=createBriefSourceService({pool:studio.pool,assetStore,extractor:async()=>({})})
    const result=await service.putSource({actor,campaignId:campaign.id,sourceId:'s1',expectedRevision:campaign.revision,input:{kind:'text',text:'Original'}})
    expect(result.source).toMatchObject({status:'failed',errorCode:'source_processing_failed'})
  } finally {await assetStore.close();await studio.close()}
},30000)

test('legacy brief PATCH cannot erase server-owned v2 source state', async () => {
  const studio=await createIsolatedStudio(),assetStore=createMemoryAssetStore()
  try {
    const actor=studio.actor('marketer'),workflow=createWorkflowService({pool:studio.pool})
    const campaign=await workflow.createCampaign({actor,input:{title:'Patch compatibility',brief:{briefing:{schemaVersion:2}}}})
    const service=createBriefSourceService({pool:studio.pool,assetStore})
    const added=await service.putSource({actor,campaignId:campaign.id,sourceId:'s1',expectedRevision:campaign.revision,input:{kind:'text',text:'Original'}})
    const before=await workflow.getCampaign({actor,campaignId:campaign.id})
    const updated=await workflow.patchCampaign({actor,campaignId:campaign.id,expectedRevision:added.campaignRevision,patch:{brief:{notes:'New context'}}})
    expect(updated.brief.briefing.sourceIds).toEqual(['s1'])
    expect(updated.brief.briefing.sourceKey).not.toBe(before.brief.briefing.sourceKey)
    expect(updated.brief.briefing.confirmation).toBeNull()
  } finally {await assetStore.close();await studio.close()}
},30000)
