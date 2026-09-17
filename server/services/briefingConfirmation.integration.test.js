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

async function analysedCampaign(studio,notes,key) {
  const actor=studio.actor('marketer'),workflow=createWorkflowService({pool:studio.pool})
  const created=await workflow.createCampaign({actor,input:{title:'Synthetic',brief:{notes,briefing:{schemaVersion:2}}}})
  const generation=createGenerationService({pool:studio.pool,controlPlane:createGenerationControlPlane({pool:studio.pool}),providers:{mock:createMockProvider()}})
  await generation.analyseBrief({actor,campaignId:created.id,idempotencyKey:`analyze-${key}`,input:{expectedRevision:created.revision}})
  const campaign=await workflow.getCampaign({actor,campaignId:created.id}),state=campaign.brief.briefing,service=createBriefingService({pool:studio.pool})
  const confirm=async(idempotencyKey,answers)=>service.confirm({actor,campaignId:campaign.id,idempotencyKey,
    expectedRevision:(await workflow.getCampaign({actor,campaignId:campaign.id})).revision,
    input:{analysisJobId:state.analysisJobId,sourceKey:state.sourceKey,answers:{...state.answers,reach:'local',goal:'signups',...answers}}})
  const copySets=async()=>(await studio.pool.query('SELECT origin FROM copy_sets WHERE campaign_id=$1',[campaign.id])).rows
  return {confirm,copySets}
}

test('keeping found copy with new copy imports it once and writes copy for each new set of copy settings',async()=>{
  const studio=await createIsolatedStudio()
  try {
    const {confirm,copySets}=await analysedCampaign(studio,'Headline: Learn Norwegian — together.','keep-and-create')
    const first=await confirm('keep-and-create',{copyMode:'keep_and_create'})
    expect(first).toMatchObject({initialCopy:'offer_generation',importedCopySetId:expect.any(String)})
    expect(await copySets()).toEqual([{origin:'supplied'}])
    expect((await confirm('retag',{copyMode:'keep_and_create',visualTags:['Oslo']})).initialCopy).toBe('skip')
    expect(await confirm('new-goal',{copyMode:'keep_and_create',visualTags:['Oslo'],goal:'sales'}))
      .toMatchObject({initialCopy:'offer_generation',importedCopySetId:first.importedCopySetId})
    expect(await copySets()).toEqual([{origin:'supplied'}])
  } finally {await studio.close()}
},30000)

test('found copy is always kept, and copy can be kept only when it was found',async()=>{
  const studio=await createIsolatedStudio()
  try {
    const found=await analysedCampaign(studio,'Headline: Learn Norwegian — together.','found')
    await expect(found.confirm('drop',{copyMode:'create_new'})).rejects.toMatchObject({code:'found_copy_not_kept',statusCode:422})
    expect(await found.copySets()).toEqual([])
    const none=await analysedCampaign(studio,'Norwegian courses for adults in Oslo.','none')
    for(const copyMode of ['keep_original','keep_and_create'])
      await expect(none.confirm(copyMode,{copyMode})).rejects.toMatchObject({code:'no_supplied_copy',statusCode:422})
    expect((await none.confirm('create',{copyMode:'create_new'})).initialCopy).toBe('offer_generation')
  } finally {await studio.close()}
},30000)

test('keeping found copy with new copy needs room for five new options',async()=>{
  const studio=await createIsolatedStudio()
  try {
    const notes=Array.from({length:26},(_,index)=>`Headline: Option ${index+1}`).join('\n')
    const {confirm,copySets}=await analysedCampaign(studio,notes,'crowded')
    await expect(confirm('crowded',{copyMode:'keep_and_create'})).rejects.toMatchObject({code:'copy_capacity_exceeded',statusCode:409,
      message:'Delete copy options to make room for the found copy and five new options.'})
    expect(await copySets()).toEqual([])
    expect((await confirm('fits',{copyMode:'keep_original'})).initialCopy).toBe('skip')
    expect(await copySets()).toEqual([{origin:'supplied'}])
  } finally {await studio.close()}
},30000)
