import { randomUUID, createHash } from 'node:crypto'
import { withTransaction } from '../db/pool.js'
import { createSettingsRepository } from '../repositories/settingsRepository.js'
import { createCampaignRepository } from '../repositories/campaignRepository.js'
import { createGenerationJobRepository } from '../repositories/generationJobRepository.js'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { videoPlanRequestSchema, videoJobRecordSchema } from '../../shared/videoContracts.js'
import { loadVisualContext, visualError } from './visualContext.js'
import { VEO_MODEL, VEO_OUTPUT } from '../providers/veoProvider.js'
import { decodeGeneratedVideo, videoToolsAvailable } from '../media/videoDecoder.js'

// USD estimate for 4s of Veo Lite 720p audio/video at $0.05/s; not a reconciled bill.
// Pricing reviewed 2026-09-08: https://ai.google.dev/gemini-api/docs/pricing#veo-3.1
const estimatedCostMicrounits = 200_000
const hash = value => createHash('sha256').update(value).digest('hex')
const fail = (code, message, status = 409) => { throw visualError(code, message, status) }
function authorize(actor, editor = true) {
  if (!actor?.id || actor.disabled || actor.disabledAt || !(editor ? ['marketer','admin'] : ['marketer','designer','admin']).includes(actor.role)) fail('forbidden','This actor cannot perform this video operation.',403)
}
const editable = new Set(['draft','copy_ready','direction_selected','composed'])
const selectVideo = `SELECT j.*, v.direction_id, v.phase, v.operation_name, v.lease_token, v.lease_expires_at,
  v.asset_metadata, v.source_hash, v.accepted_cost_microunits FROM generation_jobs j JOIN video_jobs v ON v.job_id=j.id`
