import { createCampaignRuntime } from './campaignRuntime.js'
import { createBriefCommands } from './modules/brief/briefCommands.js'
import { createCopyCommands } from './modules/copy/copyCommands.js'
import { createVisualsCommands } from './modules/visuals/visualsCommands.js'
import { createBannersCommands } from './modules/banners/bannersCommands.js'
import { createReviewCommands } from './modules/review/reviewCommands.js'
import { createDistributeCommands } from './modules/distribute/distributeCommands.js'
import { stableInputKey } from './moduleContracts.js'
import { rawBrief } from '../../../shared/briefAnalysis.js'

/** Cross-module sequencing lives here, never inside a view or the page shell. */
export function createWorkflowCoordinator({ runtime, onNavigate = () => {} }) {
  const brief = createBriefCommands(runtime), copy = createCopyCommands(runtime)
  const visuals = createVisualsCommands(runtime)
  let sequencing = false, incomplete = null
  async function analyzeAndGenerate(patch, { expectedInputKey = runtime.getSnapshot('brief').inputKey } = {}) {
    if (sequencing) return { ok: false, code: 'campaign_busy', message: 'The brief is already being processed.' }
    sequencing = true
    try {
      const identity = stableInputKey(patch ?? null)
      const resumed = incomplete?.identity === identity
      if (!resumed) {
        if (incomplete && ['brief', 'copy', 'visuals'].some(id => runtime.getSnapshot(id).operation.kind === 'uncertain')) {
          return { ok: false, code: 'reconciliation_required', message: 'Resolve the previous submission before changing its input.' }
        }
        // A submission may carry only sources: a new project's brief is already saved.
        if (patch?.brief) {
          const saved = await brief.save(patch, { expectedInputKey })
          if (!saved.ok) return saved
          runtime.setDirty('brief', false)
        }
        incomplete = { identity, sourceKey: runtime.getSnapshot('brief').inputKey, stage: patch?.sources?.length?'upload':'analysis',
          uploadBaseline:await runtime.read(({workspace})=>workspace),removedIds:[],
          rawSource: stableInputKey(rawBrief(runtime.getSnapshot('brief').input.brief)),
          knownJobs: await runtime.read(({ workspace }) => workspace.jobs.map(job => job.id)) }
      }
      if(incomplete.stage==='upload') {
        const uploaded=await brief.uploadSources(patch.sources.filter(source=>!incomplete.removedIds.includes(source.id)),{expectedInputKey:incomplete.sourceKey,baseline:incomplete.uploadBaseline,removedIds:incomplete.removedIds})
        if(!uploaded.ok && uploaded.code==='brief_sources_not_ready') await runtime.refresh().catch(()=>{})
        if(!uploaded.ok && uploaded.code==='source_changed') return uploaded
        incomplete.sourceKey=runtime.getSnapshot('brief').inputKey
        if(!uploaded.ok) return uploaded
        incomplete.stage='analysis'
      }
      if (incomplete.stage === 'analysis' && runtime.getSnapshot('brief').operation.kind !== 'uncertain') {
        const recovered = await runtime.read(({ workspace }) => stableInputKey(rawBrief(workspace.campaign.brief)) === incomplete.rawSource
          && workspace.jobs.some(job => !incomplete.knownJobs.includes(job.id) && job.step === 'brief_analysis' && job.status === 'succeeded'
            && job.result?.analysis && stableInputKey(job.result.analysis) === stableInputKey(workspace.campaign.brief.analysis)))
        if (recovered) { incomplete.stage = 'drafts'; incomplete.sourceKey = runtime.getSnapshot('brief').inputKey }
      }
      const sourceKey = incomplete.sourceKey
      if (runtime.getSnapshot('brief').inputKey !== sourceKey && runtime.getSnapshot('brief').operation.kind !== 'uncertain') {
        return { ok: false, code: 'source_changed', message: 'The brief changed during analysis. Analyze the current brief before generating copy.' }
      }
      if (incomplete.stage === 'analysis') {
        const analyzed = await brief.analyze({ expectedInputKey: sourceKey })
        if (!analyzed.ok) return analyzed
        incomplete.stage = 'drafts'
        // The server has atomically saved the new analysis into the brief.
        incomplete.sourceKey = runtime.getSnapshot('brief').inputKey
      }
      if (runtime.getSnapshot('brief').inputKey !== incomplete.sourceKey) {
        return { ok: false, code: 'source_changed', message: 'The brief changed during analysis. Analyze the current brief before generating copy.' }
      }
      if (!runtime.getSnapshot('brief').input.brief.briefing) {
        incomplete = null
        return { ok: false, code: 'canonical_migration_required', message: 'This campaign needs the canonical briefing migration before it can continue.' }
      }
      incomplete=null
      return {ok:true}
    } finally { sequencing = false }
  }
  const regenerateCopy = async () => {
    if (sequencing) return { ok: false, code: 'campaign_busy', message: 'The brief is already being processed.' }
    sequencing = true
    try {
      if (!runtime.getSnapshot('brief').input.analysis) {
        const result = await brief.analyze()
        if (!result.ok) return result
      }
      return await copy.generate()
    } finally { sequencing = false }
  }
  const review = createReviewCommands(runtime)
  const banners = createBannersCommands(runtime)
  async function resumeInitialDrafts() {
    if (!runtime.getSnapshot('brief').input.brief.briefing) return { ok: false, code: 'canonical_migration_required', message: 'This campaign needs the canonical briefing migration before it can continue.' }
    return { ok: true }
  }
  function observeInitialDrafts() {
    const resume = () => { void resumeInitialDrafts().catch(() => {}) }
    const stops = ['brief', 'copy', 'visuals'].map(id => runtime.subscribe(id, resume))
    resume()
    return () => stops.forEach(stop => stop())
  }
  return Object.freeze({ actions: Object.freeze({
    brief: Object.freeze({ ...brief, submit: analyzeAndGenerate,
      retrySource: async id=>{
        const result=await brief.retrySource(id)
        await runtime.refresh().catch(()=>{})
        if(incomplete?.stage==='upload') incomplete.sourceKey=runtime.getSnapshot('brief').inputKey
        return result
      },
      removeSource: async id=>{
        const result=await brief.removeSource(id)
        if(result.ok && incomplete?.stage==='upload') {
          incomplete.removedIds.push(id)
          incomplete.sourceKey=runtime.getSnapshot('brief').inputKey
        }
        return result
      },
      confirm: async(input,options)=>{
        const saving=Boolean(runtime.getSnapshot('brief').input.brief?.briefing?.confirmation)
        const result=await brief.confirm(input,options)
        if(!result.ok) return result
        runtime.setDirty('brief',false)
        const writesCopy=result.receipt?.initialCopy==='offer_generation'
        if(writesCopy) {
          // The Copy operation owns its failure/retry. Confirmation is already
          // durable and must not leave the Brief draft on its old revision.
          await copy.generate({initial:true,confirmationId:result.receipt.confirmationId})
        }
        // Finalizing opens Copy; saving changes to a confirmed brief stays on Brief unless new copy is being written.
        if(!saving||writesCopy) onNavigate('copy')
        return {ok:true}
      },
      refine: (instruction, options = {}) => brief.analyze({ ...options, instruction }) }),
    copy: Object.freeze({ ...copy, regenerate: regenerateCopy,
      regenerateVisuals: copyIds => visuals.generate('selected_copy', { copyIds }) }),
    visuals,
    banners: Object.freeze({ ...banners, ...review, prepareReview: async options => {
      const snapshot = runtime.getSnapshot('review')
      if (snapshot.input.phase === 'prepare' && snapshot.input.availableVideos?.length) {
        if (!snapshot.access.canEdit || options?.expectedInputKey !== snapshot.inputKey) return { ok: false, code: 'source_changed', message: 'The saved selection changed. Check the current banners before review.' }
        return { ok: true }
      }
      return review.createVersion(options)
    } }),
    review,
    distribute: createDistributeCommands(runtime),
  }), analyzeAndGenerate, regenerateCopy, resumeInitialDrafts, observeInitialDrafts })
}

/** Never retry non-idempotent campaign creation automatically. */
export async function startCampaign({ api, actor, templates, input, onCreated = () => {}, onNavigate, onCampaignChange }) {
  let campaign, runtime = null
  try {
    campaign = await api.createCampaign(input)
    onCreated(campaign)
    const workspace = await api.getWorkspace(campaign.id)
    runtime = createCampaignRuntime({ api, actor, templates, workspace, onCampaignChange })
    const result = await createWorkflowCoordinator({ runtime, onNavigate }).analyzeAndGenerate()
    return { campaignId: campaign.id, runtime, result }
  } catch (error) {
    const uncertain = !campaign && (error.status === undefined || error.status === 0 || error.status >= 500)
    return { campaignId: campaign?.id ?? null, runtime, result: { ok: false,
      code: uncertain ? 'creation_uncertain' : error.code ?? 'request_failed',
      message: uncertain ? 'Creation may have completed. Check the campaign list before creating another campaign.' : error.message } }
  }
}
