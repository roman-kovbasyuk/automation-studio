import {expect,test} from 'vitest'
import {createIsolatedStudio} from '../testing/isolatedStudio.js'
import {createMemoryAssetStore} from '../storage/memoryAssetStore.js'
import {createWorkflowService} from './workflowService.js'
import {createBriefingService} from './briefingService.js'
import {createGenerationService} from './generationService.js'
import {createGenerationControlPlane} from '../repositories/generationJobRepository.js'
import {createWorkspaceService} from './workspaceService.js'
import {createVersionService} from './versionService.js'
import {createMockProvider} from '../providers/mockProvider.js'
import {studioTemplates} from '../../shared/studioTemplates.js'

test('confirmed supplied copy reaches visual generation and an immutable banner review',async()=>{
  const studio=await createIsolatedStudio(),assetStore=createMemoryAssetStore()
  try {
    const actor=studio.actor('marketer'),workflow=createWorkflowService({pool:studio.pool})
    const campaign=await workflow.createCampaign({actor,input:{title:'Local course',brief:{notes:'Headline: Learn together.',briefing:{schemaVersion:2}}}})
    const common={actor,campaignId:campaign.id},read=()=>createWorkspaceService({pool:studio.pool}).getWorkspace(common)
    const generation=createGenerationService({pool:studio.pool,assetStore,controlPlane:createGenerationControlPlane({pool:studio.pool}),providers:{mock:createMockProvider()}})
    await generation.analyseBrief({...common,input:{},idempotencyKey:'analysis'})
    const analyzed=await read(),state=analyzed.campaign.brief.briefing
    await createBriefingService({pool:studio.pool}).confirm({...common,expectedRevision:analyzed.campaign.revision,idempotencyKey:'confirm',input:{sourceKey:state.sourceKey,analysisJobId:state.analysisJobId,
      answers:{...state.answers,summary:'Evening Norwegian courses in Oslo',audience:'Adults learning Norwegian',copyMode:'keep_original',reach:'local',goal:'signups',visualTags:['Oslo','Evening classroom']}}})
    let current=await read(),set=current.copies[0],copy=set.candidates[0]
    await generation.editCopy({...common,expectedRevision:current.campaign.revision,input:{copyId:copy.id,headline:copy.headline,body:'Norwegian evening classes.',offer:'',cta:'Join us'}})
    await generation.approveCopy({...common,expectedRevision:(await read()).campaign.revision,input:{copyId:copy.id}})
    const selected=await read(),reviewed=selected.campaign.brief.briefing
    await createBriefingService({pool:studio.pool}).confirm({...common,expectedRevision:selected.campaign.revision,idempotencyKey:'retag',input:{sourceKey:reviewed.sourceKey,analysisJobId:reviewed.analysisJobId,
      answers:{...reviewed.answers,visualTags:['Oslo','Local classroom']}}})
    expect((await read()).campaign).toMatchObject({status:'copy_ready',selectedCopyId:set.id})
    expect((await read()).copies).toHaveLength(1)
    const beforeGoal=await read(),goalState=beforeGoal.campaign.brief.briefing
    await createBriefingService({pool:studio.pool}).confirm({...common,expectedRevision:beforeGoal.campaign.revision,idempotencyKey:'new-goal',input:{sourceKey:goalState.sourceKey,analysisJobId:goalState.analysisJobId,answers:{...goalState.answers,goal:'traffic'}}})
    expect((await read()).copies[0].stale).toBe(true)
    await generation.retainCopy({...common,expectedRevision:(await read()).campaign.revision})
    await generation.approveCopy({...common,expectedRevision:(await read()).campaign.revision,input:{copyId:copy.id}})
    expect((await read()).copies[0].stale).toBe(false)
    const retained=await read(),retainedState=retained.campaign.brief.briefing
    await createBriefingService({pool:studio.pool}).confirm({...common,expectedRevision:retained.campaign.revision,idempotencyKey:'retained-retag',input:{sourceKey:retainedState.sourceKey,analysisJobId:retainedState.analysisJobId,answers:{...retainedState.answers,visualTags:['Oslo','Adult classroom']}}})
    expect((await read()).copies[0].stale).toBe(false)
    await generation.generateDirections({...common,idempotencyKey:'directions',input:{mode:'campaign',context:{tags:[],note:''}}})
    const snapshot=(await studio.pool.query("SELECT input_snapshot FROM generation_jobs WHERE campaign_id=$1 AND step='directions'",[campaign.id])).rows[0].input_snapshot
    expect(snapshot.analysis.summary).toBe('Evening Norwegian courses in Oslo')
    expect(snapshot.context.tags).toEqual(['Oslo','Adult classroom'])
    const direction=(await read()).directions[0]
    await generation.generateImage({...common,idempotencyKey:'image',input:{directionId:direction.id,width:1000,height:1000}})
    await generation.selectDirection({...common,expectedRevision:(await read()).campaign.revision,input:{directionId:direction.id}})
    const versions=createVersionService({pool:studio.pool,assetStore})
    await versions.saveBannerBatch({...common,expectedRevision:(await read()).campaign.revision,input:{designs:[{templateId:studioTemplates[0].id,templateVersion:studioTemplates[0].version,copySetId:set.id,copyId:copy.id,directionId:direction.id}],ratioIds:['square']}})
    const review=await versions.createVersion({...common,expectedRevision:(await read()).campaign.revision,idempotencyKey:'review',input:{}})
    expect(review.body.version.snapshot.selectedCopy).toMatchObject({headline:'Learn together.',body:'Norwegian evening classes.',cta:'Join us',visualPrompt:''})
  } finally {await assetStore.close();await studio.close()}
},30000)
