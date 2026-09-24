export class StudioApiError extends Error {
  constructor(message, { status = 0, code = 'request_failed', details, requestId } = {}) {
    super(message)
    this.name = 'StudioApiError'
    Object.assign(this, { status, code, details, requestId })
  }
}

const segment = (value) => encodeURIComponent(value)
const generationPaths = { brief: 'analyse-brief', brief_analysis: 'analyse-brief', copy: 'copy-generations', directions: 'direction-generations', image: 'image-generations' }
const reviewActions = new Set(['request-changes', 'mark-ready', 'reject', 'approve', 'accept'])

export function createStudioApi({ getToken, getHeaders, fetchImpl = globalThis.fetch, baseUrl = '' } = {}) {
  async function request(method, path, { body, revision, idempotencyKey, signal, blob = false } = {}) {
    if (!path.startsWith('/api/v1/') || path.includes('://')) throw new TypeError('An API path is required')
    const headers = new Headers(await getHeaders?.())
    const token = await getToken?.()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (body !== undefined) headers.set('Content-Type', 'application/json')
    if (revision !== undefined) {
      if (!Number.isSafeInteger(revision) || revision < 0) throw new TypeError('A non-negative integer revision is required')
      headers.set('If-Match', `"${revision}"`)
    }
    if (idempotencyKey !== undefined) headers.set('Idempotency-Key', idempotencyKey)
    let response
    try {
      response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal,
        credentials: 'same-origin', cache: 'no-store',
      })
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      // Browsers report transport failures with inconsistent raw text; the request may have reached the server.
      throw new StudioApiError('The connection was interrupted. Check the latest state before trying again.', { status: 0, code: 'network_error' })
    }
    if (!response.ok) {
      let error
      try { error = await response.json() } catch { /* Some proxies return HTML errors. */ }
      throw new StudioApiError(error?.message ?? `Request failed (${response.status})`, {
        status: response.status, code: error?.code, details: error?.details,
        requestId: error?.requestId ?? response.headers.get('x-request-id'),
      })
    }
    if (response.status === 204) return null
    return blob ? response.blob() : response.json()
  }
  const campaignPath = (id) => `/api/v1/campaigns/${segment(id)}`
  const versionPath = (id) => `/api/v1/versions/${segment(id)}`
  const brandPath = (id) => `/api/v1/brand-design-systems/${segment(id)}`
  const api = {
    request,
    planVideo: (campaignId,input) => request('POST',`${campaignPath(campaignId)}/video-generation-plans`,{body:input}),
    generateVideo: (campaignId,body,idempotencyKey) => request('POST',`${campaignPath(campaignId)}/video-generations`,{body,idempotencyKey}),
    getVideoJob: (jobId,options={}) => request('GET',`/api/v1/video-jobs/${segment(jobId)}`,options),
    listVideoJobs: (campaignId,options={}) => request('GET',`${campaignPath(campaignId)}/video-jobs`,options),
    cancelVideoJob: jobId => request('POST',`/api/v1/video-jobs/${segment(jobId)}/cancel`,{body:{}}),
    getSession: () => request('GET', '/api/v1/session'),
    getRuntimeConfig: () => request('GET','/api/v1/runtime-config'),
    getPersonalSettings: () => request('GET', '/api/v1/me/settings'),
    updatePersonalProfile: (input) => request('PATCH', '/api/v1/me/profile', { body: input }),
    syncPasswordAuth: () => request('POST', '/api/v1/me/sign-in/password/sync', { body: {} }),
    disconnectGoogle: () => request('POST', '/api/v1/me/sign-in/google/disconnect', { body: {} }),
    getPersonalAi: () => request('GET', '/api/v1/me/ai'),
    getGenerationReadiness: () => request('GET', '/api/v1/me/ai/readiness'),
    saveAiConnection: (provider, apiKey) => request('PUT', '/api/v1/me/ai/connections', { body: { provider, apiKey } }),
    checkAiConnection: (provider) => request('POST', `/api/v1/me/ai/connections/${segment(provider)}/check`, { body: {} }),
    removeAiConnection: (provider) => request('DELETE', `/api/v1/me/ai/connections/${segment(provider)}`),
    updateAiDefaults: (input) => request('PATCH', '/api/v1/me/ai/defaults', { body: input }),
    getPersonalIntegrations: () => request('GET', '/api/v1/me/integrations'),
    savePersonalIntegration: (platform, input) => request('PUT', `/api/v1/me/integrations/${segment(platform)}`, { body: input }),
    testPersonalIntegration: (platform) => request('POST', `/api/v1/me/integrations/${segment(platform)}/test`, { body: {} }),
    removePersonalIntegration: (platform) => request('DELETE', `/api/v1/me/integrations/${segment(platform)}`),
    updateNotificationPreferences: (input) => request('PATCH', '/api/v1/me/notifications', { body: input }),
    listCampaigns: () => request('GET', '/api/v1/campaigns'),
    createCampaign: (input) => request('POST', '/api/v1/campaigns', { body: input }),
    duplicateCampaign: (id) => request('POST', `${campaignPath(id)}/duplicate`, { body: {} }),
    deleteCampaign: (id, revision) => request('DELETE', campaignPath(id), { revision }),
    extractBriefFile: (input) => request('POST', '/api/v1/brief-files/extract', { body: input }),
    putBriefSource: (id,sourceId,input,revision) => request('PUT',`${campaignPath(id)}/brief-sources/${segment(sourceId)}`,{body:input,revision}),
    getBriefSource: (id,sourceId) => request('GET',`${campaignPath(id)}/brief-sources/${segment(sourceId)}`),
    retryBriefSource: (id,sourceId,revision) => request('POST',`${campaignPath(id)}/brief-sources/${segment(sourceId)}/retry`,{body:{},revision}),
    removeBriefSource: (id,sourceId,revision) => request('DELETE',`${campaignPath(id)}/brief-sources/${segment(sourceId)}`,{revision}),
    startBriefing: (id,revision) => request('POST',`${campaignPath(id)}/briefing`,{body:{},revision}),
    confirmBrief: (id,input,revision,idempotencyKey) => request('POST',`${campaignPath(id)}/brief-confirmations`,{body:input,revision,idempotencyKey}),
    getWorkspace: (id, { signal } = {}) => request('GET', `${campaignPath(id)}/workspace`, { signal }),
    patchCampaign: (id, patch, revision) => request('PATCH', campaignPath(id), { body: patch, revision }),
    generate(id, step, input = {}, key) {
      if (!Object.hasOwn(generationPaths, step)) throw new TypeError('Unknown generation step')
      return request('POST', `${campaignPath(id)}/${generationPaths[step]}`, { body: input, idempotencyKey: key })
    },
    getJob: (id, { signal } = {}) => request('GET', `/api/v1/generation-jobs/${segment(id)}`, { signal }),
    resolveJob: id => request('POST', `/api/v1/generation-jobs/${segment(id)}/resolve`, { body: { resolution: 'marked_failed' } }),
    selectCopy: (id, input, revision) => request('PUT', `${campaignPath(id)}/copy-selection`, { body: input, revision }),
    deselectCopy: (id, revision) => request('DELETE', `${campaignPath(id)}/copy-selection`, { revision }),
    retainCopy: (id, revision) => request('PUT', `${campaignPath(id)}/copy-retention`, { body: {}, revision }),
    approveCopy: (id, copyId, revision, revoke = false) => request('PUT', `${campaignPath(id)}/copies/${segment(copyId)}/approval`, { body: revoke ? { revoke: true } : {}, revision }),
    editCopy: (id, copyId, body, revision) => request('PUT', `${campaignPath(id)}/copies/${segment(copyId)}`, { body, revision }),
    deleteCopy: (id, copyId, revision) => request('DELETE', `${campaignPath(id)}/copies/${segment(copyId)}`, { revision }),
    selectDirection: (id, input, revision) => request('PUT', `${campaignPath(id)}/direction-selection`, { body: input, revision }),
    uploadVisual: (id, input, revision, key) => request('POST', `${campaignPath(id)}/visual-uploads`, { body: input, revision, idempotencyKey: key }),
    listTemplates: () => request('GET', '/api/v1/templates'),
    getTemplateVersion: (id, version, { signal } = {}) => request('GET', `/api/v1/templates/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}`, { signal }),
    saveComposition: (id, input, revision) => request('PUT', `${campaignPath(id)}/composition`, { body: input, revision }),
    saveBannerBatch: (id, input, revision) => request('PUT', `${campaignPath(id)}/banner-batch`, { body: input, revision }),
    createVersion: (id, input, revision, key) => request('POST', `${campaignPath(id)}/versions`, { body: input ?? {}, revision, idempotencyKey: key }),
    getFigmaHandoff: (id, options = {}) => request('GET', `${versionPath(id)}/figma-handoff`, options),
    getFigmaSubmission: (id, options = {}) => request('GET', `${versionPath(id)}/figma-submission`, options),
    sendToFigma: (id, input, revision, key) => request('POST', `${versionPath(id)}/figma-handoff`, {body:input,revision,idempotencyKey:key}),
    confirmFigmaPairing: (id, code) => request('POST', `/api/v1/figma/pairings/${segment(id)}/confirm`, {body:{code}}),
    getFigmaOutputBlob: (submissionId,outputId,options={}) => request('GET', `/api/v1/figma/submissions/${segment(submissionId)}/outputs/${segment(outputId)}`, {...options,blob:true}),
    getReview: (id, { signal } = {}) => request('GET', `${versionPath(id)}/review`, { signal }),
    review(id, action, input, revision, key) {
      if (!reviewActions.has(action)) throw new TypeError('Unknown review action')
      return request('POST', `${versionPath(id)}/${action}`, { body: input ?? {}, revision, idempotencyKey: key })
    },
    reopen: (id, revision, key) => request('POST', `${campaignPath(id)}/reopen`, { body: {}, revision, idempotencyKey: key }),
    deliver: (id, input = {}, key) => request('POST', `${versionPath(id)}/delivery`, { body: input, idempotencyKey: key }),
    getDelivery: (id, { signal } = {}) => request('GET', `${versionPath(id)}/delivery`, { signal }),
    getAssetBlob: (id, { signal } = {}) => request('GET', `/api/v1/assets/${segment(id)}`, { blob: true, signal }),
    listBrandSystems: () => request('GET', '/api/v1/brand-design-systems'),
    getBrandSystemConfig: () => request('GET', '/api/v1/brand-design-systems/config'),
    createBrandSystem: (input) => request('POST', '/api/v1/brand-design-systems', { body: input }),
    getBrandSystem: (id, { signal } = {}) => request('GET', brandPath(id), { signal }),
    grantBrandViewer: (id, userId) => request('POST', `${brandPath(id)}/viewers`, { body: { userId } }),
    inspectBrandSources: (id, { signal } = {}) => request('GET', `${brandPath(id)}/sources/inspect`, { signal }),
    patchBrandDraft: (id, draft, revision) => request('PATCH', `${brandPath(id)}/draft`, { body: { draft }, revision }),
    addBrandSource: (id, input, revision) => request('POST', `${brandPath(id)}/sources`, { body: input, revision }),
    addBrandAsset: (id, input, revision) => request('POST', `${brandPath(id)}/assets`, { body: input, revision }),
    getBrandAssetBlob: (id, assetId, { signal } = {}) => request('GET', `${brandPath(id)}/assets/${segment(assetId)}`, { blob: true, signal }),
    analyseBrandSources: (id, revision, approvalFingerprint) => request('POST', `${brandPath(id)}/analyse`, { body: approvalFingerprint ? { approvalFingerprint } : {}, revision }),
    listBrandVersions: (id) => request('GET', `${brandPath(id)}/versions`),
    restoreBrandVersion: (id, versionId, revision) => request('POST', `${brandPath(id)}/versions/${segment(versionId)}/restore`, { body: {}, revision }),
    publishBrandSystem: (id, revision, idempotencyKey) => request('POST', `${brandPath(id)}/publish`, { body: {}, revision, idempotencyKey }),
    proposeBrandChange: (id, prompt, approvalFingerprint) => request('POST', `${brandPath(id)}/proposals`, { body: { prompt, ...(approvalFingerprint ? { approvalFingerprint } : {}) } }),
    applyBrandProposal: (id, proposalId, revision) => request('POST', `${brandPath(id)}/proposals/${segment(proposalId)}/apply`, { body: {}, revision }),
    discardBrandProposal: (id, proposalId) => request('POST', `${brandPath(id)}/proposals/${segment(proposalId)}/discard`, { body: {} }),
    async downloadDelivery(id) {
      const delivery = await api.getDelivery(id)
      return api.getAssetBlob(delivery.asset.id)
    },
  }
  return Object.freeze(api)
}
