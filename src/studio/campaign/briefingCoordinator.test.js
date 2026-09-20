import {expect,test,vi} from 'vitest'
import {createCampaignRuntime} from './campaignRuntime.js'
import {createWorkflowCoordinator} from './workflowCoordinator.js'
import {makeScenario} from './testing/workspaceFixtures.js'
import {emptyBriefAnswers} from '../../../shared/briefingContracts.js'

test('reviewed briefing stops after analysis and observation never creates paid drafts',async()=>{
  const scenario=makeScenario('draft'),workspace=scenario.workspace
  workspace.campaign.brief.briefing={schemaVersion:2,sourceKey:'a'.repeat(64),sourceIds:[],analysisJobId:null,answers:emptyBriefAnswers(),confirmation:null}
  const api={getWorkspace:vi.fn(async()=>structuredClone(workspace)),generate:vi.fn(async()=>{
    workspace.campaign.brief.analysis=makeScenario('copy-ready').workspace.jobs[0].result.analysis
    workspace.campaign.revision++
    return {job:{id:'analysis',status:'succeeded'}}
  })}
  const runtime=createCampaignRuntime({...scenario,api}),coordinator=createWorkflowCoordinator({runtime})
  try {
    expect(await coordinator.actions.brief.submit()).toEqual({ok:true})
    const stop=runtime.subscribe('brief',()=>{})
    await runtime.refresh();stop()
    expect(api.generate.mock.calls.map(call=>call[1])).toEqual(['brief'])
    expect(runtime.getSnapshot('copy').access.canEdit).toBe(false)
  } finally {runtime.dispose()}
})

test('a failed initial copy leaves the brief confirmed and routes its retry to Copy',async()=>{
  const scenario=makeScenario('copy-ready'),workspace=scenario.workspace
  workspace.copies=[]
  const answers={...emptyBriefAnswers(),summary:'School campaign',audience:'Adult students',copyMode:'create_new',reach:'local',goal:'signups'}
  workspace.campaign.brief.analysis=workspace.jobs[0].result.analysis
  workspace.campaign.brief.briefing={schemaVersion:2,sourceKey:'a'.repeat(64),sourceIds:[],analysisJobId:'analysis',answers,confirmation:null}
  const api={getWorkspace:vi.fn(async()=>structuredClone(workspace)),
    confirmBrief:vi.fn(async()=>{
      workspace.campaign.brief.briefing.confirmation={id:'confirmation'}
      workspace.campaign.revision++
      return {confirmationId:'confirmation',initialCopy:'offer_generation'}
    }),generate:vi.fn(async()=>{throw Object.assign(new Error('Generation unavailable'),{status:422,code:'generation_unavailable'})})}
  const runtime=createCampaignRuntime({...scenario,api}),onNavigate=vi.fn(),coordinator=createWorkflowCoordinator({runtime,onNavigate})
  try {
    runtime.setDirty('brief',true)
    expect(await coordinator.actions.brief.confirm({sourceKey:'a'.repeat(64),analysisJobId:'analysis',answers})).toMatchObject({ok:true})
    expect(runtime.hasDirty()).toBe(false)
    expect(runtime.getSnapshot('brief').input.brief.briefing.confirmation.id).toBe('confirmation')
    expect(runtime.getSnapshot('copy').operation.error.code).toBe('generation_unavailable')
    expect(onNavigate).toHaveBeenCalledWith('copy')
  } finally {runtime.dispose()}
})

test('saving changes to a confirmed brief stays on Brief unless new copy is being written',async()=>{
  const scenario=makeScenario('copy-ready'),workspace=scenario.workspace
  const answers={...emptyBriefAnswers(),summary:'School campaign',audience:'Adult students',copyMode:'create_new',reach:'local',goal:'signups'}
  workspace.campaign.brief.analysis=workspace.jobs[0].result.analysis
  workspace.campaign.brief.briefing={schemaVersion:2,sourceKey:'a'.repeat(64),sourceIds:[],analysisJobId:'analysis',answers,confirmation:{id:'confirmation-1'}}
  let initialCopy='skip'
  const api={getWorkspace:vi.fn(async()=>structuredClone(workspace)),
    confirmBrief:vi.fn(async()=>{
      workspace.campaign.brief.briefing.confirmation={id:`confirmation-${api.confirmBrief.mock.calls.length+1}`}
      workspace.campaign.revision++
      return {confirmationId:workspace.campaign.brief.briefing.confirmation.id,initialCopy}
    }),generate:vi.fn(async()=>({job:{id:'copy',status:'succeeded'}}))}
  const runtime=createCampaignRuntime({...scenario,api}),onNavigate=vi.fn(),coordinator=createWorkflowCoordinator({runtime,onNavigate})
  try {
    expect(await coordinator.actions.brief.confirm({sourceKey:'a'.repeat(64),analysisJobId:'analysis',answers:{...answers,visualTags:['Oslo']}})).toMatchObject({ok:true})
    expect(onNavigate).not.toHaveBeenCalled()
    expect(api.generate).not.toHaveBeenCalled()
    initialCopy='offer_generation'
    expect(await coordinator.actions.brief.confirm({sourceKey:'a'.repeat(64),analysisJobId:'analysis',answers:{...answers,goal:'sales'}})).toMatchObject({ok:true})
    expect(api.generate).toHaveBeenCalledTimes(1)
    expect(onNavigate).toHaveBeenCalledWith('copy')
  } finally {runtime.dispose()}
})
