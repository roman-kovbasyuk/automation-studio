import { createPrototypeSeed } from './fixtures/seed.js'
import { createMemoryPrototypeStore, openPrototypeStore, clonePrototypeValue } from './store.js'
import { createPrototypeScenarios } from './scenarios.js'
import { createPrototypeJobs } from './jobs.js'
import { createWorkspaceApi } from './api/workspace.js'
import { createFlowApi } from './api/flow.js'
import { emptyBriefAnswers } from '../../shared/briefingContracts.js'

function defaultId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `prototype-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export async function createPrototypeSession({ store, seed = createPrototypeSeed(), clock = () => Date.now(), idFactory = defaultId, latencyMs = 450 } = {}) {
  const ownedStore = store ?? await openPrototypeStore({ seed })
  const initial = await ownedStore.read()
  if (!initial?.schemaVersion) await ownedStore.reset(seed)
  await ownedStore.update(state => {
    state.reviewHistories ??= {}
    state.figmaHandoffs ??= {}
    state.jobs ??= {}
    state.receipts ??= {}
    for (const workspace of Object.values(state.workspaces ?? {})) {
      const briefing = workspace.campaign?.brief?.briefing
      if (briefing?.schemaVersion === 2 && !briefing.answers) briefing.answers = emptyBriefAnswers()
      if (briefing?.schemaVersion === 2 && !briefing.sourceKey) briefing.sourceKey = 'a'.repeat(64)
      if (briefing?.schemaVersion === 2 && !briefing.sourceIds) briefing.sourceIds = []
      if (briefing?.schemaVersion === 2 && !briefing.analysisJobId) briefing.analysisJobId = null
    }
    for (const history of Object.values(state.reviewHistories ?? {})) {
      for (const event of history.events ?? []) {
        if (event.actorRole === 'designer') event.actorId = 'prototype-designer'
        if (event.actorRole === 'marketer') event.actorId = 'prototype-marketer'
      }
    }
  })
  const scenarios = createPrototypeScenarios()
  scenarios.setLatency(latencyMs)
  const actor = (await ownedStore.read()).actor
  const jobs = createPrototypeJobs({ store: ownedStore, scenarios, clock, idFactory })
  const workspaceApi = createWorkspaceApi({ store: ownedStore, scenarios, idFactory, actor })
  const flowApi = createFlowApi({ store: ownedStore, scenarios, jobs, idFactory, actor })
  const api = Object.freeze({ ...workspaceApi, ...flowApi })
  let disposed = false
  return {
    api,
    store: ownedStore,
    scenarios: Object.freeze({
      failNext: scenarios.failNext,
      setLatency: scenarios.setLatency,
      setActor: scenarios.setActor,
      getActor: scenarios.getActor,
    }),
    jobs,
    async reset() { await ownedStore.reset(seed) },
    async dispose() { if (disposed) return; disposed = true; await ownedStore.close() },
    async read() { return clonePrototypeValue(await ownedStore.read()) },
  }
}

export async function createSessionFixture({ scenario = 'draft', latencyMs = 0 } = {}) {
  const seed = createPrototypeSeed()
  const store = createMemoryPrototypeStore({ value: seed })
  const session = await createPrototypeSession({ store, seed, latencyMs })
  return { ...session, scenario }
}
