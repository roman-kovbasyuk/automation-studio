import { hashCanonical } from '../../../shared/canonicalJson.js'
import { clonePrototypeValue } from '../store.js'

const stamp = () => new Date().toISOString()
const fail = (message, code = 'prototype_request_failed', status = 422) => Object.assign(new Error(message), { code, status })
const responseId = () => `prototype-${Date.now().toString(36)}`

function findWorkspace(state, id) {
  const workspace = state.workspaces?.[id]
  if (!workspace) throw fail('Project not found.', 'not_found', 404)
  return workspace
}

function bump(workspace) {
  workspace.campaign.revision += 1
  workspace.campaign.updatedAt = stamp()
}

function selectedCopy(workspace) {
  const set = workspace.copies.find(item => !item.stale && item.id === workspace.campaign.selectedCopyId)
  return set?.candidates.find(item => item.id === set.selectedCandidateId) ?? set?.candidates[0] ?? null
}

function defaultBriefAnswers(workspace) {
  return { summary: workspace.campaign.brief.notes || 'A calm campaign for everyday focus.', audience: workspace.campaign.brief.audience || 'Commuters', copyMode: null, ageGroups: [], gender: 'all', reach: null, goal: null, goalCustom: '', visualTags: [] }
}

export function createFlowApi({ store, scenarios, jobs, idFactory = () => crypto.randomUUID(), actor }) {
  const currentActor = () => {
    const role = scenarios.getActor()
    return { ...actor, role, id: role === 'designer' ? 'prototype-designer' : 'prototype-marketer' }
  }
  async function runGeneration(campaignId, step, input = {}, idempotencyKey) {
    const state = await store.read(); const workspace = findWorkspace(state, campaignId)
    const receiptKey = `${campaignId}:${step}:${idempotencyKey ?? 'unique'}`
    if (idempotencyKey && state.receipts?.[receiptKey]) return { job: clonePrototypeValue(state.receipts[receiptKey]) }
    const tailoredCopies = input.mode === 'selected_copy'
      ? (input.copyIds ?? []).map(copyId => workspace.copies.filter(set => !set.stale).flatMap(set => set.candidates).find(copy => copy.id === copyId))
      : []
    if (step === 'directions' && input.mode === 'selected_copy' && (!tailoredCopies.length || tailoredCopies.some(copy => !copy))) {
      throw fail('Select current copy options before generating tailored visuals.', 'copy_unavailable', 409)
    }
    const directionBatchId = step === 'directions' ? idFactory() : null
    const result = step === 'brief' || step === 'brief_analysis'
      ? { analysis: {
        summary: workspace.campaign.brief.notes || `A ${workspace.campaign.brief.product || 'product'} campaign for ${workspace.campaign.brief.audience || 'your audience'}.`,
        themes: ['Clarity', 'Everyday confidence'], warnings: [], audience: workspace.campaign.brief.audience || 'Commuters', objective: workspace.campaign.brief.objective || 'Awareness',
        channels: ['Social'], formats: ['Square', 'Story'],
        briefingProposal: { sourceKey: 'a'.repeat(64), foundCopy: [], suggestedVisualTags: ['Calm', 'Daylight'], answers: {
        summary: workspace.campaign.brief.notes || 'A calm campaign for everyday focus.', audience: workspace.campaign.brief.audience || 'Commuters', copyMode: null, ageGroups: [], gender: 'all', reach: null, goal: null, goalCustom: '', visualTags: [],
        } },
      } }
      : step === 'copy'
        ? { copies: Array.from({ length: 5 }, (_, index) => ({ id: idFactory(), headline: ['Find your quiet.', 'Make room for focus.', 'Sound for your day.', 'Your commute, calmer.', 'Hear what matters.'][index], body: 'Thoughtfully made for the sounds you love.', offer: workspace.campaign.brief.offer || '', cta: 'Shop now', visualPrompt: 'Editorial headphones in soft daylight.' })) }
        : step === 'directions'
          ? { directions: Array.from({ length: input.mode === 'selected_copy' ? tailoredCopies.length : 5 }, (_, index) => ({ id: idFactory(), title: ['Soft daylight', 'Quiet geometry', 'Warm commute', 'Focus in motion', 'Close detail'][index % 5], prompt: 'Editorial headphones scene with calm daylight.', status: 'ready', previewAssetId: null, stale: false, scope: input.mode === 'selected_copy' ? 'selected_copy' : 'campaign', copy: input.mode === 'selected_copy' ? tailoredCopies[index] : null, batchId: directionBatchId, source: 'generation', generation: null })) }
          : { directionId: input.directionId }
    const apply = (target, output) => {
      if (!target) return
      if (step === 'brief' || step === 'brief_analysis') {
        target.campaign.brief.analysis = output.analysis
        const answers = output.analysis.briefingProposal.answers
        target.campaign.brief.briefing = { schemaVersion: 2, sourceIds: [], sourceKey: output.analysis.briefingProposal.sourceKey, analysisJobId: 'prototype-analysis', answers, confirmation: null }
      }
      if (step === 'copy') {
        const setId = idFactory()
        target.copies.push({ id: setId, origin: 'generated', stale: false, selectedCandidateId: null, approvedCandidateIds: [], hasApprovalHistory: false, candidates: output.copies })
        target.campaign.status = 'copy_ready'
      }
      if (step === 'directions') { target.directions.push(...output.directions); if (target.directions.length) target.campaign.status = 'direction_selected' }
      if (step === 'image') {
        const direction = target.directions.find(item => item.id === input.directionId)
        if (direction) { direction.previewAssetId = direction.previewAssetId || `asset-${direction.id}`; direction.status = 'ready'; direction.generation = null }
      }
      bump(target)
    }
    const outcome = await jobs.run({ campaignId, step, result, apply, idempotencyKey })
    if (idempotencyKey) await store.update(next => { next.receipts[receiptKey] = outcome.job })
    return outcome
  }

  return {
    async extractBriefFile(input) { return { text: input?.name ? `Prepared sample extracted from ${input.name}.` : 'Prepared sample brief.', requestId: responseId() } },
    async getBriefSource() { return { source: null, requestId: responseId() } },
    async putBriefSource(id, sourceId, input, revision) { let value; await store.update(state => { const w = findWorkspace(state, id); if (w.campaign.revision !== revision) throw fail('This project changed. Refresh before saving.', 'revision_conflict', 409); w.sources = [...(w.sources ?? []).filter(item => item.id !== sourceId), { ...input, id: sourceId, status: 'ready' }]; bump(w); value = w.sources.at(-1) }); return { source: value, campaign: value ? (await (async () => (await store.read()).workspaces[id].campaign)()) : null, requestId: responseId() } },
    async retryBriefSource(id, sourceId, revision) { return this.putBriefSource(id, sourceId, { name: 'Prepared brief', mimeType: 'text/plain', text: 'Prepared source', status: 'ready' }, revision) },
    async removeBriefSource(id, sourceId, revision) { await store.update(state => { const w = findWorkspace(state, id); if (w.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409); w.sources = (w.sources ?? []).filter(item => item.id !== sourceId); bump(w) }); return null },
    async startBriefing(id, revision) { let campaign; await store.update(state => { const w = findWorkspace(state, id); if (w.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409); const current = w.campaign.brief.briefing ?? {}; w.campaign.brief.briefing = { ...current, schemaVersion: 2, answers: current.answers ?? defaultBriefAnswers(w), sourceIds: current.sourceIds ?? [], sourceKey: current.sourceKey ?? 'a'.repeat(64), analysisJobId: current.analysisJobId ?? null, confirmation: { status: 'ready' } }; bump(w); campaign = w.campaign }); return { campaign, requestId: responseId() } },
    async confirmBrief(id, input, revision, idempotencyKey) { const activeActor = currentActor(); let campaign; await store.update(state => { const w = findWorkspace(state, id); if (w.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409); const current = w.campaign.brief.briefing ?? {}; w.campaign.brief.briefing = { schemaVersion: 2, sourceIds: current.sourceIds ?? [], sourceKey: current.sourceKey ?? 'a'.repeat(64), analysisJobId: current.analysisJobId ?? 'prototype-analysis', answers: input.answers ?? current.answers ?? defaultBriefAnswers(w), confirmation: { id: idempotencyKey || idFactory(), analysisJobId: input.analysisJobId ?? current.analysisJobId ?? 'prototype-analysis', sourceKey: input.sourceKey ?? current.sourceKey ?? 'a'.repeat(64), copyKey: 'b'.repeat(64), visualKey: 'c'.repeat(64), answersKey: 'd'.repeat(64), confirmedAt: stamp(), confirmedBy: activeActor.id, importedCopySetId: null } }; bump(w); campaign = w.campaign }); return { confirmationId: campaign.brief.briefing.confirmation.id, campaignRevision: campaign.revision, initialCopy: 'offer_generation', importedCopySetId: null, campaign, requestId: responseId() } },
    async generate(id, step, input, key) { const failureCode = scenarios.consume(step); if (failureCode) throw fail(`Prepared ${step} simulation failed.`, failureCode, 500); return runGeneration(id, step, input, key) },
    async getJob(id) { const state = await store.read(); const job = state.jobs?.[id]; if (!job) throw fail('Generation job not found.', 'not_found', 404); return { job: clonePrototypeValue(job), requestId: responseId() } },
    async selectCopy(id, input, revision) { await store.update(state => { const w = findWorkspace(state, id); if (w.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409); const set = w.copies.find(item => !item.stale && item.candidates.some(copy => copy.id === input.copyId)); if (!set) throw fail('Copy option is unavailable.', 'copy_unavailable', 409); set.selectedCandidateId = input.copyId; set.approvedCandidateIds = Array.from(new Set([...(set.approvedCandidateIds ?? []), input.copyId])); set.hasApprovalHistory = true; w.campaign.selectedCopyId = set.id; w.campaign.status = 'copy_ready'; bump(w) }); return { requestId: responseId() } },
    async deselectCopy(id, revision) { await store.update(state => { const w = findWorkspace(state, id); if (w.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409); w.campaign.selectedCopyId = null; bump(w) }); return { requestId: responseId() } },
    async retainCopy() { return { requestId: responseId() } },
    async approveCopy(id, copyId, revision, revoke = false) {
      if (!revoke) return this.selectCopy(id, { copyId }, revision)
      await store.update(state => {
        const workspace = findWorkspace(state, id)
        if (workspace.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409)
        const set = workspace.copies.find(item => !item.stale && item.candidates.some(copy => copy.id === copyId))
        if (!set) throw fail('Copy option is unavailable.', 'copy_unavailable', 409)
        set.approvedCandidateIds = (set.approvedCandidateIds ?? []).filter(candidateId => candidateId !== copyId)
        if (set.selectedCandidateId === copyId) set.selectedCandidateId = null
        const activeSet = workspace.copies.find(item => !item.stale && item.id === workspace.campaign.selectedCopyId)
        if (!activeSet?.selectedCandidateId) {
          const remaining = workspace.copies.find(item => !item.stale && item.approvedCandidateIds?.length)
          workspace.campaign.selectedCopyId = remaining?.id ?? null
          if (remaining) remaining.selectedCandidateId = remaining.approvedCandidateIds[0]
        }
        bump(workspace)
      })
      return { requestId: responseId() }
    },
    async editCopy(id, copyId, fields, revision) { await store.update(state => { const w = findWorkspace(state, id); if (w.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409); const copy = w.copies.flatMap(item => item.candidates).find(item => item.id === copyId); if (!copy) throw fail('Copy option is unavailable.', 'copy_unavailable', 409); Object.assign(copy, fields); bump(w) }); return { requestId: responseId() } },
    async deleteCopy(id, copyId, revision) { await store.update(state => { const w = findWorkspace(state, id); if (w.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409); for (const set of w.copies) set.candidates = set.candidates.filter(copy => copy.id !== copyId); bump(w) }); return { requestId: responseId() } },
    async selectDirection(id, input, revision) { await store.update(state => { const w = findWorkspace(state, id); if (w.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409); const direction = w.directions.find(item => item.id === input.directionId && item.previewAssetId); if (!direction) throw fail('Visual direction is unavailable.', 'direction_unavailable', 409); w.campaign.selectedDirectionId = direction.id; w.campaign.status = 'direction_selected'; bump(w) }); return { requestId: responseId() } },
    async uploadVisual(id, input, revision) { const assetId = `upload-${idFactory()}`; const data = input.data ? Uint8Array.from(atob(input.data), char => char.charCodeAt(0)) : new Uint8Array([1]); await store.putAsset(assetId, new Blob([data], { type: input.mimeType || 'image/png' })); await store.update(state => { const w = findWorkspace(state, id); if (w.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409); const direction = w.directions.find(item => item.id === input.target?.directionId); if (!direction) throw fail('Visual direction is unavailable.', 'direction_unavailable', 409); direction.previewAssetId = assetId; direction.status = 'ready'; bump(w) }); return { asset: { id: assetId, kind: 'direction', sha256: 'e'.repeat(64) }, requestId: responseId() } },
    async saveComposition(id, input, revision) { let composition; await store.update(state => { const w = findWorkspace(state, id); if (w.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409); composition = { id: idFactory(), templateId: input.templateId, templateVersion: input.templateVersion, ratioIds: input.ratioIds, slotValues: input.slotValues, validation: { valid: true, errors: [] }, stale: false }; w.composition = composition; w.campaign.compositionId = composition.id; w.campaign.status = 'composed'; bump(w) }); return { composition: clonePrototypeValue(composition), campaign: (await store.read()).workspaces[id].campaign, requestId: responseId() } },
    async saveBannerBatch(id, input, revision) { return this.saveComposition(id, { templateId: input.designs?.[0]?.templateId ?? 'editorial-split', templateVersion: input.designs?.[0]?.templateVersion ?? '1.2.0', ratioIds: input.ratioIds, slotValues: {} }, revision) },
    async createVersion(id, input, revision) { const activeActor = currentActor(); let version; await store.update(state => { const w = findWorkspace(state, id); if (w.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409); const copy = selectedCopy(w); const direction = w.directions.find(item => item.id === w.campaign.selectedDirectionId) || w.directions.find(item => item.previewAssetId); if (!copy || !direction || !w.composition) throw fail('Select copy, visual and composition first.', 'version_requirements', 422); const template = state.templates.find(item => item.id === w.composition.templateId) || state.templates[0]; const snapshot = { selectedCopy: copy, selectedDirection: direction, composition: w.composition, assets: [{ id: direction.previewAssetId, kind: 'direction', sha256: 'e'.repeat(64) }], templateManifest: template.manifest, templateManifestHash: hashCanonical(template.manifest) }; version = { id: idFactory(), campaignId: id, versionNumber: w.campaign.currentVersionNumber + 1, snapshot, contentHash: hashCanonical(snapshot), createdBy: activeActor.id, createdAt: stamp() }; w.versions.push(version); w.campaign.currentVersionNumber = version.versionNumber; w.campaign.openVersionId = version.id; w.campaign.status = 'in_review'; state.reviewHistories[version.id] = { version, status: 'in_review', events: [{ id: idFactory(), campaignId: id, versionId: version.id, actorRole: activeActor.role, actorId: activeActor.id, eventType: 'sent', payload: {}, createdAt: stamp() }] }; bump(w) }); return { version: clonePrototypeValue(version), campaign: (await store.read()).workspaces[id].campaign, requestId: responseId() } },
    async getReview(versionId) { const state = await store.read(); if (state.reviewHistories?.[versionId]) return clonePrototypeValue(state.reviewHistories[versionId]); const w = Object.values(state.workspaces ?? {}).find(item => item.versions.some(version => version.id === versionId)); return w ? clonePrototypeValue(state.reviewHistories?.[w.campaign.openVersionId] ?? null) : null },
    async getFigmaHandoff(versionId) { const state = await store.read(); return { handoff: clonePrototypeValue(state.figmaHandoffs?.[versionId] ?? null), requestId: responseId() } },
    async getFigmaSubmission() { return { submission: null, requestId: responseId() } },
    async sendToFigma(versionId) { const handoff = { status: 'sent', url: 'https://www.figma.com/file/prototype/review', versionId, sentAt: stamp() }; await store.update(state => { state.figmaHandoffs[versionId] = handoff }); return { handoff, requestId: responseId() } },
    async review(versionId, action, input = {}, revision) { const activeActor = currentActor(); let result; await store.update(state => { const w = Object.values(state.workspaces).find(item => item.versions.some(version => version.id === versionId)); if (!w) throw fail('Version not found.', 'not_found', 404); if (w.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409); const event = { id: idFactory(), campaignId: w.campaign.id, versionId, actorRole: activeActor.role, actorId: activeActor.id, eventType: action === 'mark-ready' ? 'ready' : action === 'request-changes' ? 'changes_requested' : action === 'reject' ? 'rejected' : action, payload: input, createdAt: stamp() }; const history = state.reviewHistories[versionId] ?? { version: w.versions.find(item => item.id === versionId), events: [] }; history.events.push(event); history.status = action === 'mark-ready' ? 'ready' : action === 'approve' ? 'approved' : action === 'request-changes' || action === 'reject' ? 'changes_requested' : history.status ?? 'in_review'; state.reviewHistories[versionId] = history; if (action === 'mark-ready') w.campaign.status = 'ready'; if (action === 'approve') w.campaign.status = 'approved'; if (action === 'request-changes') w.campaign.status = 'changes_requested'; if (action === 'reject') w.campaign.status = 'changes_requested'; bump(w); result = event }); return { event: result, requestId: responseId() } },
    async reopen(id, revision) { await store.update(state => { const w = findWorkspace(state, id); if (w.campaign.revision !== revision) throw fail('This project changed.', 'revision_conflict', 409); w.campaign.status = 'composed'; w.campaign.openVersionId = null; bump(w) }); return { requestId: responseId() } },
    async deliver(versionId) { const activeActor = currentActor(); let delivery; await store.update(state => { const w = Object.values(state.workspaces).find(item => item.versions.some(version => version.id === versionId)); if (!w) throw fail('Version not found.', 'not_found', 404); const version = w.versions.find(item => item.id === versionId); const asset = { id: `zip-${idFactory()}`, kind: 'delivery_zip', sha256: 'f'.repeat(64) }; delivery = { id: idFactory(), campaignId: w.campaign.id, versionId, contentHash: version.contentHash, asset, byteSize: 2048, createdBy: activeActor.id, createdAt: stamp() }; w.delivery = delivery; w.campaign.status = 'delivered'; state.reviewHistories[versionId] = { ...(state.reviewHistories[versionId] ?? { version, events: [] }), status: 'delivered', events: [...(state.reviewHistories[versionId]?.events ?? []), { id: idFactory(), campaignId: w.campaign.id, versionId, actorRole: activeActor.role, actorId: activeActor.id, eventType: 'delivered', payload: {}, createdAt: stamp() }] }; bump(w) }); return { delivery: clonePrototypeValue(delivery), requestId: responseId() } },
    async getDelivery(versionId) { const state = await store.read(); const w = Object.values(state.workspaces).find(item => item.versions.some(version => version.id === versionId)); return clonePrototypeValue(w?.delivery) },
    async planVideo(id, input) { return { id: idFactory(), estimatedCostMicrounits: 0, durationSeconds: input?.durationSeconds ?? 5, requestId: responseId() } },
    async generateVideo() { return { job: { id: idFactory(), status: 'succeeded', step: 'video', result: { video: null } }, requestId: responseId() } },
    async listVideoJobs() { return { jobs: [], requestId: responseId() } },
    async cancelVideoJob() { return { ok: true, requestId: responseId() } },
    async downloadDelivery(id) { return new Blob([`Prototype sample delivery ${id}`], { type: 'application/zip' }) },
  }
}
