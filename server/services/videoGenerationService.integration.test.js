// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { expect, test, vi } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runMigrations } from '../db/migrate.js'
import { createCampaignRepository } from '../repositories/campaignRepository.js'
import { createGenerationControlPlane } from '../repositories/generationJobRepository.js'
import { createGenerationService } from './generationService.js'
import { createMockProvider } from '../providers/mockProvider.js'
import { createMemoryAssetStore } from '../storage/memoryAssetStore.js'
import { createVideoGenerationService } from './videoGenerationService.js'
import { createWorkspaceService } from './workspaceService.js'
import { createAssetService } from './assetService.js'
import { createVersionService } from './versionService.js'
import { createReviewService } from './reviewService.js'
import { createDeliveryService } from './deliveryService.js'
import { createTemplateRepository } from '../repositories/templateRepository.js'
import { pilotTemplateFixture } from '../../shared/fixtures/pilotTemplate.js'
import { hashCanonical } from '../../shared/canonicalJson.js'

async function setup() {
  const schema = `video_test_${randomUUID().replaceAll('-', '')}`
  const connectionString = process.env.TEST_DATABASE_URL ?? 'postgresql:///banner_studio_test'
  const maintenance = new Pool({ connectionString })
  await maintenance.query(`CREATE SCHEMA ${schema}`)
  const pool = new Pool({ connectionString, options: `-c search_path=${schema}` })
  await runMigrations({ pool })
  await pool.query('UPDATE settings SET daily_budget_microunits=10000000, per_step_regeneration_limit=20')
  const actor = { id: 'video-user', role: 'marketer' }
  await pool.query("INSERT INTO users(id,email,role,display_name) VALUES($1,'video@example.test','marketer','Video')", [actor.id])
  await createCampaignRepository(pool).create({ id: 'video-campaign', title: 'Video fixture', createdBy: actor.id,
    brief: { product: 'Bottle', audience: 'Hikers', objective: 'Shop', offer: '', locale: 'en', notes: '' } })
  const assetStore = createMemoryAssetStore()
  const generation = createGenerationService({ pool, assetStore, controlPlane: createGenerationControlPlane({ pool }), providers: { mock: createMockProvider() } })
  await generation.analyseBrief({ actor, campaignId: 'video-campaign', input: {}, idempotencyKey: 'brief' })
  await generation.generateCopy({ actor, campaignId: 'video-campaign', input: {}, idempotencyKey: 'copy' })
  const directions = await generation.generateDirections({ actor, campaignId: 'video-campaign', input: { mode: 'campaign' }, idempotencyKey: 'directions' })
  const directionId = directions.body.job.result.directions[0].id
  const provider = { model: 'veo-3.1-lite-generate-preview', check: vi.fn(async () => ({ available: true })),
    submit: vi.fn(async () => ({ operationName: 'models/veo-3.1-lite-generate-preview/operations/test-video' })),
    poll: vi.fn(async operationName => ({ state: 'retrieving', operationName, downloadUri: 'https://generativelanguage.googleapis.com/file' })),
    download: vi.fn() }
  const makeService = () => createVideoGenerationService({ pool, assetStore, providerFactory: () => provider, pollIntervalMs: 1 })
  const service = makeService()
  const request = { actor, campaignId: 'video-campaign', input: { directionId, aspectRatio: '16:9' } }
  return { pool, actor, provider, service, makeService, request, assetStore, generation,
    cleanup: async () => { await pool.end(); await maintenance.query(`DROP SCHEMA ${schema} CASCADE`); await maintenance.end() } }
}

