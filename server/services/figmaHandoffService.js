import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { campaignVersionRecordSchema } from '../../shared/contracts.js'
import { figmaPackageSchema } from '../../shared/figmaContracts.js'
import { withTransaction } from '../db/pool.js'
import { createReviewRepository } from '../repositories/reviewRepository.js'
import { createVersionRepository } from '../repositories/versionRepository.js'
import { createFigmaRepository, mapHandoff } from '../repositories/figmaRepository.js'
import { createIdempotencyService } from './idempotencyService.js'
import { buildFigmaPackage } from './figmaPackage.js'

export const createFigmaHandoffSchema=z.object({ fileKey:z.string().regex(/^[a-zA-Z0-9_-]{6,128}$/) }).strict()
const hash=z.string().regex(/^[a-f0-9]{64}$/)
const nodeId=z.string().regex(/^\d+:\d+$/)
export const figmaImportAckSchema=z.object({ fileKey:createFigmaHandoffSchema.shape.fileKey,pageId:nodeId,packageHash:hash,
  mappings:z.array(z.object({ outputId:hash,frameId:nodeId,width:z.number().positive(),height:z.number().positive(),sceneHash:hash,packageHash:hash }).strict()).min(1).max(100),
}).strict()
export function figmaFail(statusCode,code,message) { throw Object.assign(new Error(message),{ statusCode,code,publicMessage:message,expose:true }) }
function parse(schema,input) { const result=schema.safeParse(input); if(!result.success) figmaFail(400,'invalid_request','Invalid Figma request'); return result.data }
function revision(value) { if(!Number.isSafeInteger(value)||value<0) figmaFail(400,'invalid_revision','A valid campaign revision is required') }

