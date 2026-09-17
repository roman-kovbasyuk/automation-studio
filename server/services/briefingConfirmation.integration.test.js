import {expect,test} from 'vitest'
import {createIsolatedStudio} from '../testing/isolatedStudio.js'
import {createWorkflowService} from './workflowService.js'
import {createGenerationService} from './generationService.js'
import {createGenerationControlPlane} from '../repositories/generationJobRepository.js'
import {createMockProvider} from '../providers/mockProvider.js'
import {createBriefingService} from './briefingService.js'
import {createWorkspaceService} from './workspaceService.js'
import {createVersionRepository} from '../repositories/versionRepository.js'
import {verifyCopyLineage} from './versionService.js'

test('confirmation imports exact original copy once, preserves deletion on reconfirm, and gates generation',async()=>{
  const studio=await createIsolatedStudio()
  try {
    const actor=studio.actor('marketer'),workflow=createWorkflowService({pool:studio.pool})
    let campaign=await workflow.createCampaign({actor,input:{title:'Synthetic',brief:{notes:'Headline: Learn Norwegian — together.',briefing:{schemaVersion:2}}}})
    const generation=createGenerationService({pool:studio.pool,controlPlane:createGenerationControlPlane({pool:studio.pool}),providers:{mock:createMockProvider()}})
    await generation.analyseBrief({actor,campaignId:campaign.id,idempotencyKey:'analyze',input:{expectedRevision:campaign.revision}})
    campaign=await workflow.getCampaign({actor,campaignId:campaign.id})
    const service=createBriefingService({pool:studio.pool}),state=campaign.brief.briefing
    const request={actor,campaignId:campaign.id,expectedRevision:campaign.revision,idempotencyKey:'confirm',
      input:{analysisJobId:state.analysisJobId,sourceKey:state.sourceKey,answers:{...state.answers,copyMode:'keep_original',reach:'local',goal:'signups'}}}
    const receipt=await service.confirm(request)
    expect(receipt.initialCopy).toBe('skip')
    expect(await service.confirm(request)).toEqual(receipt)
    const sets=(await studio.pool.query('SELECT * FROM copy_sets WHERE campaign_id=$1',[campaign.id])).rows
    expect(sets).toHaveLength(1)
    expect(sets[0].candidates[0]).toMatchObject({headline:'Learn Norwegian — together.',body:'',cta:'',visualPrompt:''})
    expect(sets[0].generation_job_id).toBeNull()
    const workspace=await createWorkspaceService({pool:studio.pool}).getWorkspace({actor,campaignId:campaign.id})
    expect(workspace.copies[0].origin).toBe('supplied')
    expect(workspace.copies[0].candidates[0]).toMatchObject({headline:'Learn Norwegian — together.',body:'',cta:'',visualPrompt:''})
    await generation.editCopy({actor,campaignId:campaign.id,expectedRevision:workspace.campaign.revision,input:{copyId:sets[0].candidates[0].id,headline:'  Exact edited wording.  ',body:'',offer:'',cta:''}})
    expect((await createWorkspaceService({pool:studio.pool}).getWorkspace({actor,campaignId:campaign.id})).copies[0].candidates[0].headline).toBe('  Exact edited wording.  ')
    const edited=await workflow.getCampaign({actor,campaignId:campaign.id})
    await generation.approveCopy({actor,campaignId:campaign.id,expectedRevision:edited.revision,input:{copyId:sets[0].candidates[0].id}})
    const approved=await workflow.getCampaign({actor,campaignId:campaign.id}),versions=createVersionRepository(studio.pool)
    const copy=await versions.findSelectedCopy(campaign.id,sets[0].id),analysis=await versions.findLatestBriefAnalysis(campaign.id)
    expect(()=>verifyCopyLineage(copy,approved.brief,analysis)).not.toThrow()
    expect(()=>verifyCopyLineage({...copy,authoredSnapshot:null},approved.brief,analysis)).toThrow()
    expect(()=>verifyCopyLineage({...copy,candidates:[{...copy.candidates[0],headline:'Tampered'}]},approved.brief,analysis)).toThrow()
    await generation.deleteCopy({actor,campaignId:campaign.id,expectedRevision:approved.revision,input:{copyId:sets[0].candidates[0].id}})
    const current=await workflow.getCampaign({actor,campaignId:campaign.id})
    const second=await service.confirm({...request,idempotencyKey:'retag',expectedRevision:current.revision,
      input:{...request.input,answers:{...request.input.answers,visualTags:['Oslo']}}})
    expect(second.initialCopy).toBe('skip')
    expect((await studio.pool.query('SELECT count(*)::int AS n FROM copy_sets WHERE campaign_id=$1',[campaign.id])).rows[0].n).toBe(1)
    expect((await studio.pool.query('SELECT step FROM generation_jobs')).rows).toEqual([{step:'brief_analysis'}])
    expect((await generation.generateCopy({actor,campaignId:campaign.id,idempotencyKey:'explicit',input:{}})).body.job.status).toBe('succeeded')
  } finally {await studio.close()}
},30000)