test('video plan requires explicit acceptance and survives worker restart without resubmission', async () => {
  const h = await setup(); let dir
  try {
    const plan = await h.service.plan(h.request)
    expect(plan).toMatchObject({ model: h.provider.model, durationSeconds: 4, resolution: '720p', estimatedCostMicrounits: 200000 })
    expect(h.provider.submit).not.toHaveBeenCalled()
    await expect(h.service.submitPlan({ actor: h.actor, campaignId: h.request.campaignId, planId: plan.id,
      idempotencyKey: 'video', acceptedCostMicrounits: 0 })).rejects.toMatchObject({ code: 'video_consent_required' })
    const command = { actor: h.actor, campaignId: h.request.campaignId, planId: plan.id, idempotencyKey: 'video', acceptedCostMicrounits: 200000 }
    const [first, replay] = await Promise.all([h.service.submitPlan(command), h.service.submitPlan(command)])
    expect(first.id).toBe(replay.id)
    expect(first.phase).toBe('queued')
    await h.service.runNext()
    expect((await h.service.get({ actor: h.actor, jobId: first.id })).phase).toBe('running')
    expect(h.provider.submit).toHaveBeenCalledTimes(1)
    dir = await mkdtemp(join(tmpdir(), 'video-service-test-'))
    execFileSync('ffmpeg', ['-nostdin','-v','error','-f','lavfi','-i','color=c=teal:s=1280x720:r=24','-t','4',
      '-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',join(dir,'video.mp4')], { timeout: 15000 })
    h.provider.download.mockResolvedValue(await readFile(join(dir, 'video.mp4')))
    await h.pool.query("UPDATE video_jobs SET next_poll_at=now() WHERE job_id=$1", [first.id])
    await h.makeService().runNext()
    const finished = await h.service.get({ actor: h.actor, jobId: first.id })
    expect(finished).toMatchObject({ phase: 'succeeded', asset: { mimeType: 'video/mp4', width: 1280, height: 720, durationSeconds: 4 } })
    expect(h.provider.submit).toHaveBeenCalledTimes(1)
    expect(h.provider.poll).toHaveBeenCalledTimes(1)
    const workspace = await createWorkspaceService({ pool: h.pool }).getWorkspace({ actor: h.actor, campaignId: h.request.campaignId })
    expect(workspace.jobs.find(job => job.id === first.id)).toMatchObject({ step: 'video', status: 'succeeded', actualCostMicrounits: null })
    const asset = await createAssetService({ pool: h.pool, assetStore: h.assetStore }).readAsset({ actor: h.actor, assetId: finished.asset.id })
    expect(asset.bytes).toEqual(await readFile(join(dir, 'video.mp4')))
    expect(JSON.stringify(finished)).not.toContain('operationName')
  } finally { if (dir) await rm(dir, { recursive: true, force: true }); await h.cleanup() }
})

test('expired submitting lease becomes unknown and cannot trigger replacement generation', async () => {
  const h = await setup()
  try {
    const plan = await h.service.plan(h.request)
    const job = await h.service.submitPlan({ actor: h.actor, campaignId: h.request.campaignId, planId: plan.id,
      idempotencyKey: 'video', acceptedCostMicrounits: 200000 })
    await h.pool.query("UPDATE video_jobs SET phase='submitting', lease_expires_at=now()-interval '1 second' WHERE job_id=$1", [job.id])
    await h.service.runNext()
    expect(await h.service.get({ actor: h.actor, jobId: job.id })).toMatchObject({ phase: 'unknown' })
    await h.service.runNext()
    expect(h.provider.submit).not.toHaveBeenCalled()
    const second = await h.service.plan(h.request)
    await expect(h.service.submitPlan({ actor: h.actor, campaignId: h.request.campaignId, planId: second.id,
      idempotencyKey: 'another', acceptedCostMicrounits: 200000 })).rejects.toMatchObject({ code: 'video_in_progress' })
  } finally { await h.cleanup() }
})

