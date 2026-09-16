const base = '/api/v1/admin'
const segment = encodeURIComponent
const query = (values) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values || {}))
    if (value !== '' && value !== null && value !== undefined)
      params.set(key, String(value))
  return params.size ? `?${params}` : ''
}
export function createAdminApi(api) {
  const recipePath = (id) => `${base}/asset-workflows/${segment(id)}`
  return {
    overview: () => api.request('GET', `${base}/overview`),
    records: (section, filters) =>
      api.request('GET', `${base}/${section}${query(filters)}`),
    project: (id) => api.request('GET', `${base}/projects/${segment(id)}`),
    projectActivity: (id, filters) =>
      api.request(
        'GET',
        `${base}/projects/${segment(id)}/activity${query(filters)}`,
      ),
    recipes: () => api.request('GET', `${base}/asset-workflows`),
    capabilities: () =>
      api.request('GET', `${base}/asset-workflow-capabilities`),
    create: (body) => api.request('POST', `${base}/asset-workflows`, { body }),
    recipe: (id) => api.request('GET', recipePath(id)),
    save: (id, expectedRevision, draft) =>
      api.request('PUT', `${recipePath(id)}/draft`, {
        body: { expectedRevision, draft },
      }),
    validate: (id, expectedRevision) =>
      api.request('POST', `${recipePath(id)}/validate`, {
        body: { expectedRevision },
      }),
    simulate: (id, expectedRevision, draftHash, fixture) =>
      api.request('POST', `${recipePath(id)}/simulations`, {
        body: { expectedRevision, draftHash, fixture },
      }),
    publish: (id, body) =>
      api.request('POST', `${recipePath(id)}/publish`, { body }),
    activate: (id, versionId) =>
      api.request('POST', `${recipePath(id)}/activate`, {
        body: { versionId },
      }),
    reference: (id, versionId) =>
      api.request(
        'GET',
        `${recipePath(id)}/versions/${segment(versionId)}/reference`,
      ),
  }
}