function publicJob(row) {
  if (!row) return null
  return videoJobRecordSchema.parse({ id: row.id, campaignId: row.campaign_id, directionId: row.direction_id, model: row.model,
    phase: row.phase, errorCode: row.error_code, asset: row.asset_metadata, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString() })
}
async function source(client, campaignId, input) {
  const campaign = await createCampaignRepository(client).findByIdForUpdate(campaignId)
  if (!campaign || campaign.archivedAt) fail('not_found','Campaign not found.',404)
  if (!editable.has(campaign.status)) fail('campaign_locked','The campaign is not editable.')
  const direction = (await client.query('SELECT id,prompt,stale,copy_snapshot,preview_asset_id FROM visual_directions WHERE id=$1 AND campaign_id=$2', [input.directionId,campaignId])).rows[0]
  if (!direction || direction.stale || !direction.prompt) fail('source_changed','Choose a current generated visual prompt.')
  const context = await loadVisualContext(client, campaign, { mode: 'campaign' })
  return { brief: context.brief, analysis: context.analysis, direction, prompt: input.prompt ?? direction.prompt,
    directionId: direction.id, aspectRatio: input.aspectRatio }
}
export function createVideoGenerationService({ pool, assetStore, providerFactory, pollIntervalMs = 15_000 } = {}) {
  let busy = false
  const getProvider = async () => { const provider = await providerFactory?.(); if (!provider || provider.model !== VEO_MODEL) fail('video_not_connected','Video generation is not connected.',503); return provider }
  async function read(jobId, client = pool) { return (await client.query(`${selectVideo} WHERE j.id=$1 AND j.step='video'`, [jobId])).rows[0] }
  async function finalize(client, id, phase, errorCode = null, result = null, safety = {}, noSpend = false) {
    const status = phase === 'succeeded' ? 'succeeded' : phase === 'unknown' ? 'unknown' : phase === 'blocked' ? 'blocked' : 'failed'
    await client.query(`UPDATE video_jobs SET phase=$2,lease_token=NULL,lease_expires_at=NULL WHERE job_id=$1`,[id,phase])
    await client.query(`UPDATE generation_jobs SET status=$2,error_code=$3,result_metadata=$4,safety=$5,
      actual_cost_microunits=CASE WHEN $6 THEN 0 ELSE actual_cost_microunits END,updated_at=clock_timestamp(),completed_at=clock_timestamp() WHERE id=$1`, [id,status,errorCode,result,safety,noSpend])
    const job = await createGenerationJobRepository(client).findById(id)
    await client.query('UPDATE generation_jobs SET response_status=201,response_body=$2 WHERE id=$1',[id,{job}])
  }
  const service = {
    async plan({ actor, campaignId, input }) {
      authorize(actor)
      const parsed = videoPlanRequestSchema.safeParse(input)
      if (!parsed.success) fail('invalid_request','Choose a direction and supported video format.',400)
      const snapshot = await withTransaction(pool, client => source(client,campaignId,parsed.data))
      if (!await videoToolsAvailable()) fail('video_tools_unavailable','Video validation tools are unavailable. No generation was submitted.',503)
      const provider = await getProvider()
      if (!(await provider.check()).available) fail('model_unavailable','The configured video model is unavailable.',503)
      const id = randomUUID(), expiresAt = new Date(Date.now()+300_000)
      await pool.query(`INSERT INTO video_generation_plans(id,campaign_id,actor_id,model,input,source_hash,estimated_cost_microunits,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id,campaignId,actor.id,provider.model,snapshot,hashCanonical(snapshot),estimatedCostMicrounits,expiresAt])
      return { id,campaignId,directionId:snapshot.directionId,model:provider.model,prompt:snapshot.prompt,aspectRatio:snapshot.aspectRatio,
        durationSeconds:VEO_OUTPUT.durationSeconds,resolution:VEO_OUTPUT.resolution,estimatedCostMicrounits,expiresAt:expiresAt.toISOString() }
    },
    async submitPlan({ actor,campaignId,planId,idempotencyKey,acceptedCostMicrounits }) {
      authorize(actor)
      if (typeof idempotencyKey !== 'string' || !/^[\x21-\x7e]{1,255}$/.test(idempotencyKey)) fail('invalid_request','An idempotency key is required.',400)
      return withTransaction(pool, async client => {
        const settings = await createSettingsRepository(client).getForUpdate()
        const prior = (await client.query(`${selectVideo} WHERE j.actor_id=$1 AND j.campaign_id=$2 AND j.step='video' AND j.idempotency_key=$3`,[actor.id,campaignId,idempotencyKey])).rows[0]
        const fingerprint = hashCanonical({ planId,acceptedCostMicrounits })
        if (prior) { if (prior.request_fingerprint !== fingerprint) fail('idempotency_conflict','This request key belongs to another video plan.'); return publicJob(prior) }
        const plan = (await client.query('SELECT * FROM video_generation_plans WHERE id=$1 AND actor_id=$2 AND campaign_id=$3 FOR UPDATE',[planId,actor.id,campaignId])).rows[0]
        if (!plan || plan.consumed_by || plan.expires_at <= new Date()) fail('video_plan_expired','Prepare a new video plan before generating.')
        if (acceptedCostMicrounits !== Number(plan.estimated_cost_microunits)) fail('video_consent_required','Accept the exact video estimate before generating.')
        if (settings.generationDisabled) fail('kill_switch_active','Generation is temporarily disabled.',503)
        if (hashCanonical(await source(client,campaignId,plan.input)) !== plan.source_hash) fail('source_changed','The source changed. Prepare a new video plan.')
        const active = await client.query(`SELECT 1 FROM generation_jobs j JOIN video_jobs v ON v.job_id=j.id
          WHERE j.campaign_id=$1 AND v.direction_id=$2 AND j.status IN ('pending','unknown')`,[campaignId,plan.input.directionId])
        if (active.rowCount) fail('video_in_progress','Check the existing video job before generating another.')
        const cap = await client.query("SELECT count(*)::int AS count FROM generation_jobs WHERE campaign_id=$1 AND step='video'",[campaignId])
        if (cap.rows[0].count >= settings.perStepRegenerationLimit) fail('regeneration_cap_reached','The video generation limit has been reached.',429)
        const day = new Date().toISOString().slice(0,10)
        const spent = (await client.query('SELECT COALESCE(sum(COALESCE(actual_cost_microunits,reserved_cost_microunits)),0)::text AS used FROM generation_jobs WHERE budget_day=$1',[day])).rows[0]
        if (BigInt(spent.used)+BigInt(acceptedCostMicrounits)>BigInt(settings.dailyBudgetMicrounits)) fail('over_budget','The daily generation budget would be exceeded.')
        const id = randomUUID()
        await client.query(`INSERT INTO generation_jobs(id,campaign_id,actor_id,step,provider,model,region,status,reserved_cost_microunits,
          idempotency_key,request_fingerprint,owner_token,input_snapshot,timeout_at,budget_day)
          VALUES($1,$2,$3,'video','gemini',$4,'developer-api','pending',$5,$6,$7,$8,$9,clock_timestamp()+interval '30 minutes',$10)`,
        [id,campaignId,actor.id,plan.model,acceptedCostMicrounits,idempotencyKey,fingerprint,randomUUID(),plan.input,day])
        await client.query(`INSERT INTO video_jobs(job_id,direction_id,phase,accepted_cost_microunits,source_hash) VALUES($1,$2,'queued',$3,$4)`,[id,plan.input.directionId,acceptedCostMicrounits,plan.source_hash])
        await client.query('UPDATE video_generation_plans SET consumed_by=$2 WHERE id=$1',[planId,id])
        return publicJob(await read(id,client))
      })
    },
    async get({ actor,jobId }) { authorize(actor,false); return publicJob((await pool.query(`${selectVideo} WHERE j.id=$1 AND EXISTS (SELECT 1 FROM campaigns c WHERE c.id=j.campaign_id AND c.archived_at IS NULL)`,[jobId])).rows[0]) },
    async list({ actor,campaignId }) { authorize(actor,false); if (!(await pool.query('SELECT 1 FROM campaigns WHERE id=$1 AND archived_at IS NULL',[campaignId])).rowCount) fail('not_found','Campaign not found.',404); return (await pool.query(`${selectVideo} WHERE j.campaign_id=$1 ORDER BY j.created_at`,[campaignId])).rows.map(publicJob) },
    async cancel({ actor,jobId }) {
      authorize(actor)
      return withTransaction(pool,async client => {
        const row = (await client.query(`${selectVideo} WHERE j.id=$1 AND EXISTS (SELECT 1 FROM campaigns c WHERE c.id=j.campaign_id AND c.archived_at IS NULL) FOR UPDATE OF j,v`,[jobId])).rows[0]
        if (!row) fail('not_found','Video job not found.',404)
        if (['succeeded','failed','blocked','cancelled'].includes(row.phase)) return publicJob(row)
        // Cancellation stops local tracking, not an already accepted provider operation or charge.
        await finalize(client,row.id,'cancelled','cancelled',null,{},row.phase==='queued')
        return publicJob(await read(row.id,client))
      })
    },
    async runNext() {
      if (busy) return false
      busy = true
      let claimed
      try {
        claimed = await withTransaction(pool,async client => {
          const settings = await createSettingsRepository(client).getForUpdate()
          const expired = (await client.query(`${selectVideo} WHERE v.phase='submitting' AND v.lease_expires_at<clock_timestamp() FOR UPDATE OF j,v SKIP LOCKED LIMIT 1`)).rows[0]
          if (expired) { await finalize(client,expired.id,'unknown','outcome_unknown'); return null }
          const row = (await client.query(`${selectVideo} WHERE v.phase IN ('queued','running','retrieving') AND v.next_poll_at<=clock_timestamp()
            AND (v.lease_expires_at IS NULL OR v.lease_expires_at<clock_timestamp()) ORDER BY j.created_at FOR UPDATE OF j,v SKIP LOCKED LIMIT 1`)).rows[0]
          if (!row) return null
          if (row.timeout_at <= new Date()) { await finalize(client,row.id,'unknown','operation_timeout'); return null }
          if (row.phase==='queued') {
            const user = (await client.query('SELECT disabled,disabled_at,role FROM users WHERE id=$1',[row.actor_id])).rows[0]
            if (settings.generationDisabled || !user || user.disabled || user.disabled_at || !['marketer','admin'].includes(user.role)) {
              await finalize(client,row.id,'failed','dispatch_unavailable',null,{},true); return null
            }
            const dispatchDay = new Date().toISOString().slice(0,10)
            const spent = (await client.query('SELECT COALESCE(sum(COALESCE(actual_cost_microunits,reserved_cost_microunits)),0)::text AS used FROM generation_jobs WHERE budget_day=$1 AND id<>$2',[dispatchDay,row.id])).rows[0]
            if (BigInt(spent.used)+BigInt(row.reserved_cost_microunits)>BigInt(settings.dailyBudgetMicrounits)) {
              await finalize(client,row.id,'failed','over_budget',null,{},true); return null
            }
            await client.query('UPDATE generation_jobs SET budget_day=$2 WHERE id=$1',[row.id,dispatchDay])
            try { if (hashCanonical(await source(client,row.campaign_id,row.input_snapshot))!==row.source_hash) throw new Error('changed') }
            catch { await finalize(client,row.id,'failed','source_changed',null,{},true); return null }
            await client.query("UPDATE generation_jobs SET dispatch_state='dispatched',dispatched_at=clock_timestamp(),attempts=attempts+1 WHERE id=$1",[row.id])
          }
          const token = randomUUID(), phase = row.phase==='queued'?'submitting':row.phase
          await client.query("UPDATE video_jobs SET phase=$2,lease_token=$3,lease_expires_at=clock_timestamp()+interval '3 minutes' WHERE job_id=$1",[row.id,phase,token])
          return {...row,phase,token}
        })
        if (!claimed) return false
        const provider = await getProvider()
        const updateOwned = fn => withTransaction(pool,async client => {
          const row = (await client.query('SELECT v.phase,v.lease_token FROM generation_jobs j JOIN video_jobs v ON v.job_id=j.id WHERE j.id=$1 FOR UPDATE OF j,v',[claimed.id])).rows[0]
          if (row?.lease_token!==claimed.token) return false
          await fn(client); return true
        })
        if (claimed.phase==='submitting') {
          const accepted = await provider.submit({ prompt:claimed.input_snapshot.prompt,aspectRatio:claimed.input_snapshot.aspectRatio })
          const retained = await updateOwned(client => client.query(`UPDATE video_jobs SET phase='running',operation_name=$2,lease_token=NULL,lease_expires_at=NULL,
            next_poll_at=clock_timestamp()+($3*interval '1 millisecond') WHERE job_id=$1`,[claimed.id,accepted.operationName,pollIntervalMs]))
          // A late acceptance is still evidence of a chargeable operation. Keep
          // its identity after cancellation/lease expiry without restarting it.
          if (!retained) await pool.query(`UPDATE video_jobs SET operation_name=$2 WHERE job_id=$1
            AND operation_name IS NULL AND phase IN ('cancelled','unknown')`,[claimed.id,accepted.operationName])
          return true
        }
        const result = await provider.poll(claimed.operation_name)
        if (result.state==='running') {
          await updateOwned(client => client.query(`UPDATE video_jobs SET lease_token=NULL,lease_expires_at=NULL,next_poll_at=clock_timestamp()+($2*interval '1 millisecond') WHERE job_id=$1`,[claimed.id,pollIntervalMs]))
          return true
        }
        if (['failed','blocked'].includes(result.state)) { await updateOwned(client => finalize(client,claimed.id,result.state,result.errorCode)); return true }
        if (result.state!=='retrieving') fail('invalid_output','Invalid video operation output.')
        if (!await updateOwned(client => client.query("UPDATE video_jobs SET phase='retrieving' WHERE job_id=$1",[claimed.id]))) return true
        const bytes = await provider.download(result.downloadUri)
        const portrait = claimed.input_snapshot.aspectRatio==='9:16'
        const decoded = await decodeGeneratedVideo(bytes,{width:portrait?720:1280,height:portrait?1280:720,durationSeconds:4})
        if (!decoded) { await updateOwned(client => finalize(client,claimed.id,'failed','invalid_output')); return true }
        const assetId = randomUUID(), objectKey = `campaigns/${hash(claimed.campaign_id)}/video-jobs/${hash(claimed.id)}/${assetId}.mp4`
        // Durable intent precedes storage, so every uncertain write is recoverable.
        await pool.query("INSERT INTO orphaned_uploads(id,object_key,campaign_id,reason) VALUES($1,$2,$3,'video_persistence_pending')",[randomUUID(),objectKey,claimed.campaign_id])
        await assetStore.put({objectKey,bytes:decoded.bytes,contentType:decoded.mimeType})
        const saved = await assetStore.get({objectKey,maxBytes:decoded.byteSize})
        if (!saved || hash(saved)!==decoded.sha256 || saved.length!==decoded.byteSize) fail('asset_integrity_failure','Video storage verification failed.')
        const {bytes:_bytes,...metadata}=decoded
        const asset={id:assetId,...metadata}
        await updateOwned(async client => {
          await client.query(`INSERT INTO assets(id,campaign_id,kind,object_key,mime_type,byte_size,width,height,sha256,source,generation_job_id)
            VALUES($1,$2,'video',$3,'video/mp4',$4,$5,$6,$7,'generation',$8)`,[assetId,claimed.campaign_id,objectKey,decoded.byteSize,decoded.width,decoded.height,decoded.sha256,claimed.id])
          await client.query("UPDATE video_jobs SET phase='succeeded',asset_id=$2,asset_metadata=$3 WHERE job_id=$1",[claimed.id,assetId,asset])
          await finalize(client,claimed.id,'succeeded',null,{video:asset},{verdict:'safe',categories:[]})
        })
        return true
      } catch (error) {
        if (claimed) await withTransaction(pool,async client => {
          const row=(await client.query('SELECT v.lease_token FROM generation_jobs j JOIN video_jobs v ON v.job_id=j.id WHERE j.id=$1 FOR UPDATE OF j,v',[claimed.id])).rows[0]
          if (row?.lease_token!==claimed.token) return
          const known = new Set(['quota_exhausted','not_connected','video_not_connected','access_denied','invalid_request','model_unavailable'])
          if (claimed.phase==='submitting') await finalize(client,claimed.id,known.has(error.code)?'failed':'unknown',known.has(error.code)?error.code:'outcome_unknown')
          else await client.query(`UPDATE video_jobs SET lease_token=NULL,lease_expires_at=NULL,next_poll_at=clock_timestamp()+interval '30 seconds' WHERE job_id=$1`,[claimed.id])
        })
        return false
      } finally { busy=false }
    },
  }
  return Object.freeze(service)
}