test('changed source, missing consent, budget and role checks stop video before submission', async () => {
  const h = await setup()
  try {
    await expect(h.service.plan({ ...h.request, actor: { ...h.actor, role: 'designer' } })).rejects.toMatchObject({ code: 'forbidden' })
    const plan = await h.service.plan(h.request)
    const command = { actor: h.actor, campaignId: h.request.campaignId, planId: plan.id, idempotencyKey: 'video', acceptedCostMicrounits: 200000 }
    await h.pool.query('UPDATE settings SET daily_budget_microunits=1')
    await expect(h.service.submitPlan(command)).rejects.toMatchObject({ code: 'over_budget' })
    await h.pool.query('UPDATE settings SET daily_budget_microunits=10000000')
    await h.pool.query("UPDATE visual_directions SET prompt='changed' WHERE id=$1", [h.request.input.directionId])
    await expect(h.service.submitPlan(command)).rejects.toMatchObject({ code: 'source_changed' })
    expect(h.provider.submit).not.toHaveBeenCalled()
  } finally { await h.cleanup() }
})

async function queue(h, key = 'video') {
  const plan = await h.service.plan(h.request)
  return h.service.submitPlan({ actor: h.actor, campaignId: h.request.campaignId, planId: plan.id,
    idempotencyKey: key, acceptedCostMicrounits: 200000 })
}

test('archived campaigns hide video records and prevent further local commands', async () => {
  const h = await setup()
  try {
    const job = await queue(h)
    await h.pool.query('UPDATE campaigns SET archived_at=now() WHERE id=$1', [h.request.campaignId])
    expect(await h.service.get({ actor: h.actor, jobId: job.id })).toBeNull()
    await expect(h.service.list({ actor: h.actor, campaignId: h.request.campaignId })).rejects.toMatchObject({ code: 'not_found' })
    await expect(h.service.cancel({ actor: h.actor, jobId: job.id })).rejects.toMatchObject({ code: 'not_found' })
    await h.service.runNext()
    expect(h.provider.submit).not.toHaveBeenCalled()
  } finally { await h.cleanup() }
})

test('a queued video crossing the UTC budget day must reserve on its dispatch day', async () => {
  const h = await setup()
  try {
    const job = await queue(h)
    await h.pool.query("UPDATE generation_jobs SET budget_day=current_date-1 WHERE id=$1", [job.id])
    await h.pool.query('UPDATE settings SET daily_budget_microunits=1')
    await h.service.runNext()
    expect(await h.service.get({ actor: h.actor, jobId: job.id })).toMatchObject({ phase: 'failed', errorCode: 'over_budget' })
    expect(h.provider.submit).not.toHaveBeenCalled()
    expect((await h.pool.query('SELECT actual_cost_microunits FROM generation_jobs WHERE id=$1', [job.id])).rows[0].actual_cost_microunits).toBe('0')
  } finally { await h.cleanup() }
})

test('download failure resumes the saved operation without a second video submission', async () => {
  const h = await setup()
  try {
    const job = await queue(h)
    await h.service.runNext()
    h.provider.download.mockRejectedValueOnce(new Error('temporary network failure'))
    await h.pool.query('UPDATE video_jobs SET next_poll_at=now() WHERE job_id=$1', [job.id])
    await h.makeService().runNext()
    expect(await h.service.get({ actor: h.actor, jobId: job.id })).toMatchObject({ phase: 'retrieving' })
    h.provider.poll.mockResolvedValue({ state: 'blocked', errorCode: 'provider_blocked' })
    await h.pool.query('UPDATE video_jobs SET next_poll_at=now() WHERE job_id=$1', [job.id])
    await h.makeService().runNext()
    expect(await h.service.get({ actor: h.actor, jobId: job.id })).toMatchObject({ phase: 'blocked' })
    expect(h.provider.submit).toHaveBeenCalledTimes(1)
    expect(h.provider.poll).toHaveBeenCalledTimes(2)
  } finally { await h.cleanup() }
})

