import { withTransaction } from '../db/pool.js'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { rawBrief } from '../../shared/briefAnalysis.js'
import { initialBriefingState } from '../repositories/briefingRepository.js'

export const CANONICAL_CUTOVER_VERSION = '2026-09-15-canonical-v1'

function requireCampaignIds(campaignIds) {
  if (!Array.isArray(campaignIds) || campaignIds.length === 0 || campaignIds.some(id => typeof id !== 'string' || !id.trim())) {
    const error = new Error('Explicit campaign IDs are required for canonical migration')
    error.code = 'migration_campaign_ids_required'
    throw error
  }
  return [...new Set(campaignIds)]
}

function migrationBlock(campaign, jobs) {
  if (jobs.some(job => ['pending', 'unknown'].includes(job.status))) return 'generation_in_flight'
  if (['in_review', 'changes_requested', 'ready'].includes(campaign.status)) return 'approval_scope_deferred'
  if (['approved', 'delivered'].includes(campaign.status)) return 'sealed_history'
  return null
}

async function readCampaign(client, campaignId, { lock = false } = {}) {
  const campaign = (await client.query(`SELECT * FROM campaigns WHERE id=$1 AND archived_at IS NULL${lock ? ' FOR UPDATE' : ''}`, [campaignId])).rows[0]
  if (!campaign) return null
  const jobs = (await client.query('SELECT id, step, status, actual_cost_microunits FROM generation_jobs WHERE campaign_id=$1 ORDER BY created_at,id', [campaignId])).rows
  const copies = (await client.query('SELECT id, candidates, stale, deleted_candidate_ids FROM copy_sets WHERE campaign_id=$1 ORDER BY created_at,id', [campaignId])).rows
  const directions = (await client.query('SELECT id, prompt, scope, copy_snapshot, stale FROM visual_directions WHERE campaign_id=$1 ORDER BY created_at,id', [campaignId])).rows
  const versions = (await client.query('SELECT id, version_number, content_hash, snapshot FROM campaign_versions WHERE campaign_id=$1 ORDER BY version_number,id', [campaignId])).rows
  return { campaign, jobs, copies, directions, versions }
}

function manifestEntry(value) {
  return {
    campaignId: value.campaign.id,
    revision: value.campaign.revision,
    briefHash: hashCanonical(value.campaign.brief),
    status: value.campaign.status,
    jobStates: value.jobs.map(job => ({ id: job.id, step: job.step, status: job.status, cost: job.actual_cost_microunits })),
    copyIds: value.copies.map(row => row.id),
    directionIds: value.directions.map(row => row.id),
    versionHashes: value.versions.map(row => ({ id: row.id, hash: row.content_hash })),
  }
}

export async function inspectCanonicalMigration({ pool, transaction = withTransaction, campaignIds }) {
  const ids = requireCampaignIds(campaignIds)
  return transaction(pool, async client => {
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY')
    const readyIds = [], unchangedIds = [], blocked = [], entries = []
    for (const id of ids) {
      const value = await readCampaign(client, id)
      if (!value) {
        blocked.push({ campaignId: id, reasonCode: 'not_found' })
        continue
      }
      const block = migrationBlock(value.campaign, value.jobs)
      entries.push(manifestEntry(value))
      if (block) blocked.push({ campaignId: id, reasonCode: block })
      else if (value.campaign.brief?.briefing?.schemaVersion === 2) unchangedIds.push(id)
      else readyIds.push(id)
    }
    return {
      manifestHash: hashCanonical({ cutoverVersion: CANONICAL_CUTOVER_VERSION, entries }),
      readyIds, unchangedIds, blocked,
    }
  })
}

export async function applyCanonicalMigration({ pool, transaction = withTransaction, campaignIds, manifestHash, actor }) {
  const ids = requireCampaignIds(campaignIds)
  if (typeof manifestHash !== 'string' || !/^[a-f0-9]{64}$/.test(manifestHash)) {
    const error = new Error('A current migration manifest hash is required')
    error.code = 'migration_manifest_required'
    throw error
  }
  if (!actor?.id || actor.disabled || !['admin'].includes(actor.role)) {
    const error = new Error('Only an enabled admin can apply canonical migration')
    error.code = 'forbidden'
    throw error
  }
  return transaction(pool, async client => {
    const entries = [], unchangedIds = [], migratedIds = [], blocked = []
    for (const id of ids) {
      const value = await readCampaign(client, id, { lock: true })
      if (!value) { blocked.push({ campaignId: id, reasonCode: 'not_found' }); continue }
      entries.push(manifestEntry(value))
      const block = migrationBlock(value.campaign, value.jobs)
      if (block) { blocked.push({ campaignId: id, reasonCode: block }); continue }
      const receipt = (await client.query('SELECT campaign_id FROM canonical_workflow_migrations WHERE campaign_id=$1 AND cutover_version=$2', [id, CANONICAL_CUTOVER_VERSION])).rows[0]
      if (receipt || value.campaign.brief?.briefing?.schemaVersion === 2) { unchangedIds.push(id); continue }
    }
    const currentManifest = hashCanonical({ cutoverVersion: CANONICAL_CUTOVER_VERSION, entries })
    if (currentManifest !== manifestHash) {
      const error = new Error('The campaign changed since migration inspection; inspect again before applying')
      error.code = 'migration_manifest_stale'
      throw error
    }
    for (const id of ids) {
      if (blocked.some(item => item.campaignId === id) || unchangedIds.includes(id)) continue
      const value = await readCampaign(client, id, { lock: true })
      if (!value) continue
      const brief = rawBrief(value.campaign.brief)
      const nextBrief = { ...brief, analysis: null, briefing: initialBriefingState(brief) }
      await client.query(`UPDATE campaigns SET brief=$2,status='draft',selected_copy_id=NULL,selected_direction_id=NULL,composition_id=NULL,revision=revision+1,updated_at=now() WHERE id=$1`, [id, nextBrief])
      await client.query('UPDATE copy_sets SET stale=true WHERE campaign_id=$1 AND stale=false', [id])
      await client.query('UPDATE visual_directions SET stale=true WHERE campaign_id=$1 AND stale=false', [id])
      await client.query('UPDATE compositions SET stale=true WHERE campaign_id=$1 AND stale=false', [id])
      await client.query('INSERT INTO canonical_workflow_migrations(campaign_id,cutover_version,manifest_hash,migrated_by) VALUES($1,$2,$3,$4)', [id, CANONICAL_CUTOVER_VERSION, manifestHash, actor.id])
      migratedIds.push(id)
    }
    return { migratedIds, unchangedIds, blocked }
  })
}
