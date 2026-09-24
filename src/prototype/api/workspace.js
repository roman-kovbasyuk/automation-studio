import { clonePrototypeValue } from '../store.js'
import { emptyBriefAnswers } from '../../../shared/briefingContracts.js'
import { createEmptyBrandDraft } from '../../../shared/brandDesignSystem.js'
import { placeholderLogoBlob, placeholderSceneBlob } from '../placeholderImage.js'

const requestId = () => `prototype-${Date.now().toString(36)}`
const failure = (message, code = 'prototype_request_failed', status = 422) => Object.assign(new Error(message), { code, status })
const timestamp = () => new Date().toISOString()

function normalizeBrandRecord(value) {
  if (value?.draft?.name) return value
  const name = value?.name || 'Untitled brand system'
  const draft = createEmptyBrandDraft(name)
  return {
    id: value?.id || `brand-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    workspaceId: value?.workspaceId || 'prototype', ownerId: value?.ownerId || 'prototype-designer',
    state: value?.state || (value?.status === 'published' ? 'published' : 'draft'), revision: value?.revision ?? 1,
    activeVersionId: value?.activeVersionId || null,
    activeVersion: value?.activeVersion || null,
    draft: { ...draft, currentStep: value?.status === 'published' ? 'publish' : 'materials' },
    createdAt: value?.createdAt || timestamp(), updatedAt: value?.updatedAt || timestamp(),
  }
}

const versionParts = version => String(version).split('.').map(part => Number.parseInt(part, 10) || 0)
function isNewer(left, right) {
  const a = versionParts(left), b = versionParts(right)
  for (let index = 0; index < 3; index += 1) if (a[index] !== b[index]) return a[index] > b[index]
  return false
}
export function latestTemplates(templates) {
  const latest = new Map()
  for (const template of templates) if (!latest.has(template.id) || isNewer(template.version, latest.get(template.id).version)) latest.set(template.id, template)
  return [...latest.values()]
}

function revisionGuard(campaign, revision) {
  if (revision !== undefined && revision !== campaign.revision) throw failure('This project changed. Refresh before saving.', 'revision_conflict', 409)
}

function normalizeBrief(input = {}) {
  const brief = { product: '', audience: '', objective: '', offer: '', locale: 'en', notes: '', ...input }
  const briefing = brief.briefing
  if (briefing?.schemaVersion === 2) {
    brief.briefing = {
      schemaVersion: 2,
      sourceIds: Array.isArray(briefing.sourceIds) ? briefing.sourceIds : [],
      sourceKey: briefing.sourceKey || 'a'.repeat(64),
      analysisJobId: briefing.analysisJobId ?? null,
      answers: { ...emptyBriefAnswers(), ...(briefing.answers ?? {}) },
      confirmation: briefing.confirmation ?? null,
    }
  }
  return brief
}

export function createWorkspaceApi({ store, scenarios, idFactory = () => crypto.randomUUID(), actor, assets = new Map() }) {
  const currentActor = () => {
    const role = scenarios.getActor()
    return { ...actor, role, id: role === 'designer' ? 'prototype-designer' : 'prototype-marketer' }
  }
  async function readStoredAsset(id) {
    if (!id || typeof store.getAsset !== 'function') return null
    return (await store.getAsset(id)) ?? null
  }
  async function readWorkspace(id) {
    const state = await store.read()
    const workspace = state.workspaces?.[id]
    if (!workspace) throw failure('Project not found.', 'not_found', 404)
    return clonePrototypeValue(workspace)
  }
  const api = {
    async getSession() { return { ...currentActor(), requestId: requestId() } },
    async getRuntimeConfig() { return { prototype: true, mode: 'local-simulation', requestId: requestId() } },
    async getGenerationReadiness() { return { state: 'ready', message: 'Prepared local generation is ready.', requestId: requestId() } },
    async listCampaigns() {
      const state = await store.read()
      return { campaigns: Object.values(state.workspaces ?? {}).map(item => item.campaign).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), requestId: requestId() }
    },
    async createCampaign(input = {}) {
      const title = String(input.title ?? '').trim()
      if (!title) throw failure('Give the project a name before creating it.', 'invalid_input')
      const id = idFactory()
      const createdAt = timestamp()
      const brief = normalizeBrief(input.brief)
      const campaign = { projectType: input.projectType ?? 'banners', id, title, status: 'draft', revision: 0, brief,
        selectedCopyId: null, selectedDirectionId: null, compositionId: null, currentVersionNumber: 0, openVersionId: null,
        createdBy: currentActor().id, createdAt, updatedAt: createdAt, archivedAt: null }
      await store.update(state => { state.workspaces[id] = { campaign, copies: [], directions: [], composition: null, versions: [], jobs: [], delivery: null } })
      return { ...campaign, requestId: requestId() }
    },
    async getWorkspace(id) { return { ...(await readWorkspace(id)), requestId: requestId() } },
    async patchCampaign(id, patch = {}, revision) {
      let response
      await store.update(state => {
        const workspace = state.workspaces[id]
        if (!workspace) throw failure('Project not found.', 'not_found', 404)
        revisionGuard(workspace.campaign, revision)
        if (patch.title !== undefined) workspace.campaign.title = String(patch.title).trim()
        if (patch.brief) workspace.campaign.brief = { ...workspace.campaign.brief, ...patch.brief }
        workspace.campaign.revision += 1; workspace.campaign.updatedAt = timestamp(); response = workspace.campaign
      })
      return { ...response, requestId: requestId() }
    },
    async duplicateCampaign(id) {
      const source = await readWorkspace(id); const newId = idFactory(); const createdAt = timestamp()
      const campaign = { ...source.campaign, id: newId, title: `${source.campaign.title} copy`, status: 'draft', revision: 0, currentVersionNumber: 0, openVersionId: null, compositionId: null, selectedCopyId: null, selectedDirectionId: null, createdAt, updatedAt: createdAt, createdBy: currentActor().id }
      await store.update(state => { state.workspaces[newId] = { campaign, copies: [], directions: [], composition: null, versions: [], jobs: [], delivery: null } })
      return { ...campaign, requestId: requestId() }
    },
    async deleteCampaign(id, revision) {
      await store.update(state => { const workspace = state.workspaces[id]; if (!workspace) throw failure('Project not found.', 'not_found', 404); revisionGuard(workspace.campaign, revision); delete state.workspaces[id] })
      return null
    },
    // Like the service's listLatest: the newest published version of each template. Older versions stay
    // available through getTemplateVersion for saved compositions.
    async listTemplates() { const state = await store.read(); return { templates: clonePrototypeValue(latestTemplates(state.templates ?? [])), requestId: requestId() } },
    async getTemplateVersion(id, version) {
      const state = await store.read(); const template = (state.templates ?? []).find(item => item.id === id && (!version || item.version === version))
      if (!template) throw failure('Template not found.', 'not_found', 404)
      return { ...clonePrototypeValue(template), requestId: requestId() }
    },
    async listBrandSystems() { const state = await store.read(); return { brands: clonePrototypeValue((state.brands ?? []).map(normalizeBrandRecord)), requestId: requestId() } },
    async getBrandSystem(id) { const state = await store.read(); const brand = (state.brands ?? []).find(item => item.id === id); if (!brand) throw failure('Brand system not found.', 'not_found', 404); return { ...clonePrototypeValue(normalizeBrandRecord(brand)), requestId: requestId() } },
    async getBrandSystemConfig() { return { systems: [], requestId: requestId() } },
    async getBrandAssetBlob(brandId, assetId) { return (await readStoredAsset(assetId)) ?? placeholderLogoBlob(`${brandId}:${assetId}`) },
    // Stored uploads win; anything else (simulated generation) gets a real, decodable scene.
    async getAssetBlob(id) { return assets.get(id) ?? (await readStoredAsset(id)) ?? placeholderSceneBlob(id) },
  }
  return Object.freeze(api)
}
