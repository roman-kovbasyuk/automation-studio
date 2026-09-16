export function createPrototypeJobs({ store, scenarios, clock = () => Date.now(), idFactory = () => crypto.randomUUID() }) {
  async function run({ campaignId, step, result, apply, idempotencyKey }) {
    const latencyMs = scenarios.getLatency()
    const jobId = idFactory()
    const createdAt = new Date(clock()).toISOString()
    const job = { id: jobId, campaignId, step, provider: 'prototype', model: 'prepared-v1', status: latencyMs ? 'pending' : 'succeeded', attempts: 1, safety: {}, usage: {}, reservedCostMicrounits: 0, actualCostMicrounits: 0, timeoutAt: createdAt, createdAt, updatedAt: createdAt, errorCode: null, result: latencyMs ? null : result, idempotencyKey }
    await store.update(state => {
      state.jobs[jobId] = job
      const workspace = state.workspaces[campaignId]
      if (workspace) workspace.jobs.push(job)
      if (!latencyMs) apply?.(workspace, result)
    })
    if (!latencyMs) return { job }
    setTimeout(() => {
      void store.update(state => {
        const current = state.jobs[jobId]
        const workspace = state.workspaces[campaignId]
        if (!current || current.status !== 'pending' || !workspace) return
        current.status = 'succeeded'; current.result = result; current.updatedAt = new Date(clock()).toISOString()
        const stored = workspace.jobs.find(item => item.id === jobId)
        if (stored) Object.assign(stored, current)
        apply?.(workspace, result)
      }).catch(() => {})
    }, latencyMs)
    return { job }
  }
  return { run }
}