test('concurrent workers submit once and cancellation cannot publish an in-flight result', async () => {
  const h = await setup()
  try {
    const job = await queue(h)
    let accept, entered
    const started = new Promise(resolve => { entered = resolve })
    h.provider.submit.mockImplementation(() => { entered(); return new Promise(resolve => { accept = resolve }) })
    const running = h.service.runNext()
    await started
    await h.makeService().runNext()
    await h.service.cancel({ actor: h.actor, jobId: job.id })
    accept({ operationName: 'models/veo-3.1-lite-generate-preview/operations/test-video' })
    await running
    expect(await h.service.get({ actor: h.actor, jobId: job.id })).toMatchObject({ phase: 'cancelled' })
    expect(h.provider.submit).toHaveBeenCalledTimes(1)
    expect((await h.pool.query('SELECT operation_name FROM video_jobs WHERE job_id=$1', [job.id])).rows[0].operation_name).toBe('models/veo-3.1-lite-generate-preview/operations/test-video')
    expect((await h.pool.query('SELECT actual_cost_microunits FROM generation_jobs WHERE id=$1', [job.id])).rows[0].actual_cost_microunits).toBeNull()
    expect((await h.pool.query("SELECT count(*)::int AS count FROM assets WHERE kind='video'")).rows[0].count).toBe(0)
  } finally { await h.cleanup() }
})


