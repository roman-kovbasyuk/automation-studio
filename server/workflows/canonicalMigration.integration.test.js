import { expect, test } from 'vitest'
import { createIsolatedStudio } from '../testing/isolatedStudio.js'
import { inspectCanonicalMigration, applyCanonicalMigration } from './canonicalMigration.js'

test('canonical migration preserves an old editable campaign and is replay-safe', async () => {
  const studio = await createIsolatedStudio()
  try {
    const marketer = studio.actor('marketer'), admin = studio.actor('admin')
    const campaign = { id: 'legacy-campaign' }
    await studio.pool.query(`INSERT INTO campaigns(id,title,brief,created_by,project_type)
      VALUES($1,$2,$3,$4,'banners')`, [campaign.id, 'Legacy fixture', { notes: 'Keep this exact source text.' }, marketer.id])
    const before = await studio.pool.query('SELECT brief, revision, status FROM campaigns WHERE id=$1', [campaign.id])
    const inspected = await inspectCanonicalMigration({ pool: studio.pool, campaignIds: [campaign.id] })
    expect(inspected.readyIds).toEqual([campaign.id])
    expect(inspected.blocked).toEqual([])

    const result = await applyCanonicalMigration({ pool: studio.pool, campaignIds: [campaign.id], manifestHash: inspected.manifestHash, actor: admin })
    expect(result).toEqual({ migratedIds: [campaign.id], unchangedIds: [], blocked: [] })
    const after = await studio.pool.query('SELECT brief, revision, status FROM campaigns WHERE id=$1', [campaign.id])
    expect(after.rows[0].brief.notes).toBe(before.rows[0].brief.notes)
    expect(after.rows[0].brief.briefing).toMatchObject({ schemaVersion: 2, analysisJobId: null, confirmation: null })
    expect(after.rows[0].brief.analysis).toBeNull()
    expect(after.rows[0].revision).toBe(Number(before.rows[0].revision) + 1)
    expect((await studio.pool.query('SELECT count(*)::int AS n FROM generation_jobs WHERE campaign_id=$1', [campaign.id])).rows[0].n).toBe(0)
    expect((await studio.pool.query('SELECT count(*)::int AS n FROM brief_confirmations WHERE campaign_id=$1', [campaign.id])).rows[0].n).toBe(0)

    const replayInspection = await inspectCanonicalMigration({ pool: studio.pool, campaignIds: [campaign.id] })
    expect(replayInspection.unchangedIds).toEqual([campaign.id])
    const replay = await applyCanonicalMigration({ pool: studio.pool, campaignIds: [campaign.id], manifestHash: replayInspection.manifestHash, actor: admin })
    expect(replay).toEqual({ migratedIds: [], unchangedIds: [campaign.id], blocked: [] })
    const replayed = await studio.pool.query('SELECT revision FROM campaigns WHERE id=$1', [campaign.id])
    expect(replayed.rows[0].revision).toBe(after.rows[0].revision)
  } finally {
    await studio.close()
  }
}, 30000)
