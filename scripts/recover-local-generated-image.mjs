import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Pool } from 'pg'
import { hashCanonical } from '../shared/canonicalJson.js'
import { generateImageInputSchema } from '../shared/contracts.js'
import { withDeadlineTransaction } from '../server/db/pool.js'
import { decodeGeneratedImage, prepareGeneratedImage } from '../server/images/imageDecoder.js'
import { createGenerationJobRepository } from '../server/repositories/generationJobRepository.js'
import { createAuditRepository } from '../server/repositories/auditRepository.js'
import { createLocalDemoAssetStore } from '../server/storage/localDemoAssetStore.js'

const hash = value => createHash('sha256').update(value).digest('hex')
function requireState(condition, message) { if (!condition) throw new Error(message) }

// Operator-only repair for the local demo's native-size persistence bug. No
// provider is loaded or called. Dry-run by default; all DB changes are atomic.
export async function recoverLocalGeneratedImage({ pool, assetStore, jobId, operatorId, apply = false }) {
  requireState(process.env.NODE_ENV !== 'production' && !process.env.K_SERVICE, 'Local recovery only')
  let published
  try { return await withDeadlineTransaction(pool, async client => {
    const operator = (await client.query('SELECT role, disabled, disabled_at FROM users WHERE id = $1', [operatorId])).rows[0]
    requireState(operator?.role === 'admin' && !operator.disabled && !operator.disabled_at, 'An active administrator is required')
    const job = (await client.query('SELECT * FROM generation_jobs WHERE id = $1 FOR UPDATE', [jobId])).rows[0]
    requireState(job?.step === 'image' && job.status === 'unknown' && job.dispatch_state === 'dispatched'
      && job.unknown_reason === 'asset_persistence_ambiguous' && !job.result_metadata, 'Job is not eligible for saved-image recovery')
    const input = generateImageInputSchema.parse(job.input_snapshot)
    requireState(job.request_fingerprint === hashCanonical({ step: 'image', input: {
      directionId: input.direction.id, width: input.width, height: input.height,
    } }), 'Image request identity changed')
    const campaign = (await client.query('SELECT status FROM campaigns WHERE id = $1 FOR UPDATE', [job.campaign_id])).rows[0]
    requireState(['draft', 'copy_ready', 'direction_selected', 'composed'].includes(campaign?.status), 'Campaign is no longer editable')
    const direction = (await client.query('SELECT * FROM visual_directions WHERE id = $1 AND campaign_id = $2 FOR UPDATE',
      [input.direction.id, job.campaign_id])).rows[0]
    requireState(direction?.status === 'pending' && !direction.stale && !direction.preview_asset_id
      && direction.prompt === input.direction.prompt, 'Direction changed or already has an image')
    const prefix = `campaigns/${hash(job.campaign_id)}/generation-jobs/${hash(job.id)}/generated/`
    const orphans = (await client.query(`SELECT * FROM orphaned_uploads
      WHERE campaign_id = $1 AND starts_with(object_key, $2) FOR UPDATE`, [job.campaign_id, prefix])).rows
    requireState(orphans.length === 1 && orphans[0].status === 'pending'
      && orphans[0].reason === 'generation_image_persistence_failed', 'One untouched persistence orphan is required')
    const orphan = orphans[0]
    const suffix = orphan.object_key.slice(prefix.length).match(/^([A-Za-z0-9._-]{1,200})\.(png|jpg|webp)$/)
    requireState(suffix, 'Generated object identity is invalid')
    const originalAssetId = suffix[1]
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [orphan.object_key])
    const references = await client.query('SELECT id FROM assets WHERE object_key = $1 OR id = $2', [orphan.object_key, originalAssetId])
    requireState(references.rowCount === 0, 'Saved object is already referenced')
    const metadata = await assetStore.getMetadata({ objectKey: orphan.object_key })
    const bytes = await assetStore.get({ objectKey: orphan.object_key })
    requireState(metadata && bytes && metadata.objectKey === orphan.object_key
      && metadata.byteSize === bytes.length && metadata.sha256 === hash(bytes), 'Saved object integrity check failed')
    requireState(metadata.contentType === ({ png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' })[suffix[2]], 'Saved object format changed')
    const decoded = await decodeGeneratedImage(bytes, metadata.contentType)
    requireState(decoded, 'Saved image cannot be decoded')
    requireState(decoded.width !== input.width || decoded.height !== input.height, `Saved image ${decoded.width}x${decoded.height} does not match native-size failure for ${input.width}x${input.height}`)
    const fitted = await prepareGeneratedImage(bytes, metadata.contentType, input)
    requireState(fitted && fitted.width === input.width && fitted.height === input.height, 'Saved image cannot fit the requested canvas')
    const fittedBytes = Buffer.from(fitted.bytes)
    const fittedHash = hash(fittedBytes)
    const summary = { applied: apply, jobId, width: fitted.width, height: fitted.height, byteSize: fittedBytes.length }

    if (!apply) return summary
    const assetId = randomUUID()
    const objectKey = `${prefix}${assetId}.${suffix[2]}`
    await assetStore.put({ objectKey, bytes: fittedBytes, contentType: fitted.mimeType })
    published = { objectKey, campaignId: job.campaign_id }
    const readback = await assetStore.get({ objectKey })
    requireState(readback && readback.length === fittedBytes.length && hash(readback) === fittedHash, 'Recovered image readback failed')
    await client.query(`INSERT INTO assets
      (id, campaign_id, kind, object_key, mime_type, byte_size, width, height, sha256, source, generation_job_id, version_id)
      VALUES ($1, $2, 'direction', $3, $4, $5, $6, $7, $8, 'generation', $9, NULL)`,
    [assetId, job.campaign_id, objectKey, fitted.mimeType, fittedBytes.length, fitted.width, fitted.height, fittedHash, job.id])
    await client.query("UPDATE visual_directions SET status = 'ready', preview_asset_id = $2 WHERE id = $1", [direction.id, assetId])
    const result = { image: { asset: { id: assetId, kind: 'direction', sha256: fittedHash },
      mimeType: fitted.mimeType, width: fitted.width, height: fitted.height, byteSize: fittedBytes.length } }
    // Lost provider usage/safety metadata stays unknown. The budget query retains
    // the full reservation when actual cost is null; recovery invents no usage.
    await client.query(`UPDATE generation_jobs SET status = 'succeeded', result_metadata = $2,
      error_code = NULL, unknown_reason = NULL, completed_at = clock_timestamp(), updated_at = clock_timestamp()
      WHERE id = $1`, [job.id, result])
    const body = { job: await createGenerationJobRepository(client).findById(job.id) }
    await client.query('UPDATE generation_jobs SET response_status = 201, response_body = $2 WHERE id = $1', [job.id, body])
    // Retain the untouched native source and its orphan record as recovery evidence.
    await client.query("UPDATE orphaned_uploads SET reason = 'generation_image_recovered', last_error = NULL WHERE id = $1", [orphan.id])
    await createAuditRepository(client).append({ id: randomUUID(), actorId: operatorId, actorRole: 'admin',
      action: 'generation.image.recovered', entityType: 'generation_job', entityId: job.id,
      payload: { beforeStatus: 'unknown', afterStatus: 'succeeded', assetId, sha256: fittedHash, originalSha256: metadata.sha256,
        requestedWidth: input.width, requestedHeight: input.height, width: fitted.width, height: fitted.height, originalWidth: decoded.width, originalHeight: decoded.height,
        providerMetadataUnavailable: true } })
    return summary
  }, { timeoutMs: 10_000 })
  } catch (error) {
    // A lost COMMIT acknowledgement may still mean success: never delete bytes here.
    if (published) await pool.query(`INSERT INTO orphaned_uploads (id, object_key, campaign_id, reason)
      SELECT $1, $2, $3, 'generation_image_recovery_ambiguous'
      WHERE NOT EXISTS (SELECT 1 FROM assets WHERE object_key = $2)
      ON CONFLICT (object_key) DO NOTHING`, [randomUUID(), published.objectKey, published.campaignId])
      .catch(() => { error.recoveryTrackingFailed = true })
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [jobId, flag] = process.argv.slice(2)
  requireState(jobId && (!flag || flag === '--apply'), 'Usage: node scripts/recover-local-generated-image.mjs <job-id> [--apply]')
  const pool = new Pool({ connectionString: 'postgresql:///banner_studio_demo' })
  try {
    const assetStore = await createLocalDemoAssetStore({ directory: fileURLToPath(new URL('../.studio-demo-assets', import.meta.url)) })
    console.log(JSON.stringify(await recoverLocalGeneratedImage({ pool, assetStore, jobId,
      operatorId: 'studio-demo-admin', apply: flag === '--apply' })))
  } finally { await pool.end() }
}
