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
import {createVersionService} from './versionService.js'
import {createMemoryAssetStore} from '../storage/memoryAssetStore.js'
import {studioTemplates} from '../../shared/studioTemplates.js'
import {copyProjection} from '../../shared/briefingDependencies.js'
import {hashCanonical} from '../../shared/canonicalJson.js'

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

test('changed copy settings keep the same edited supplied copy selectable alongside replacement options',async()=>{
  const studio=await createIsolatedStudio()
  try {
    const actor=studio.actor('marketer'),workflow=createWorkflowService({pool:studio.pool})
    let campaign=await workflow.createCampaign({actor,input:{title:'Synthetic',brief:{notes:'Headline: Learn Norwegian — together.\nHeadline: Study at your pace.',briefing:{schemaVersion:2}}}})
    const generation=createGenerationService({pool:studio.pool,controlPlane:createGenerationControlPlane({pool:studio.pool}),providers:{mock:createMockProvider()}})
    const service=createBriefingService({pool:studio.pool}),workspaceService=createWorkspaceService({pool:studio.pool})
    await generation.analyseBrief({actor,campaignId:campaign.id,idempotencyKey:'analysis',input:{expectedRevision:campaign.revision}})
    campaign=await workflow.getCampaign({actor,campaignId:campaign.id})
    const state=campaign.brief.briefing
    const confirm=async(key,goal)=>{
      const current=await workflow.getCampaign({actor,campaignId:campaign.id})
      return service.confirm({actor,campaignId:campaign.id,expectedRevision:current.revision,idempotencyKey:key,
        input:{analysisJobId:state.analysisJobId,sourceKey:state.sourceKey,answers:{...state.answers,copyMode:'keep_and_create',reach:'local',goal}}})
    }
    const first=await confirm('first','signups')
    expect((await generation.generateCopy({actor,campaignId:campaign.id,idempotencyKey:'first-options',input:{}})).body.job.status).toBe('succeeded')
    const original=(await studio.pool.query('SELECT * FROM copy_sets WHERE id=$1',[first.importedCopySetId])).rows[0]
    expect(original.candidates).toHaveLength(2)
    const [edited,deleted]=original.candidates
    let current=await workflow.getCampaign({actor,campaignId:campaign.id})
    await generation.editCopy({actor,campaignId:campaign.id,expectedRevision:current.revision,input:{copyId:edited.id,headline:'  Edited original.  ',body:'',offer:'',cta:''}})
    current=await workflow.getCampaign({actor,campaignId:campaign.id})
    await generation.deleteCopy({actor,campaignId:campaign.id,expectedRevision:current.revision,input:{copyId:deleted.id}})
    const second=await confirm('changed-goal','sales')
    expect(second).toMatchObject({initialCopy:'offer_generation',importedCopySetId:first.importedCopySetId})
    expect((await generation.generateCopy({actor,campaignId:campaign.id,idempotencyKey:'replacement-options',input:{}})).body.job.status).toBe('succeeded')
    const workspace=await workspaceService.getWorkspace({actor,campaignId:campaign.id})
    const supplied=workspace.copies.find(set=>set.id===first.importedCopySetId)
    expect(supplied).toMatchObject({origin:'supplied',stale:false,candidates:[expect.objectContaining({id:edited.id,headline:'  Edited original.  '})]})
    expect(workspace.copies.some(set=>set.id!==supplied.id&&!set.stale)).toBe(true)
    const stored=(await studio.pool.query('SELECT * FROM copy_sets WHERE id=$1',[first.importedCopySetId])).rows[0]
    expect(stored.original_candidates).toEqual(original.original_candidates)
    expect(stored.deleted_candidate_ids).toContain(deleted.id)
    expect(stored.retained_brief_hash).toBe(hashCanonical(copyProjection(workspace.campaign.brief)))
    expect(stored.source_confirmation_id).toBe(original.source_confirmation_id)
    expect(stored.copy_source_key).toBe(original.copy_source_key)
    await generation.approveCopy({actor,campaignId:campaign.id,expectedRevision:workspace.campaign.revision,input:{copyId:edited.id}})
    const selected=await workflow.getCampaign({actor,campaignId:campaign.id})
    const versions=createVersionRepository(studio.pool)
    const copy=await versions.findSelectedCopy(campaign.id,first.importedCopySetId)
    const analysis=await versions.findLatestBriefAnalysis(campaign.id)
    expect(()=>verifyCopyLineage(copy,selected.brief,analysis)).not.toThrow()
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

test('reads a historical under-18 answer without changing its hash and requires an adult range for reconfirmation',async()=>{
  const studio=await createIsolatedStudio(),assetStore=createMemoryAssetStore()
  try {
    const actor=studio.actor('marketer'),workflow=createWorkflowService({pool:studio.pool})
    const created=await workflow.createCampaign({actor,input:{title:'Legacy audience',brief:{notes:'Headline: Learn together.',briefing:{schemaVersion:2}}}})
    const generation=createGenerationService({pool:studio.pool,assetStore,controlPlane:createGenerationControlPlane({pool:studio.pool}),providers:{mock:createMockProvider()}})
    await generation.analyseBrief({actor,campaignId:created.id,idempotencyKey:'analysis',input:{expectedRevision:created.revision}})
    await studio.pool.query(`UPDATE campaigns SET brief=jsonb_set(brief,'{briefing,answers,ageGroups}','["under_18"]'::jsonb) WHERE id=$1`,[created.id])
    await studio.pool.query(`UPDATE campaigns SET brief=jsonb_set(brief,'{analysis,briefingProposal,answers,ageGroups}','["under_18"]'::jsonb) WHERE id=$1`,[created.id])
    await studio.pool.query(`UPDATE generation_jobs SET result_metadata=jsonb_set(result_metadata,'{analysis,briefingProposal,answers,ageGroups}','["under_18"]'::jsonb) WHERE campaign_id=$1 AND step='brief_analysis'`,[created.id])
    const before=(await studio.pool.query('SELECT brief FROM campaigns WHERE id=$1',[created.id])).rows[0].brief
    const workspace=await createWorkspaceService({pool:studio.pool}).getWorkspace({actor,campaignId:created.id})
    const state=workspace.campaign.brief.briefing
    expect(state.answers.ageGroups).toEqual(['under_18'])
    expect((await studio.pool.query('SELECT brief FROM campaigns WHERE id=$1',[created.id])).rows[0].brief).toEqual(before)
    const service=createBriefingService({pool:studio.pool})
    await expect(service.confirm({actor,campaignId:created.id,expectedRevision:workspace.campaign.revision,idempotencyKey:'reconfirm',
      input:{sourceKey:state.sourceKey,analysisJobId:state.analysisJobId,answers:{...state.answers,copyMode:'keep_original',reach:'local',goal:'signups'}}}))
      .rejects.toMatchObject({code:'invalid_brief_answers',statusCode:422,message:'Choose an age range starting at 18.'})
    expect((await studio.pool.query('SELECT brief FROM campaigns WHERE id=$1',[created.id])).rows[0].brief).toEqual(before)
    const corrected=await service.confirm({actor,campaignId:created.id,expectedRevision:workspace.campaign.revision,idempotencyKey:'corrected',
      input:{sourceKey:state.sourceKey,analysisJobId:state.analysisJobId,answers:{...state.answers,ageGroups:['25_34','35_44'],copyMode:'keep_original',reach:'local',goal:'signups'}}})
    expect(corrected.importedCopySetId).toEqual(expect.any(String))
    expect((await generation.generateCopy({actor,campaignId:created.id,idempotencyKey:'adult-copy',input:{}})).body.job.status).toBe('succeeded')
    expect((await generation.generateDirections({actor,campaignId:created.id,idempotencyKey:'adult-directions',input:{mode:'campaign',context:{tags:[],note:''}}})).body.job.status).toBe('succeeded')
    const read=()=>createWorkspaceService({pool:studio.pool}).getWorkspace({actor,campaignId:created.id})
    let current=await read()
    const generated=current.copies.find(set=>set.id!==corrected.importedCopySetId)
    const generatedCopy=generated.candidates[0]
    await generation.approveCopy({actor,campaignId:created.id,expectedRevision:current.campaign.revision,input:{copyId:generatedCopy.id}})
    const repository=createVersionRepository(studio.pool)
    const selectedCopy=await repository.findSelectedCopy(created.id,generated.id)
    const selectedCampaign=await workflow.getCampaign({actor,campaignId:created.id})
    const selectedAnalysis=await repository.findLatestBriefAnalysis(created.id)
    expect(()=>verifyCopyLineage(selectedCopy,selectedCampaign.brief,selectedAnalysis)).not.toThrow()
    current=await read()
    const direction=current.directions[0]
    await generation.generateImage({actor,campaignId:created.id,idempotencyKey:'adult-image',input:{directionId:direction.id,width:1000,height:1000}})
    current=await read()
    await generation.selectDirection({actor,campaignId:created.id,expectedRevision:current.campaign.revision,input:{directionId:direction.id}})
    const versions=createVersionService({pool:studio.pool,assetStore})
    current=await read()
    await versions.saveBannerBatch({actor,campaignId:created.id,expectedRevision:current.campaign.revision,
      input:{designs:[{templateId:studioTemplates[0].id,templateVersion:studioTemplates[0].version,copySetId:generated.id,copyId:generatedCopy.id,directionId:direction.id}],ratioIds:['square']}})
    current=await read()
    const review=await versions.createVersion({actor,campaignId:created.id,expectedRevision:current.campaign.revision,idempotencyKey:'adult-review',input:{}})
    expect(review.body.campaign.status).toBe('in_review')
    expect(review.body.version.snapshot.selectedCopy.id).toBe(generatedCopy.id)
    const plan=(await studio.pool.query('SELECT plan FROM review_version_builds WHERE campaign_id=$1',[created.id])).rows[0].plan
    expect(plan.briefAnalysis.result.analysis.briefingProposal.answers.ageGroups).toEqual(['under_18'])
    const historical=(await studio.pool.query('SELECT brief FROM campaigns WHERE id=$1',[created.id])).rows[0].brief
    expect(historical.analysis.briefingProposal.answers.ageGroups).toEqual(['under_18'])
    expect((await studio.pool.query("SELECT result_metadata->'analysis'->'briefingProposal'->'answers'->'ageGroups' AS ages FROM generation_jobs WHERE campaign_id=$1 AND step='brief_analysis'",[created.id])).rows[0].ages).toEqual(['under_18'])
  } finally {await assetStore.close();await studio.close()}
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

test('writing new copy after previously keeping the same settings verbatim still writes copy',async()=>{
  const studio=await createIsolatedStudio()
  try {
    const {confirm,copySets}=await analysedCampaign(studio,'Headline: Learn Norwegian — together.','kept-then-written')
    const kept=await confirm('kept',{copyMode:'keep_original'})
    expect(kept.initialCopy).toBe('skip')
    expect(await copySets()).toEqual([{origin:'supplied'}])
    // Same copy settings as the kept confirmation, only the copy choice changes.
    const written=await confirm('written',{copyMode:'keep_and_create'})
    expect(written).toMatchObject({initialCopy:'offer_generation',importedCopySetId:kept.importedCopySetId})
    expect(await copySets()).toEqual([{origin:'supplied'}])
  } finally {await studio.close()}
},30000)
