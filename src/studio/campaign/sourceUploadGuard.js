import {sourceProjection} from '../../../shared/briefingDependencies.js'
import {stableInputKey} from './moduleContracts.js'

/** Allow only this upload's own source additions between revision-checked writes. */
export function assertSourceUploadCurrent(original,current,sources,removedIds=[]) {
  const originalState=original.campaign.brief?.briefing,state=current.campaign.brief?.briefing
  const allowedIds=new Set([...(original.sources??[]).map(source=>source.id),...sources.map(source=>source.id)])
  const changed=stableInputKey(sourceProjection(current.campaign.brief??{}).raw)!==stableInputKey(sourceProjection(original.campaign.brief??{}).raw)
    || stableInputKey(state?.answers)!==stableInputKey(originalState?.answers)
    || (state?.analysisJobId && state.analysisJobId!==originalState?.analysisJobId)
    || (state?.confirmation && state.confirmation.id!==originalState?.confirmation?.id)
    || (original.sources??[]).some(source=>!removedIds.includes(source.id) && !current.sources?.some(item=>item.id===source.id && item.contentHash===source.contentHash))
    || current.sources?.some(source=>!allowedIds.has(source.id))
  if(changed) throw Object.assign(new Error('The brief changed during upload. Your remaining files are kept; review the current brief before uploading them.'),{status:409,code:'source_changed'})
}
