import { stableInputKey } from '../../moduleContracts.js'
import { assertSourceUploadCurrent } from '../../sourceUploadGuard.js'

const normalizedBrief = brief => ({ ...Object.fromEntries(['product', 'audience', 'objective', 'offer', 'locale', 'notes']
  .map(key => [key, (brief[key] ?? (key === 'locale' ? 'auto' : '')).trim()])), analysis: brief.analysis ?? null })

export function createBriefCommands(runtime) {
  return Object.freeze({
    prepareReview: () => runtime.execute('brief','prepareReview',async({api,workspace})=>{
      await api.startBriefing(workspace.campaign.id,workspace.campaign.revision)
    },{idempotent:true}),
    getSource: sourceId => runtime.read(({api,workspace})=>api.getBriefSource(workspace.campaign.id,sourceId)),
    retrySource: sourceId => runtime.execute('brief','retrySource',async({api,workspace})=>{
      const value=await api.retryBriefSource(workspace.campaign.id,sourceId,workspace.campaign.revision)
      if(value.source.status!=='ready') throw Object.assign(new Error('This source could not be read. Remove it or try another file.'),{status:422,code:'source_processing_failed'})
    },{intent:sourceId}),
    removeSource: sourceId => runtime.execute('brief','removeSource',({api,workspace})=>api.removeBriefSource(workspace.campaign.id,sourceId,workspace.campaign.revision),
      {intent:sourceId,reconcile:({current})=>!current.sources?.some(source=>source.id===sourceId)?'applied':'unknown'}),
    uploadSources: (sources,{expectedInputKey=runtime.getSnapshot('brief').inputKey,baseline,removedIds=[]}={})=>runtime.execute('brief','uploadSources',async({api,workspace})=>{
      const original=baseline??workspace
      for(const {id,...input} of sources) {
        const current=await api.getWorkspace(workspace.campaign.id)
        assertSourceUploadCurrent(original,current,sources,removedIds)
        const result=await api.putBriefSource(workspace.campaign.id,id,input,current.campaign.revision)
        if(result.source.status!=='ready') throw Object.assign(new Error(`Could not read ${result.source.name}. Remove or retry it before analyzing.`),{status:422,code:'brief_sources_not_ready'})
      }
    },{expectedInputKey,idempotent:true,intent:sources}),
    confirm: async (input,{expectedInputKey=runtime.getSnapshot('brief').inputKey}={}) => {
      let receipt
      const result=await runtime.execute('brief','confirm',async({api,workspace,idempotencyKey})=>{
        receipt=await api.confirmBrief(workspace.campaign.id,input,workspace.campaign.revision,idempotencyKey)
      },{expectedInputKey,idempotent:true,intent:input})
      return {...result,...(receipt?{receipt}:{})}
    },
    save: (patch, { expectedInputKey = runtime.getSnapshot('brief').inputKey } = {}) => runtime.execute('brief', 'save', async ({ api, workspace }) => {
      if (!patch?.brief) throw Object.assign(new Error('A brief is required.'), { status: 422, code: 'brief_required' })
      // Title edits belong to the shell; drafting a brief must not rename it.
      const {briefing:_serverEvidence,...raw}=patch.brief
      await api.patchCampaign(workspace.campaign.id, { brief: raw }, workspace.campaign.revision)
    }, { expectedInputKey, intent: patch?.brief,
      reconcile: ({ current }) => patch?.brief && stableInputKey(normalizedBrief(current.campaign.brief)) === stableInputKey(normalizedBrief(patch.brief)) ? 'applied' : 'unknown' }),
    analyze: ({ expectedInputKey = runtime.getSnapshot('brief').inputKey, instruction } = {}) => runtime.execute('brief', 'analyze', async ({ api, workspace, idempotencyKey, waitForJob }) => {
      await waitForJob(await api.generate(workspace.campaign.id, 'brief', { expectedRevision: workspace.campaign.revision, ...(instruction ? { instruction } : {}) }, idempotencyKey))
    }, { expectedInputKey, idempotent: true, intent: instruction ?? null }),
    extractFile: input => runtime.read(({ api }) => api.extractBriefFile(input)),
  })
}