export function createFigmaHandoffService({ pool,assetStore,clock=()=>new Date(),leaseMs=120000 }={}) {
  const idempotency=createIdempotencyService({ pool })
  async function requireActor(actor,roles=['marketer','designer','admin']) {
    if(!actor?.id||actor.disabled||!roles.includes(actor.role)) figmaFail(403,'forbidden','This actor cannot perform the Figma operation')
    const user=(await pool.query('SELECT role, disabled_at FROM users WHERE id=$1',[actor.id])).rows[0]
    if(!user||user.disabled_at||user.role!==actor.role) figmaFail(403,'forbidden','This user cannot access the workspace')
  }
  async function current(client,versionId,expectedRevision) {
    const repository=createReviewRepository(client)
    const raw=await repository.findVersionById(versionId)
    if(!raw) figmaFail(404,'not_found','Version was not found')
    const version=campaignVersionRecordSchema.parse(raw)
    const campaign=await repository.lockCampaign(version.campaignId)
    if(expectedRevision!=null && campaign.revision!==expectedRevision) figmaFail(409,'revision_conflict','The campaign changed since it was loaded')
    if(campaign.openVersionId!==version.id||campaign.currentVersionNumber!==version.versionNumber||campaign.status!=='in_review') {
      figmaFail(409,'version_not_current','Figma import requires the current open review version')
    }
    return { version,campaign }
  }
  async function rowForRead(handoffId) {
    const row=await createFigmaRepository(pool).findById(handoffId)
    if(!row||!await createReviewRepository(pool).findVersionById(row.version_id)) figmaFail(404,'not_found','Figma handoff was not found')
    return row
  }
  return {
    async createHandoff({ actor,versionId,expectedRevision,idempotencyKey,input }) {
      await requireActor(actor,['marketer','admin']); revision(expectedRevision)
      const { fileKey }=parse(createFigmaHandoffSchema,input)
      // Read/compile outside the write transaction; source versions are immutable.
      const raw=await createReviewRepository(pool).findVersionById(versionId)
      if(!raw) figmaFail(404,'not_found','Version was not found')
      const version=campaignVersionRecordSchema.parse(raw)
      const existing=await createFigmaRepository(pool).findByVersion(versionId)
      let pkg=existing?.scene_package
      if(!pkg) {
        const title=(await pool.query('SELECT title FROM campaigns WHERE id=$1',[version.campaignId])).rows[0]?.title
        pkg=await buildFigmaPackage({ version,campaignTitle:title,readAsset:async id=>{
          const asset=await createVersionRepository(pool).findAsset(version.campaignId,id)
          if(!asset) return null
          return { bytes:await assetStore.get({ objectKey:asset.objectKey }),mimeType:asset.mimeType }
        } })
      }
      return idempotency.executeDatabaseCommand({ actorId:actor.id,method:'POST',resourceId:`figma:${versionId}`,key:idempotencyKey,
        payload:{ fileKey,expectedRevision },operation:async client=>{
          const { version,campaign }=await current(client,versionId,expectedRevision)
          const repository=createFigmaRepository(client)
          const prior=await repository.findByVersion(versionId)
          if(prior) {
            if(prior.file_key!==fileKey) figmaFail(409,'figma_destination_conflict','This version already has a different Figma destination')
            return { status:200,body:{ handoff:mapHandoff(prior) } }
          }
          const row=await repository.insert({ id:randomUUID(),version,campaign,actor,fileKey,pkg })
          return { status:202,body:{ handoff:mapHandoff(row) } }
        },
      })
    },
    async listHandoffs({ actor }) {
      await requireActor(actor)
      const rows=(await pool.query(`SELECT h.*,c.title AS project_name,c.revision,v.snapshot FROM figma_handoffs h JOIN campaigns c ON c.id=h.campaign_id JOIN campaign_versions v ON v.id=h.version_id
        WHERE c.archived_at IS NULL AND c.open_version_id=h.version_id AND c.status='in_review'
        ORDER BY h.created_at DESC LIMIT 100`)).rows
      return rows.map(row=>({...mapHandoff(row),projectName:row.project_name,revision:row.revision,videos:(row.snapshot.videos??[]).map(v=>({id:v.id}))}))
    },
    async getHandoff({ actor,versionId }) {
      await requireActor(actor)
      if(!await createReviewRepository(pool).findVersionById(versionId)) figmaFail(404,'not_found','Version was not found')
      return mapHandoff(await createFigmaRepository(pool).findByVersion(versionId))
    },
    async getPackage({ actor,handoffId }) {
      await requireActor(actor)
      return figmaPackageSchema.parse((await rowForRead(handoffId)).scene_package)
    },
    async claimHandoff({ actor,handoffId,workerId }) {
      await requireActor(actor)
      parse(z.string().min(1).max(128),workerId)
      const initial=await rowForRead(handoffId)
      return withTransaction(pool,async client=>{
        await current(client,initial.version_id)
        const row=await createFigmaRepository(client).findById(handoffId,{ lock:true })
        if(row.state==='imported') return mapHandoff(row)
        if(!['queued','importing','import_failed'].includes(row.state)) figmaFail(409,'figma_handoff_closed','This handoff is closed')
        const now=clock()
        if(row.lease_expires_at && new Date(row.lease_expires_at)>now && (row.lease_worker_id!==workerId||row.lease_actor_id!==actor.id)) {
          figmaFail(409,'figma_import_busy','Another plugin session is importing these banners')
        }
        const same=row.lease_worker_id===workerId && row.lease_actor_id===actor.id && new Date(row.lease_expires_at)>now
        const updated=(await client.query(`UPDATE figma_handoffs SET state='importing',lease_actor_id=$2,lease_worker_id=$3,
          lease_generation=lease_generation+$4,lease_expires_at=$5,updated_at=$6 WHERE id=$1 RETURNING *`,
          [handoffId,actor.id,workerId,same?0:1,new Date(now.getTime()+leaseMs),now])).rows[0]
        return mapHandoff(updated)
      })
    },
    async failImport({actor,handoffId,workerId,leaseGeneration}) {
      await requireActor(actor)
      const initial=await rowForRead(handoffId)
      return withTransaction(pool,async client=>{
        await current(client,initial.version_id)
        const row=await createFigmaRepository(client).findById(handoffId,{lock:true})
        if(row.state!=='importing'||row.lease_actor_id!==actor.id||row.lease_worker_id!==workerId||row.lease_generation!==leaseGeneration||new Date(row.lease_expires_at)<=clock()) {
          figmaFail(409,'stale_figma_lease','Only the current importer can report a failed import')
        }
        const result=await client.query("UPDATE figma_handoffs SET state='import_failed',lease_expires_at=$2,updated_at=$2 WHERE id=$1 RETURNING *",[handoffId,clock()])
        return mapHandoff(result.rows[0])
      })
    },
    async acknowledgeImport({ actor,handoffId,workerId,leaseGeneration,input }) {
      await requireActor(actor)
      const ack=parse(figmaImportAckSchema,input)
      const initial=await rowForRead(handoffId)
      return withTransaction(pool,async client=>{
        await current(client,initial.version_id)
        const row=await createFigmaRepository(client).findById(handoffId,{ lock:true })
        if(row.state==='imported') {
          if(row.page_id!==ack.pageId||row.file_key!==ack.fileKey||row.package_hash!==ack.packageHash||hashCanonical(row.mappings)!==hashCanonical(ack.mappings)) {
            figmaFail(409,'figma_import_changed','This import was already confirmed with different mappings')
          }
          return mapHandoff(row)
        }
        if(row.state!=='importing'||row.lease_actor_id!==actor.id||row.lease_worker_id!==workerId||row.lease_generation!==leaseGeneration||new Date(row.lease_expires_at)<=clock()) {
          figmaFail(409,'stale_figma_lease','The import lease expired or belongs to another session')
        }
        const outputs=row.scene_package.outputs
        const matches=ack.fileKey===row.file_key&&ack.packageHash===row.package_hash&&ack.mappings.length===outputs.length
          &&new Set(ack.mappings.map(m=>m.frameId)).size===outputs.length&&new Set(ack.mappings.map(m=>m.outputId)).size===outputs.length
          &&outputs.every(o=>ack.mappings.some(m=>m.outputId===o.outputId&&m.width===o.width&&m.height===o.height&&m.sceneHash===hashCanonical(o.scene)&&m.packageHash===row.package_hash))
        if(!matches) figmaFail(409,'incomplete_figma_import','Every expected banner must be imported into the configured file before confirmation')
        const updated=(await client.query(`UPDATE figma_handoffs SET state='imported',page_id=$2,mappings=$3,imported_at=$4,updated_at=$4 WHERE id=$1 RETURNING *`,
          [handoffId,ack.pageId,JSON.stringify(ack.mappings),clock()])).rows[0]
        return mapHandoff(updated)
      })
    },
  }
}
