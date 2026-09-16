import { expect, test } from 'vitest'
import { createIsolatedStudio } from '../../server/testing/isolatedStudio.js'
import { createWorkflowService } from '../../server/services/workflowService.js'
import { createGenerationProviderRegistry } from '../../server/providers/registry.js'
import * as launcher from '../dev-studio.mjs'

test('restarting demo configuration preserves the saved spending pause and lower allowance', async () => {
  const studio = await createIsolatedStudio()
  try {
    const actor = studio.actor('admin')
    const providerRegistry = createGenerationProviderRegistry({ provider: 'gemini', textModel: 'gemini-3.5-flash', imageModel: 'gemini-3.1-flash-image', region: 'eu' })
    const service = createWorkflowService({ pool: studio.pool, providerRegistry })
    const initial = await service.getSettings({ actor })
    await service.updateSettings({ actor, expectedRevision: initial.revision, patch: { provider: 'gemini', model: 'gemini-3.5-flash', region: 'eu', generationDisabled: true, dailyBudgetMicrounits: 20_000_000 } })
    expect(typeof launcher.initializeDemoGenerationSettings).toBe('function')
    await launcher.initializeDemoGenerationSettings(service, actor)
    await launcher.initializeDemoGenerationSettings(service, actor)
    expect(await service.getSettings({ actor })).toMatchObject({ generationDisabled: true, dailyBudgetMicrounits: 20_000_000 })
    const api = studio.api('marketer')
    const campaign = await api.createCampaign({ title: 'Synthetic spending pause check', brief: { notes: 'Synthetic test, never sent to a paid provider.' } })
    await expect(api.generate(campaign.id, 'brief', {}, 'pause-check')).rejects.toMatchObject({ code: 'kill_switch_active' })
    expect((await studio.pool.query('SELECT count(*)::int AS count FROM generation_jobs')).rows[0].count).toBe(0)
  } finally { await studio.close() }
}, 30_000)