test('review freezes selected video and delivery preserves its exact MP4 bytes', async () => {
  const h = await setup(); let dir
  try {
    const campaignId = h.request.campaignId
    const copied = (await h.pool.query('SELECT candidates FROM copy_sets WHERE campaign_id=$1', [campaignId])).rows[0].candidates[0]
    let campaign = await createCampaignRepository(h.pool).findById(campaignId)
    campaign = await h.generation.selectCopy({ actor: h.actor, campaignId, expectedRevision: campaign.revision, input: { copyId: copied.id } })
    const image = await h.generation.generateImage({ actor: h.actor, campaignId, idempotencyKey: 'image', input: { directionId: h.request.input.directionId, width: 1080, height: 1080 } })
    expect(image.body.job.status).toBe('succeeded')
    campaign = await createCampaignRepository(h.pool).findById(campaignId)
    campaign = await h.generation.selectDirection({ actor: h.actor, campaignId, expectedRevision: campaign.revision, input: { directionId: h.request.input.directionId } })
    const queued = await queue(h)
    await h.service.runNext()
    dir = await mkdtemp(join(tmpdir(), 'video-review-test-'))
    execFileSync('ffmpeg', ['-nostdin','-v','error','-f','lavfi','-i','color=c=teal:s=1280x720:r=24','-t','4','-c:v','libx264','-pix_fmt','yuv420p',join(dir,'video.mp4')], { timeout: 15000 })
    const videoBytes = await readFile(join(dir,'video.mp4'))
    h.provider.download.mockResolvedValue(videoBytes)
    await h.pool.query('UPDATE video_jobs SET next_poll_at=now() WHERE job_id=$1', [queued.id])
    await h.service.runNext()
    const video = (await h.service.get({ actor: h.actor, jobId: queued.id })).asset
    await createTemplateRepository(h.pool).createVersion({ id: pilotTemplateFixture.id, version: pilotTemplateFixture.version,
      name: pilotTemplateFixture.name, manifest: pilotTemplateFixture, manifestHash: hashCanonical(pilotTemplateFixture), createdBy: h.actor.id })
    const versions = createVersionService({ pool: h.pool, assetStore: h.assetStore })
    const saved = await versions.saveComposition({ actor: h.actor, campaignId, expectedRevision: campaign.revision, input: {
      templateId: pilotTemplateFixture.id, templateVersion: pilotTemplateFixture.version, ratioIds: ['square'],
      slotValues: { headline: copied.headline, body: copied.body, cta: copied.cta, image: image.body.job.result.image.asset.id },
    } })
    const reviewInput = { actor: h.actor, campaignId, expectedRevision: saved.campaign.revision,
      input: { videoAssetIds: [video.id] } }
    await expect(versions.createVersion({ ...reviewInput, idempotencyKey: 'missing-video', input: { videoAssetIds: ['unrelated-video'] } })).rejects.toMatchObject({ code: 'video_source_invalid' })
    await h.pool.query("UPDATE generation_jobs SET safety='{}'::jsonb WHERE id=$1", [queued.id])
    await expect(versions.createVersion({ ...reviewInput, idempotencyKey: 'unsafe-video' })).rejects.toMatchObject({ code: 'video_source_invalid' })
    await h.pool.query(`UPDATE generation_jobs SET safety='{"verdict":"safe","categories":[]}'::jsonb WHERE id=$1`, [queued.id])
    const videoObject = (await h.pool.query('SELECT object_key FROM assets WHERE id=$1', [video.id])).rows[0].object_key
    const corrupted = createVersionService({ pool: h.pool, assetStore: { ...h.assetStore, get: async input => {
      const bytes = await h.assetStore.get(input)
      if (input.objectKey !== videoObject) return bytes
      const changed = Buffer.from(bytes); changed[changed.length-1] ^= 1; return changed
    } } })
    await expect(corrupted.createVersion({ ...reviewInput, idempotencyKey: 'corrupt-video' })).rejects.toMatchObject({ code: 'video_integrity_failure' })
    const created = await versions.createVersion({ actor: h.actor, campaignId, expectedRevision: saved.campaign.revision,
      idempotencyKey: 'review-with-video', input: { videoAssetIds: [video.id] } })
    expect(created.body.version.snapshot.videos).toEqual([expect.objectContaining({ id: video.id, sha256: video.sha256, durationSeconds: 4 })])
    await expect(h.pool.query("UPDATE assets SET sha256=$2 WHERE id=$1", [video.id, '0'.repeat(64)])).rejects.toBeDefined()
    const reviews = createReviewService({ pool: h.pool })
    await h.pool.query("INSERT INTO users(id,email,role,display_name) VALUES('review-designer','designer@example.test','designer','Designer')")
    const ready = await reviews.markReady({ actor: { id: 'review-designer', role: 'designer' }, versionId: created.body.version.id,
      expectedRevision: created.body.campaign.revision, idempotencyKey: 'ready', input: { figmaUrl: 'https://figma.com/design/test/review',
        checklistAnswers: { copyAccuracy: true, layoutQuality: true, exportReadiness: true } } })
    const approved = await reviews.approve({ actor: h.actor, versionId: created.body.version.id,
      expectedRevision: ready.body.campaign.revision, idempotencyKey: 'approve', input: {} })
    expect(approved.body.campaign.status).toBe('approved')
    await h.pool.query("UPDATE generation_jobs SET result_metadata=jsonb_set(result_metadata,'{video,width}','1'::jsonb) WHERE id=$1", [queued.id])
    const delivered = await createDeliveryService({ pool: h.pool, assetStore: h.assetStore }).createDelivery({ actor: h.actor,
      versionId: created.body.version.id, idempotencyKey: 'deliver', input: {} })
    expect(delivered.body.campaign.status).toBe('delivered')
    const archive = await createAssetService({ pool: h.pool, assetStore: h.assetStore }).readAsset({ actor: h.actor, assetId: delivered.body.delivery.asset.id })
    const chunks=[]; for await (const chunk of archive.stream) chunks.push(chunk)
    const { writeFile }=await import('node:fs/promises')
    await writeFile(join(dir,'delivery.zip'),Buffer.concat(chunks))
    const exported = execFileSync('unzip',['-p',join(dir,'delivery.zip'),'videos/video-001.mp4'],{maxBuffer:16*1024*1024})
    expect(exported).toEqual(videoBytes)
    const manifest=JSON.parse(execFileSync('unzip',['-p',join(dir,'delivery.zip'),'delivery-manifest.json'],{encoding:'utf8'}))
    expect(manifest.files.find(file=>file.mimeType==='video/mp4')).toMatchObject({ sha256:video.sha256,width:1280,height:720,durationSeconds:4,hasAudio:false })
    expect(h.provider.submit).toHaveBeenCalledTimes(1)
  } finally { if (dir) await rm(dir,{recursive:true,force:true}); await h.cleanup() }
})
