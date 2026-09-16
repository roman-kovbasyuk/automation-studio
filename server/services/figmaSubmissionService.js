import { createHash,randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { z } from 'zod'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { withTransaction } from '../db/pool.js'
import { createIdempotencyService } from './idempotencyService.js'
import { createReviewRepository } from '../repositories/reviewRepository.js'
import { figmaFail } from './figmaHandoffService.js'

export const figmaUploadSchema=z.object({ frameId:z.string().regex(/^\d+:\d+$/),pngBase64:z.string().min(1).max(36_000_000),
  texts:z.array(z.object({layerId:z.string().min(1).max(256),characters:z.string().max(10000)}).strict()).max(200),
}).strict()
export const figmaFinalizeSchema=z.object({ checklistAnswers:z.object({copyAccuracy:z.literal(true),layoutQuality:z.literal(true),exportReadiness:z.literal(true)}).strict(),
  videoAssetIds:z.array(z.string().min(1).max(256)).max(3),
}).strict()
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
function parse(schema,input){const result=schema.safeParse(input);if(!result.success)figmaFail(400,'invalid_request','Invalid Figma submission');return result.data}
const publicSubmission=row=>({id:row.id,versionId:row.version_id,state:row.state,submissionHash:row.submission_hash,manifest:row.manifest,
  createdAt:new Date(row.created_at).toISOString(),sealedAt:row.sealed_at?new Date(row.sealed_at).toISOString():null})
function assertSameSealedInput(row,body){
  if(hashCanonical(row.manifest.checklistAnswers)!==hashCanonical(body.checklistAnswers)
    ||hashCanonical(row.manifest.videos.map(video=>video.id).sort())!==hashCanonical([...body.videoAssetIds].sort())) {
    figmaFail(409,'figma_submission_changed','This submission was already sealed')
  }
}

export function createFigmaSubmissionService({pool,assetStore,reviewService}) {
  const idempotency=createIdempotencyService({pool})
  async function requireActor(actor,roles=['designer']) {
    if(!actor?.id||actor.disabled||!roles.includes(actor.role))figmaFail(403,'forbidden','A designer must submit reviewed artwork')
    const user=(await pool.query('SELECT role,disabled_at FROM users WHERE id=$1',[actor.id])).rows[0]
    if(!user||user.disabled_at||user.role!==actor.role)figmaFail(403,'forbidden','This user cannot access the workspace')
  }
  async function find(client,id,lock=false){
    const row=(await client.query(`SELECT * FROM figma_submissions WHERE id=$1${lock?' FOR UPDATE':''}`,[id])).rows[0]
    if(!row)figmaFail(404,'not_found','Figma submission was not found')
    return row
  }
  async function current(client,versionId,expectedRevision){
    const repository=createReviewRepository(client),version=await repository.findVersionById(versionId)
    if(!version)figmaFail(404,'not_found','Version was not found')
    const campaign=await repository.lockCampaign(version.campaignId)
    if(campaign.revision!==expectedRevision)figmaFail(409,'revision_conflict','The campaign changed during this submission')
    if(campaign.openVersionId!==versionId||campaign.status!=='in_review')figmaFail(409,'version_not_current','Submit only to the current open review')
    return version
  }
  return {
    async beginSubmission({actor,handoffId,expectedRevision,idempotencyKey}){
      await requireActor(actor)
      if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)figmaFail(400,'invalid_revision','A campaign revision is required')
      return (await idempotency.executeDatabaseCommand({actorId:actor.id,method:'POST',resourceId:`figma-submission:${handoffId}`,key:idempotencyKey,
        payload:{expectedRevision},operation:async client=>{
          const handoff=(await client.query('SELECT * FROM figma_handoffs WHERE id=$1',[handoffId])).rows[0]
          if(!handoff||handoff.state!=='imported')figmaFail(409,'figma_import_required','Import all banners before submitting')
          await current(client,handoff.version_id,expectedRevision)
          const row=(await client.query(`INSERT INTO figma_submissions (id,handoff_id,version_id,actor_id,expected_revision) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [randomUUID(),handoffId,handoff.version_id,actor.id,expectedRevision])).rows[0]
          return {status:201,body:publicSubmission(row)}
        }})).body
    },
    async uploadOutput({actor,submissionId,outputId,input}){
      await requireActor(actor)
      const body=parse(figmaUploadSchema,input),initial=await find(pool,submissionId)
      if(initial.actor_id!==actor.id||initial.state!=='uploading')figmaFail(409,'figma_submission_closed','This submission is not open for uploads')
      const handoff=(await pool.query('SELECT * FROM figma_handoffs WHERE id=$1',[initial.handoff_id])).rows[0]
      const output=handoff.scene_package.outputs.find(o=>o.outputId===outputId),mapping=handoff.mappings.find(m=>m.outputId===outputId)
      if(!output||mapping?.frameId!==body.frameId)figmaFail(409,'figma_output_mismatch','The uploaded frame does not match this handoff')
      const bytes=Buffer.from(body.pngBase64,'base64')
      if(bytes.length>25*1024*1024||bytes.toString('base64')!==body.pngBase64)figmaFail(413,'figma_upload_invalid','Upload a PNG no larger than 25 MB')
      try{
        const image=sharp(bytes,{limitInputPixels:40_000_000}),metadata=await image.metadata()
        if(metadata.format!=='png'||metadata.width!==output.width||metadata.height!==output.height||(metadata.pages??1)!==1)throw new Error('Wrong PNG dimensions')
        await image.stats()
      }catch{figmaFail(422,'figma_png_invalid','The PNG must decode at the exact banner dimensions')}
      const digest=hash(bytes),objectKey=`figma/submissions/${submissionId}/${outputId}/${digest}.png`
      // Content-addressed immutable write, safe to replay after a dropped response.
      const existing=await assetStore.get({objectKey})
      if(existing){if(hash(existing)!==digest)figmaFail(409,'figma_asset_mismatch','Stored submission bytes changed')}
      else await assetStore.put({objectKey,bytes,contentType:'image/png'})
      return withTransaction(pool,async client=>{
        await current(client,initial.version_id,initial.expected_revision)
        const row=await find(client,submissionId,true)
        if(row.state!=='uploading'||row.actor_id!==actor.id)figmaFail(409,'figma_submission_closed','This submission is not open for uploads')
        const entry={outputId,frameId:body.frameId,texts:body.texts,asset:{id:`figma-${submissionId}-${outputId}`,kind:'review_png',objectKey,mimeType:'image/png',
          width:output.width,height:output.height,byteSize:bytes.length,sha256:digest}}
        if(row.outputs[outputId]&&hashCanonical(row.outputs[outputId])!==hashCanonical(entry))figmaFail(409,'figma_output_changed','Start a new submission for changed artwork')
        const outputs={...row.outputs,[outputId]:entry}
        if(Object.values(outputs).reduce((total,o)=>total+o.asset.byteSize,0)>250*1024*1024)figmaFail(413,'figma_submission_too_large','The submission exceeds 250 MB')
        await client.query('UPDATE figma_submissions SET outputs=$2 WHERE id=$1',[submissionId,outputs])
        return {outputId,sha256:digest}
      })
    },
    async finalizeSubmission({actor,submissionId,input}){
      await requireActor(actor)
      const body=parse(figmaFinalizeSchema,input),initial=await find(pool,submissionId)
      if(initial.actor_id!==actor.id)figmaFail(403,'forbidden','Only the submitting designer can finish this submission')
      const sealed=await withTransaction(pool,async client=>{
        // A sealed submission can retry the atomic ready command after a lost response.
        const row=await find(client,submissionId)
        if(row.state==='sealed'){
          assertSameSealedInput(row,body)
          return row
        }
        const version=await current(client,row.version_id,row.expected_revision)
        const locked=await find(client,submissionId,true)
        if(locked.state==='sealed'){
          assertSameSealedInput(locked,body)
          return locked
        }
        const handoff=(await client.query('SELECT * FROM figma_handoffs WHERE id=$1',[row.handoff_id])).rows[0]
        const expected=handoff.scene_package.outputs.map(o=>o.outputId).sort()
        if(hashCanonical(Object.keys(locked.outputs).sort())!==hashCanonical(expected))figmaFail(409,'incomplete_figma_submission','Upload every banner before submitting')
        const videos=(version.snapshot.videos??[]).map(v=>({id:v.id,sha256:v.sha256}))
        if(hashCanonical(videos.map(v=>v.id).sort())!==hashCanonical([...body.videoAssetIds].sort()))figmaFail(409,'figma_video_review_required','Confirm every included source video before submitting')
        const frames=expected.map(id=>{const {objectKey:_key,kind:_kind,...asset}=locked.outputs[id].asset;return {...locked.outputs[id],asset}})
        const manifest={schemaVersion:1,protocol:'figma-v1',submissionId,versionId:row.version_id,sourceHash:handoff.source_hash,packageHash:handoff.package_hash,frames,videos,checklistAnswers:body.checklistAnswers}
        return (await client.query("UPDATE figma_submissions SET state='sealed',manifest=$2,submission_hash=$3,sealed_at=now() WHERE id=$1 RETURNING *",[submissionId,manifest,hashCanonical(manifest)])).rows[0]
      })
      const handoff=(await pool.query('SELECT * FROM figma_handoffs WHERE id=$1',[sealed.handoff_id])).rows[0]
      await reviewService.markReady({actor,versionId:sealed.version_id,expectedRevision:sealed.expected_revision,idempotencyKey:`figma-ready:${submissionId}`,
        input:{figmaUrl:`https://www.figma.com/design/${handoff.file_key}?node-id=${handoff.page_id.replace(':','-')}`,checklistAnswers:body.checklistAnswers},
        figmaSubmission:{id:submissionId,hash:sealed.submission_hash}})
      return {submission:publicSubmission(sealed)}
    },
    async getForVersion({actor,versionId}){
      await requireActor(actor,['marketer','designer','admin'])
      if(!await createReviewRepository(pool).findVersionById(versionId))figmaFail(404,'not_found','Version was not found')
      const row=(await pool.query(`SELECT s.* FROM figma_submissions s JOIN figma_review_bindings b ON b.submission_id=s.id
        JOIN review_events e ON e.id=b.event_id WHERE s.version_id=$1 AND e.event_type='ready'`,[versionId])).rows[0]
      return row?publicSubmission(row):null
    },
    async getOutput({actor,submissionId,outputId}){
      await requireActor(actor,['marketer','designer','admin'])
      const row=await find(pool,submissionId)
      const approvedForReview=await this.getForVersion({actor,versionId:row.version_id})
      const entry=row.outputs[outputId]
      if(approvedForReview?.id!==submissionId||!entry)figmaFail(404,'not_found','Reviewed output was not found')
      const bytes=await assetStore.get({objectKey:entry.asset.objectKey})
      if(!bytes||hash(bytes)!==entry.asset.sha256)figmaFail(502,'figma_asset_mismatch','The returned artwork failed its integrity check')
      return {bytes,mimeType:'image/png'}
    },
  }
}
