import {expect,test,vi} from 'vitest'
import {createIsolatedStudio} from '../testing/isolatedStudio.js'
import {createMemoryAssetStore} from '../storage/memoryAssetStore.js'
import {createWorkflowService} from './workflowService.js'
import {createBriefSourceService} from './briefSourceService.js'
import {createGenerationService} from './generationService.js'
import {createGenerationControlPlane} from '../repositories/generationJobRepository.js'
import {createMockProvider} from '../providers/mockProvider.js'

test('rejected provider is settled without dispatch or a stranded reservation',async()=>{
  const studio=await createIsolatedStudio()
  try {
    const actor=studio.actor('marketer'),workflow=createWorkflowService({pool:studio.pool})
    const campaign=await workflow.createCampaign({actor,input:{title:'Boundary fixture',brief:{notes:'Synthetic school brief',briefing:{schemaVersion:2}}}})
    const mock=createMockProvider(),analyseBrief=vi.fn()
    const service=createGenerationService({pool:studio.pool,controlPlane:createGenerationControlPlane({pool:studio.pool}),providers:{mock:{...mock,sourceDestination:null,analyseBrief}}})
    const result=await service.analyseBrief({actor,campaignId:campaign.id,idempotencyKey:'boundary',input:{expectedRevision:campaign.revision}})
    expect(result.body.job).toMatchObject({status:'failed',errorCode:'brief_provider_approval_required'})
    expect(analyseBrief).not.toHaveBeenCalled()
    expect((await studio.pool.query('SELECT dispatch_state,actual_cost_microunits,attempts FROM generation_jobs')).rows[0]).toMatchObject({dispatch_state:'not_dispatched',actual_cost_microunits:'0',attempts:0})
  } finally {await studio.close()}
},30000)

test('combined source analysis produces a reviewable proposal and stops before copy generation',async()=>{
  const studio=await createIsolatedStudio(),assetStore=createMemoryAssetStore()
  try {
    const actor=studio.actor('marketer'),workflow=createWorkflowService({pool:studio.pool})
    let campaign=await workflow.createCampaign({actor,input:{title:'Sources',brief:{briefing:{schemaVersion:2}}}})
    const sources=createBriefSourceService({pool:studio.pool,assetStore})
    for(const [index,text] of ['Norwegian language school in Oslo.','Headline: Learn Norwegian — together.'].entries()) {
      await sources.putSource({actor,campaignId:campaign.id,sourceId:`s${index}`,expectedRevision:campaign.revision,input:{kind:'text',text}})
      campaign=await workflow.getCampaign({actor,campaignId:campaign.id})
    }
    const mock=createMockProvider(),analyseBrief=vi.fn((...args)=>mock.analyseBrief(...args))
    const service=createGenerationService({pool:studio.pool,assetStore,briefSourceService:sources,
      controlPlane:createGenerationControlPlane({pool:studio.pool}),providers:{mock:{...mock,analyseBrief}}})
    const result=await service.analyseBrief({actor,campaignId:campaign.id,idempotencyKey:'analysis',input:{expectedRevision:campaign.revision}})
    expect(result.body.job.status).toBe('succeeded')
    expect(analyseBrief.mock.calls[0][0].sources.map(source=>source.id)).toEqual(['s0','s1'])
    campaign=await workflow.getCampaign({actor,campaignId:campaign.id})
    expect(campaign.brief.briefing.analysisJobId).toBe(result.body.job.id)
    expect(campaign.brief.briefing.confirmation).toBeNull()
    expect(campaign.brief.analysis.briefingProposal.foundCopy[0].fields.headline).toBe('Learn Norwegian — together.')
    await expect(service.generateCopy({actor,campaignId:campaign.id,idempotencyKey:'premature',input:{}}))
      .rejects.toMatchObject({code:'brief_confirmation_required'})
    expect((await studio.pool.query("SELECT step FROM generation_jobs")).rows).toEqual([{step:'brief_analysis'}])
  } finally {await assetStore.close();await studio.close()}
},30000)
