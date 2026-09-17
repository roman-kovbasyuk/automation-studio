import { withTransaction } from '../db/pool.js'
import { createCampaignRepository } from '../repositories/campaignRepository.js'
import { createGenerationJobRepository } from '../repositories/generationJobRepository.js'
import { createVersionRepository } from '../repositories/versionRepository.js'
import { createDeliveryRepository } from '../repositories/deliveryRepository.js'
import { workspaceRecordSchema } from '../../shared/studioContracts.js'
import { AuthorizationError } from '../auth/authorize.js'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { rawBrief } from '../../shared/briefAnalysis.js'
import {createBriefingRepository,sourceSummary} from '../repositories/briefingRepository.js'

export function createWorkspaceService({ pool, transaction = withTransaction } = {}) {
  return {
    async getWorkspace({ actor, campaignId }) {
      if (!actor?.id || actor.disabled || actor.disabledAt != null || !['marketer', 'designer', 'admin'].includes(actor.role)) {
        throw new AuthorizationError(403, 'forbidden', 'This actor cannot read campaigns')
      }
      return transaction(pool, async (client) => {
        // All records belong to one consistent snapshot, including a concurrent generation/review update.
        await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY')
        const campaigns = createCampaignRepository(client)
        let campaign = await campaigns.findById(campaignId)
        if (!campaign) return null
        if (!Object.hasOwn(campaign.brief, 'analysis')) {
          // Legacy analyses need source proof before the results-only editor can
          // show them. Hydrate read-only; never rewrite historical job snapshots.
          const previous = await client.query(`SELECT input_snapshot->'brief' AS brief, result_metadata->'analysis' AS analysis
            FROM generation_jobs WHERE campaign_id = $1 AND step = 'brief_analysis' AND status = 'succeeded'
            ORDER BY created_at DESC, id DESC LIMIT 1`, [campaignId])
          const source = previous.rows[0]
          const analysis = source?.brief && hashCanonical(rawBrief(source.brief)) === hashCanonical(rawBrief(campaign.brief)) ? source.analysis : null
          campaign = { ...campaign, brief: { ...campaign.brief, analysis: analysis ?? null } }
        }
        const copies = await client.query('SELECT cs.id, cs.candidates, cs.origin, cs.copy_source_key, cs.selected_candidate_id, cs.approved_candidate_ids, cs.deleted_candidate_ids, cs.stale, cs.retained_brief_hash, gj.input_snapshot FROM copy_sets cs LEFT JOIN generation_jobs gj ON gj.id = cs.generation_job_id AND gj.campaign_id = cs.campaign_id WHERE cs.campaign_id = $1 ORDER BY cs.created_at ASC, cs.id ASC', [campaignId])
        const approvals = await client.query(`SELECT DISTINCT payload->>'copySetId' AS id FROM audit_events
          WHERE entity_type='campaign' AND entity_id=$1 AND action IN ('campaign.copy_approved','campaign.copy_selected')`, [campaignId])
        const directions = await client.query(`SELECT d.*, a.source, j.id AS image_job_id, j.status AS image_job_status, j.error_code AS image_error_code,
          j.unknown_reason AS image_unknown_reason, j.timeout_at AS image_timeout_at
          FROM visual_directions d LEFT JOIN assets a ON a.id = d.preview_asset_id
          LEFT JOIN LATERAL (SELECT id, status, error_code, unknown_reason, timeout_at FROM generation_jobs
            WHERE campaign_id = d.campaign_id AND step = 'image' AND input_snapshot->'direction'->>'id' = d.id
            ORDER BY created_at DESC, id DESC LIMIT 1) j ON true
          WHERE d.campaign_id = $1 ORDER BY d.created_at ASC, d.batch_id, d.batch_position, d.id`, [campaignId])
        const versions = await campaigns.listVersions(campaignId)
        const composition = await createVersionRepository(client).findComposition(campaignId, campaign.compositionId)
        const jobs = await createGenerationJobRepository(client).listForCampaign(campaignId)
        const currentVersion = versions.find((version) => version.versionNumber === campaign.currentVersionNumber)
        const storedDelivery = actor.role !== 'designer' && currentVersion
          ? await createDeliveryRepository(client).findDeliveryByVersion(currentVersion.id) : null
        const { storedAsset: _storedAsset, ...delivery } = storedDelivery ?? {}
        return workspaceRecordSchema.parse({
          campaign,
          ...(campaign.brief.briefing?{sources:(await createBriefingRepository(client).listSources(campaignId)).map(sourceSummary)}:{}),
          copies: copies.rows.map((row) => ({ id: row.id, candidates: row.candidates.filter((copy) => !row.deleted_candidate_ids.includes(copy.id)), selectedCandidateId: row.deleted_candidate_ids.includes(row.selected_candidate_id) ? null : row.selected_candidate_id,
            ...(row.origin!=='generated'?{origin:row.origin}:{}),
            hasApprovalHistory: Boolean(row.approved_candidate_ids?.length || row.selected_candidate_id || approvals.rows.some(approval => approval.id === row.id)),
            approvedCandidateIds: [...new Set([...(row.approved_candidate_ids ?? []),
              ...(campaign.selectedCopyId === row.id && row.selected_candidate_id ? [row.selected_candidate_id] : []),
            ])].filter(id => !row.deleted_candidate_ids.includes(id) && row.candidates.some(copy => copy.id === id)), stale: row.stale, sourceBriefKey: row.retained_brief_hash ?? row.copy_source_key ?? (row.input_snapshot?.brief ? hashCanonical(row.input_snapshot.brief) : row.id) })),
          directions: directions.rows.map((row) => ({ id: row.id, title: row.title, prompt: row.prompt, status: row.status, previewAssetId: row.preview_asset_id, stale: row.stale,
            scope: row.scope, copy: row.copy_snapshot, batchId: row.batch_id, source: row.source ?? null,
            generation: row.image_job_id ? { id: row.image_job_id, status: row.image_job_status, errorCode: row.image_error_code,
              unknownReason: row.image_unknown_reason ?? null, timeoutAt: row.image_timeout_at.toISOString() } : null })),
          composition, versions, jobs, delivery: storedDelivery ? delivery : null,
        })
      })
    },
  }
}
