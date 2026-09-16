import {expect,test} from 'vitest'
import {createIsolatedStudio} from '../testing/isolatedStudio.js'
import {createSourceCampaignSubmission} from '../../src/studio/campaign/sourceCampaign.js'
import {createCampaignRuntime} from '../../src/studio/campaign/campaignRuntime.js'
import {createWorkflowCoordinator} from '../../src/studio/campaign/workflowCoordinator.js'
import {extractSource,briefSourceError} from '../briefSources/sourceExtractor.js'

test.each(['retry','remove'])('partial upload keeps remaining files after source %s',async action=>{
  let reject=true
  const studio=await createIsolatedStudio({briefingEnabled:true,sourceExtractor:async input=>{
    if(input.bytes.toString()==='Source b' && reject){reject=false;throw briefSourceError('source_processing_failed','Synthetic temporary failure')}
    return extractSource(input)
  }});let runtime
  try {
    const api=studio.api('marketer'),campaign=await createSourceCampaignSubmission({api})({title:'Recovery',brief:{notes:''},sources:[]})
    runtime=createCampaignRuntime({api,actor:studio.actor('marketer'),templates:[],workspace:await api.getWorkspace(campaign.id)})
    const coordinator=createWorkflowCoordinator({runtime}),patch={brief:{notes:''},sources:['a','b','c'].map(id=>({id,kind:'text',text:`Source ${id}`}))}
    expect(await coordinator.actions.brief.submit(patch)).toMatchObject({ok:false,code:'brief_sources_not_ready'})
    expect(runtime.getSnapshot('brief').input.sources.map(source=>source.id)).toEqual(['a','b'])
    expect(await coordinator.actions.brief[action==='retry'?'retrySource':'removeSource']('b')).toEqual({ok:true})
    expect(await coordinator.actions.brief.submit(patch)).toEqual({ok:true})
    const saved=await api.getWorkspace(campaign.id)
    expect(saved.sources.map(source=>source.id)).toEqual(action==='retry'?['a','b','c']:['a','c'])
    expect(saved.jobs.map(job=>job.step)).toEqual(['brief_analysis'])
  } finally {runtime?.dispose();await studio.close()}
},30000)

test('lost partial upload cannot attach remaining files after another brief edit',async()=>{
  const studio=await createIsolatedStudio({briefingEnabled:true});let runtime
  try {
    const api=studio.api('marketer'),campaign=await createSourceCampaignSubmission({api})({title:'Upload recovery',brief:{notes:''},sources:[]})
    let lost=true
    const calls=[]
    const wrapped={...api,putBriefSource:async(...args)=>{
      calls.push(args[1]);const response=await api.putBriefSource(...args)
      if(lost){lost=false;throw Object.assign(new Error('Lost response'),{status:0})}
      return response
    }}
    runtime=createCampaignRuntime({api:wrapped,actor:studio.actor('marketer'),templates:[],workspace:await api.getWorkspace(campaign.id)})
    const coordinator=createWorkflowCoordinator({runtime}),patch={brief:{notes:''},sources:['a','b'].map(id=>({id,kind:'text',text:`Source ${id}`}))}
    expect((await coordinator.actions.brief.submit(patch)).ok).toBe(false)
    const current=await api.getWorkspace(campaign.id)
    await api.patchCampaign(campaign.id,{brief:{notes:'A different campaign purpose'}},current.campaign.revision)
    expect(await coordinator.actions.brief.submit(patch)).toMatchObject({ok:false,code:'source_changed'})
    expect(calls).not.toContain('b')
    expect((await api.getWorkspace(campaign.id)).jobs).toHaveLength(0)
  } finally {runtime?.dispose();await studio.close()}
},30000)

test('existing campaign starts question review only on explicit action',async()=>{
  const studio=await createIsolatedStudio({briefingEnabled:true});let runtime
  try {
    const api=studio.api('marketer')
    const campaign=await api.createCampaign({title:'Existing school',brief:{notes:'Oslo school. Headline: Learn together.'}})
    runtime=createCampaignRuntime({api,actor:studio.actor('marketer'),templates:[],workspace:await api.getWorkspace(campaign.id)})
    const coordinator=createWorkflowCoordinator({runtime})
    expect((await api.getWorkspace(campaign.id)).jobs).toHaveLength(0)
    expect(await coordinator.actions.brief.startReview()).toEqual({ok:true})
    const saved=await api.getWorkspace(campaign.id)
    expect(saved.campaign.brief.briefing.analysisJobId).toBeTruthy()
    expect(saved.campaign.brief.briefing.confirmation).toBeNull()
    expect(saved.jobs.map(job=>job.step)).toEqual(['brief_analysis'])
  } finally {runtime?.dispose();await studio.close()}
},30000)

test('source files submitted inside Brief are uploaded before analysis',async()=>{
  const studio=await createIsolatedStudio({briefingEnabled:true});let runtime
  try {
    const api=studio.api('marketer')
    const campaign=await createSourceCampaignSubmission({api})({title:'Draft',brief:{notes:''},sources:[]})
    runtime=createCampaignRuntime({api,actor:studio.actor('marketer'),templates:[],workspace:await api.getWorkspace(campaign.id)})
    const result=await createWorkflowCoordinator({runtime}).actions.brief.submit({brief:{...campaign.brief,notes:''},sources:[{id:'new-file',kind:'file',name:'school.txt',mimeType:'text/plain',data:Buffer.from('Oslo school. Headline: Learn here.').toString('base64')}]})
    expect(result).toEqual({ok:true})
    const saved=await api.getWorkspace(campaign.id)
    expect(saved.sources[0]).toMatchObject({id:'new-file',status:'ready'})
    expect(saved.campaign.brief.briefing.analysisJobId).toBeTruthy()
  } finally {runtime?.dispose();await studio.close()}
},30000)

test('Home file submission reaches questions and supplied Copy through the real API and runtime',async()=>{
  const studio=await createIsolatedStudio({briefingEnabled:true});let runtime
  try {
    const api=studio.api('marketer'),actor=studio.actor('marketer')
    const campaign=await createSourceCampaignSubmission({api})({title:'School campaign',brief:{notes:''},sources:[{id:'source-1',kind:'file',name:'brief.anything',mimeType:'application/octet-stream',data:Buffer.from('Language school in Oslo.\nHeadline: Learn together.').toString('base64')}]})
    const workspace=await api.getWorkspace(campaign.id)
    expect(workspace.sources).toEqual([expect.objectContaining({id:'source-1',name:'brief.anything',status:'ready'})])
    runtime=createCampaignRuntime({api,actor,templates:[],workspace})
    const coordinator=createWorkflowCoordinator({runtime})
    expect(await coordinator.actions.brief.submit()).toEqual({ok:true})
    const state=runtime.getSnapshot('brief').input.brief.briefing
    expect(state.confirmation).toBeNull()
    expect((await api.getWorkspace(campaign.id)).jobs.map(job=>job.step)).toEqual(['brief_analysis'])
    expect(await coordinator.actions.brief.confirm({sourceKey:state.sourceKey,analysisJobId:state.analysisJobId,answers:{...state.answers,copyMode:'keep_original',reach:'local',goal:'signups'}})).toEqual({ok:true})
    const saved=await api.getWorkspace(campaign.id)
    expect(saved.copies[0].candidates[0]).toMatchObject({headline:'Learn together.',body:'',cta:''})
    expect(saved.jobs.map(job=>job.step)).toEqual(['brief_analysis'])
  } finally {runtime?.dispose();await studio.close()}
},30000)
