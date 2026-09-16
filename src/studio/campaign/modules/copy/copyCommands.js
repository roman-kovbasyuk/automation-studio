import { getSelectedCopy } from '../../moduleContracts.js'

const currentCandidate = (workspace, id) => workspace.copies.some(set => !set.stale && set.candidates.some(copy => copy.id === id))
const assertCandidate = (workspace, id) => {
  if (!currentCandidate(workspace, id)) throw Object.assign(new Error('This copy option is no longer available.'), { code: 'copy_unavailable', status: 409 })
}

export function createCopyCommands(runtime) {
  return Object.freeze({
    edit: (copyId, fields, { expectedInputKey = runtime.getSnapshot('copy').inputKey } = {}) => runtime.execute('copy', 'edit', async ({ api, workspace }) => {
      assertCandidate(workspace, copyId)
      await api.editCopy(workspace.campaign.id, copyId, fields, workspace.campaign.revision)
    }, { expectedInputKey, intent: { copyId, fields }, reconcile: ({ current }) => {
      const copy = current.copies.filter(set => !set.stale).flatMap(set => set.candidates).find(candidate => candidate.id === copyId)
      return copy && Object.entries(fields).every(([key, value]) => copy[key] === value) ? 'applied' : 'unknown'
    } }),
    generate: ({ initial = false, confirmationId } = {}) => runtime.execute('copy', 'generate', async ({ api, workspace, idempotencyKey, waitForJob }) => {
      await waitForJob(await api.generate(workspace.campaign.id, 'copy', {}, idempotencyKey))
    }, { expectedInputKey: runtime.getSnapshot('copy').inputKey, idempotent: true,
      // Server idempotency is already scoped to actor, campaign and step.
      idempotencyKey: initial ? confirmationId ? `brief:${confirmationId}:initial-copy` : 'initial-copy-v1' : undefined }),
    retain: () => runtime.execute('copy', 'retain', async ({ api, workspace }) => {
      await api.retainCopy(workspace.campaign.id, workspace.campaign.revision)
    }, { expectedInputKey: runtime.getSnapshot('copy').inputKey,
      reconcile: ({ source, current }) => current.copies.some(set => !set.stale && source.copies.some(old => old.id === set.id && old.stale)) ? 'applied' : 'unknown' }),
    approve: (copyId, { revoke = false } = {}) => runtime.execute('copy', 'approve', async ({ api, workspace }) => {
      assertCandidate(workspace, copyId)
      if (revoke) await api.approveCopy(workspace.campaign.id, copyId, workspace.campaign.revision, true)
      else await api.approveCopy(workspace.campaign.id, copyId, workspace.campaign.revision)
    }, { expectedInputKey: runtime.getSnapshot('copy').inputKey, intent: { copyId, revoke },
      reconcile: ({ source, current }) => {
        if (revoke) return current.copies.every(set => !set.approvedCandidateIds?.includes(copyId)) ? 'applied' : 'unknown'
        const restoresSelection = !source.campaign.selectedCopyId && source.copies.some(set => !set.stale && set.approvedCandidateIds?.includes(copyId))
        const applied = restoresSelection ? getSelectedCopy(current)?.id === copyId
          : current.copies.some(set => !set.stale && set.approvedCandidateIds?.includes(copyId))
        return applied ? 'applied' : 'unknown'
      } }),
    select: copyId => runtime.execute('copy', 'select', async ({ api, workspace }) => {
      assertCandidate(workspace, copyId)
      await api.selectCopy(workspace.campaign.id, { copyId }, workspace.campaign.revision)
    }, { expectedInputKey: runtime.getSnapshot('copy').inputKey, intent: { copyId },
      reconcile: ({ current }) => getSelectedCopy(current)?.id === copyId ? 'applied' : 'unknown' }),
    deselect: copyId => runtime.execute('copy', 'deselect', async ({ api, workspace }) => {
      assertCandidate(workspace, copyId)
      await api.deselectCopy(workspace.campaign.id, workspace.campaign.revision)
    }, { expectedInputKey: runtime.getSnapshot('copy').inputKey, intent: { copyId },
      reconcile: ({ current }) => !current.campaign.selectedCopyId ? 'applied' : 'unknown' }),
    remove: copyId => runtime.execute('copy', 'remove', async ({ api, workspace }) => {
      assertCandidate(workspace, copyId)
      await api.deleteCopy(workspace.campaign.id, copyId, workspace.campaign.revision)
    }, { expectedInputKey: runtime.getSnapshot('copy').inputKey, intent: { copyId },
      reconcile: ({ source, current }) => current.campaign.revision > source.campaign.revision
        && !current.copies.some(set => set.candidates.some(copy => copy.id === copyId)) ? 'applied' : 'unknown' }),
  })
}
