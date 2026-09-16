import { deriveReviewStatus } from '../../../shared/reviewHistory.js'
import { MODULE_IDS, MODULE_LABELS, getSelectedCopy, getSelectedDirection,
  getCurrentVersion, getCurrentReviewHistory, getReviewPhase, projectModuleInput } from './moduleContracts.js'

const editableStatuses = new Set(['draft', 'copy_ready', 'direction_selected', 'composed'])
const editorRoles = new Set(['marketer', 'admin'])

function reviewGuard(workspace, actor, history, validComposition) {
  const campaign = workspace.campaign
  const editor = editorRoles.has(actor?.role)
  const version = getCurrentVersion(workspace)
  if (campaign.status === 'composed') {
    return editor && validComposition && !campaign.openVersionId ? null : 'A valid composition and an editor are required.'
  }
  if (!version) return 'The current review version is unavailable.'
  if (campaign.openVersionId !== version.id && ['in_review', 'ready'].includes(campaign.status)) {
    return 'The current review version has changed.'
  }
  if (campaign.status === 'changes_requested' && campaign.openVersionId) return 'Close the current review before reopening.'
  const currentHistory = getCurrentReviewHistory(workspace, history)
  if (!currentHistory || currentHistory.status !== campaign.status
    || currentHistory.events.some(event => event.versionId !== version.id || event.campaignId !== campaign.id)) {
    return 'Load the current review history before continuing.'
  }
  try {
    if (deriveReviewStatus(currentHistory.events) !== campaign.status) return 'The review history is inconsistent.'
  } catch { return 'The review history is inconsistent.' }
  if (campaign.status === 'in_review') return actor?.role === 'designer' ? null : 'Waiting for the designer to review this version.'
  if (campaign.status === 'changes_requested') return editor ? null : 'An editor must reopen the campaign.'
  if (campaign.status === 'ready') {
    const ready = currentHistory.events.find(event => event.eventType === 'ready')
    if (!editor) return 'An editor must approve this version.'
    if (ready?.actorId === actor?.id) return 'A different person must approve this version.'
    if (!ready || !['copyAccuracy', 'layoutQuality', 'exportReadiness'].every(key => ready.payload?.checklistAnswers?.[key] === true)) {
      return 'The designer checklist is incomplete.'
    }
    return null
  }
  return 'This review version is read-only.'
}

/** Derive UI availability only. Every command is still authorized by the server. */
export function deriveWorkflowState(workspace, actor, reviewHistory = null, figmaReview = null) {
  const campaign = workspace.campaign
  const selectedCopy = getSelectedCopy(workspace)
  const selectedDirection = selectedCopy && getSelectedDirection(workspace)
  const validComposition = Boolean(selectedDirection && workspace.composition
    && workspace.composition.id === campaign.compositionId
    && !workspace.composition.stale && workspace.composition.validation.valid)
  const hasCopies = workspace.copies.some(set => !set.stale && set.candidates.length)
  const hasPreview = hasCopies && workspace.directions.some(item => !item.stale && item.status === 'ready' && item.previewAssetId)
  const hasAnalysis = Boolean(projectModuleInput('brief', workspace).analysis)
  const needsBriefConfirmation=Boolean(campaign.brief.briefing && !campaign.brief.briefing.confirmation)
  const reviewPhase = getReviewPhase(workspace)
  let currentModule = 'brief'
  // Analysis exposes Copy before its first result exists. This is navigation,
  // not proof of analysis freshness: the server checks that on generation.
  if (hasCopies || hasAnalysis || campaign.status === 'copy_ready') currentModule = 'copy'
  if (selectedCopy) currentModule = 'visuals'
  if (selectedDirection) currentModule = 'banners'
  if (validComposition && campaign.status === 'composed') currentModule = 'banners'
  if (['in_review', 'changes_requested', 'ready'].includes(campaign.status)) currentModule = 'banners'
  if (['approved', 'delivered'].includes(campaign.status)) currentModule = 'distribute'
  if(needsBriefConfirmation && editableStatuses.has(campaign.status)) currentModule='brief'
  const currentIndex = MODULE_IDS.indexOf(currentModule)
  const unresolvedJob = workspace.jobs.find(job => job.status === 'unknown')
    ?? workspace.jobs.find(job => job.status === 'pending')
  const delivery = projectModuleInput('distribute', workspace).delivery
  const modules = Object.fromEntries(MODULE_IDS.map((id, index) => {
    const reviewAvailable = id === 'review' && ((campaign.status === 'composed' && validComposition) || reviewPhase !== 'prepare')
    const canVisit = index <= currentIndex || reviewAvailable || (id === 'visuals' && (hasCopies || hasAnalysis)) || (id === 'banners' && hasPreview)
    let reason = null, generationBlock = null, editDestination = null
    if (!actor?.id || !['marketer', 'designer', 'admin'].includes(actor.role)) reason = 'Sign in to continue.'
    else if (campaign.archivedAt) reason = 'This campaign has been deleted.'
    else if (needsBriefConfirmation && id!=='brief') reason='Review and confirm your brief first.'
    else if (!canVisit) reason = 'Complete the preceding module first.'
    else if (unresolvedJob) {
      reason = 'A generation is pending or needs reconciliation.'
      generationBlock = { status: unresolvedJob.status, step: unresolvedJob.step }
    }
    else if (id === 'review') reason = reviewGuard(workspace, actor, reviewHistory, validComposition)
    else if (id === 'distribute') {
      if (!editorRoles.has(actor.role)) reason = 'An editor manages the approved delivery.'
      else if (!getCurrentVersion(workspace)) reason = 'The approved version is unavailable.'
    } else if (id === 'copy' && editorRoles.has(actor.role)) {
      const activeReview = !editableStatuses.has(campaign.status)
      const currentVersionId = getCurrentVersion(workspace)?.id
      if (activeReview && figmaReview && (!figmaReview.loaded || figmaReview.versionId !== currentVersionId)) {
        reason = 'Checking whether this copy has been sent to Figma…'
      } else if (activeReview && figmaReview?.handoff) {
        reason = 'Copy is locked because these banners were sent to Figma for review.'
        editDestination = 'review'
      }
    } else if (!editorRoles.has(actor.role) || !editableStatuses.has(campaign.status)) reason = 'This module is read-only.'
    else if (id === 'visuals' && !hasAnalysis) reason = 'Analyze your brief to create visual prompts.'
    else if (id === 'banners' && !selectedDirection) reason = 'Select a current image first.'
    const stale = id === 'copy' ? workspace.copies.some(set => set.stale) && !hasCopies
      : id === 'visuals' ? workspace.directions.some(item => item.stale) && !selectedDirection
        : id === 'banners' ? Boolean(workspace.composition?.stale) : false
    return [id, { id, label: MODULE_LABELS[id], canVisit, canEdit: reason === null, reason, stale,
      ...(generationBlock ? { generationBlock } : {}),
      ...(editDestination ? { editDestination } : {}),
      ...(id==='review'?{canSendToFigma:editorRoles.has(actor?.role)&&!actor.disabled&&!actor.disabledAt&&!campaign.archivedAt&&!unresolvedJob&&campaign.status==='in_review'&&Boolean(getCurrentReviewHistory(workspace,reviewHistory))}:{}),
      ...(id==='visuals'?{canManageVideo:editorRoles.has(actor?.role)&&!actor.disabled&&!actor.disabledAt&&!campaign.archivedAt}:{}),
      complete: id === 'distribute' ? campaign.status === 'delivered' && Boolean(delivery) : index < currentIndex }]
  }))
  return { currentModule, modules, reviewPhase }
}
