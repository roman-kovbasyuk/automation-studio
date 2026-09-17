import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { expect, test } from 'vitest'
import { runMigrations } from '../db/migrate.js'
import { createCampaignRepository } from '../repositories/campaignRepository.js'
import { createGenerationControlPlane } from '../repositories/generationJobRepository.js'
import { createGenerationService } from './generationService.js'
import { createWorkspaceService } from './workspaceService.js'
import { createMockProvider } from '../providers/mockProvider.js'
import { createMemoryAssetStore } from '../storage/memoryAssetStore.js'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { copyProjection } from '../../shared/briefingDependencies.js'
import { briefWithBriefing, confirmBriefing } from '../testing/briefingFixtures.js'

test('retains only the previous copy cohort for the current brief, clears approvals, and invalidates on the next edit', async () => {
  const schema = `retain_${randomUUID().replaceAll('-', '')}`
  const connectionString = process.env.TEST_DATABASE_URL ?? 'postgresql:///banner_studio_test'
  const maintenance = new Pool({ connectionString })
  await maintenance.query(`CREATE SCHEMA ${schema}`)
  const pool = new Pool({ connectionString, options: `-c search_path=${schema}` })
  try {
    await runMigrations({ pool })
    await pool.query('UPDATE settings SET per_step_regeneration_limit = 100, daily_budget_microunits = 100000000')
    const actor = { id: 'retention-editor', role: 'marketer' }
    await pool.query("INSERT INTO users (id,email,role,display_name) VALUES ($1,'retention@example.test','marketer','Retention test')", [actor.id])
    const campaigns = createCampaignRepository(pool)
    await campaigns.create({ id: 'retention-campaign', title: 'Launch', createdBy: actor.id, brief: briefWithBriefing({ product: 'Headphones', audience: 'Commuters', objective: 'Shop', offer: '', locale: 'en', notes: 'Launch on Instagram.' }) })
    const service = createGenerationService({ pool, controlPlane: createGenerationControlPlane({ pool }), assetStore: createMemoryAssetStore(), providers: { mock: createMockProvider() } })
    const request = { actor, campaignId: 'retention-campaign' }
    const read = () => createWorkspaceService({ pool }).getWorkspace(request)
    await service.analyseBrief({ ...request, idempotencyKey: 'analysis', input: {} })
    await confirmBriefing({ pool, ...request })
    await service.generateCopy({ ...request, idempotencyKey: 'old', input: {} })
    // Changing a confirmed answer that copy depends on makes existing copy stale.
    const change = summary => confirmBriefing({ pool, ...request, answers: { summary }, idempotencyKey: `change:${summary.replaceAll(' ', '-')}` })
    await change('Updated campaign summary')
    await service.generateCopy({ ...request, idempotencyKey: 'previous', input: {} })
    const previous = (await read()).copies.filter(set => !set.stale)
    await change('Latest campaign summary')
    const before = await read()
    await expect(service.retainCopy({ ...request, actor: { ...actor, role: 'designer' }, expectedRevision: before.campaign.revision })).rejects.toMatchObject({ statusCode: 403 })
    await expect(service.retainCopy({ ...request, expectedRevision: before.campaign.revision - 1 })).rejects.toMatchObject({ code: 'revision_conflict' })
    await service.retainCopy({ ...request, expectedRevision: before.campaign.revision })
    const after = await read()
    expect(after.copies.filter(set => !set.stale).map(set => set.id)).toEqual(previous.map(set => set.id))
    expect(after.copies.filter(set => !set.stale).flatMap(set => set.candidates)).toEqual(previous.flatMap(set => set.candidates))
    expect(after.copies.filter(set => !set.stale).every(set => set.approvedCandidateIds.length === 0)).toBe(true)
    expect(after.jobs).toHaveLength(before.jobs.length)
    const retention = await pool.query('SELECT retained_brief_hash FROM copy_sets WHERE stale = false')
    expect(retention.rows[0].retained_brief_hash).toBe(hashCanonical(copyProjection(after.campaign.brief)))
    await service.approveCopy({ ...request, expectedRevision: after.campaign.revision, input: { copyId: previous[0].candidates[0].id } })
    expect((await read()).copies.find(set => set.id === previous[0].id).approvedCandidateIds).toContain(previous[0].candidates[0].id)
    await change('Another edit')
    expect((await read()).copies.every(set => set.stale)).toBe(true)
  } finally { await pool.end(); await maintenance.query(`DROP SCHEMA ${schema} CASCADE`); await maintenance.end() }
}, 20000)
