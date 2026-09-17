import { inflateRawSync } from 'node:zlib'
import { createDeliveryService } from './deliveryService.js'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { createFigmaSubmissionService } from './figmaSubmissionService.js'
import { createReviewService } from './reviewService.js'
// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { expect, test } from 'vitest'
import { runMigrations } from '../db/migrate.js'
import { createCampaignRepository } from '../repositories/campaignRepository.js'
import { createTemplateRepository } from '../repositories/templateRepository.js'
import { createGenerationControlPlane } from '../repositories/generationJobRepository.js'
import { createGenerationService } from './generationService.js'
import { createVersionService } from './versionService.js'
import { createWorkspaceService } from './workspaceService.js'
import { createFigmaHandoffService } from './figmaHandoffService.js'
import { createMockProvider } from '../providers/mockProvider.js'
import { createMemoryAssetStore } from '../storage/memoryAssetStore.js'
import { studioTemplates } from '../../shared/studioTemplates.js'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { briefWithBriefing, confirmBriefing } from '../testing/briefingFixtures.js'

test('durable handoff is idempotent, fenced and only imported after exact acknowledgement', async () => {
  const schema=`figma_flow_${randomUUID().replaceAll('-','')}`
  const connectionString=process.env.TEST_DATABASE_URL ?? 'postgresql:///banner_studio_test'
  const maintenance=new Pool({ connectionString })
  await maintenance.query(`CREATE SCHEMA ${schema}`)
  const pool=new Pool({ connectionString,options:`-c search_path=${schema}` })
  try {
    await runMigrations({ pool })
    await pool.query('UPDATE settings SET daily_budget_microunits=10000000, per_step_regeneration_limit=100')
    await pool.query("INSERT INTO users (id,email,role,display_name) VALUES ('marketer','marketer@figma.test','marketer','Marketer'), ('designer','designer@figma.test','designer','Designer')")
    const actor={ id:'marketer',role:'marketer' }, designer={ id:'designer',role:'designer' }
    const common={ actor,campaignId:'campaign' }
    const brief=briefWithBriefing({ product:'Headphones',audience:'Commuters',objective:'Shop',offer:'20% off until Sunday',locale:'en',notes:'' })
    await createCampaignRepository(pool).create({ id:'campaign',title:'Launch',createdBy:actor.id,brief })
    for(const manifest of studioTemplates) await createTemplateRepository(pool).createVersion({ ...manifest,manifest,manifestHash:hashCanonical(manifest),createdBy:actor.id })
    const assetStore=createMemoryAssetStore()
    const generation=createGenerationService({ pool,assetStore,controlPlane:createGenerationControlPlane({ pool }),providers:{ mock:createMockProvider() } })
    const versions=createVersionService({ pool,assetStore })
    const read=()=>createWorkspaceService({ pool }).getWorkspace(common)
    await generation.analyseBrief({ ...common,input:{},idempotencyKey:'brief' })
    await confirmBriefing({ pool,...common })
    await generation.generateCopy({ ...common,input:{},idempotencyKey:'copy' })
    const set=(await read()).copies[0],copy=set.candidates[1]
    await generation.approveCopy({ ...common,expectedRevision:(await read()).campaign.revision,input:{ copyId:copy.id } })
    await generation.generateDirections({ ...common,idempotencyKey:'directions',input:{ mode:'selected_copy',copyIds:[copy.id] } })
    const direction=(await read()).directions[0]
    await generation.generateImage({ ...common,idempotencyKey:'image',input:{ directionId:direction.id,width:1000,height:1000 } })
    await generation.selectDirection({ ...common,expectedRevision:(await read()).campaign.revision,input:{ directionId:direction.id } })
    const saved=await versions.saveBannerBatch({ ...common,expectedRevision:(await read()).campaign.revision,input:{
      designs:studioTemplates.slice(0,3).map(t=>({ templateId:t.id,templateVersion:t.version,copySetId:set.id,copyId:copy.id,directionId:direction.id })),ratioIds:['square','landscape'],
    } })
    const created=await versions.createVersion({ ...common,expectedRevision:saved.campaign.revision,idempotencyKey:'version',input:{} })
    const versionId=created.body.version.id,expectedRevision=created.body.campaign.revision
    let now=Date.now()
    const service=createFigmaHandoffService({ pool,assetStore,clock:()=>new Date(now),leaseMs:1000 })
    const command={ actor,versionId,expectedRevision,idempotencyKey:'handoff',input:{ fileKey:'TestFileKey123' } }
    const [first,replay]=await Promise.all([service.createHandoff(command),service.createHandoff(command)])
    expect(first.body.handoff.id).toBe(replay.body.handoff.id)
    const handoffId=first.body.handoff.id
    expect(first.body.handoff.state).toBe('queued')
    const pkg=await service.getPackage({ actor,handoffId })
    expect(pkg.outputs).toHaveLength(6)
    await expect(service.createHandoff({ ...command,actor:designer,idempotencyKey:'bad-role' })).rejects.toMatchObject({ code:'forbidden' })
    const firstLease=await service.claimHandoff({ actor:designer,handoffId,workerId:'worker-1' })
    await expect(service.claimHandoff({ actor:designer,handoffId,workerId:'worker-2' })).rejects.toMatchObject({ code:'figma_import_busy' })
    const mappings=pkg.outputs.map((o,i)=>({ outputId:o.outputId,frameId:`12:${i+1}`,width:o.width,height:o.height,sceneHash:hashCanonical(o.scene),packageHash:pkg.packageHash }))
    const ack={ actor:designer,handoffId,workerId:'worker-1',leaseGeneration:firstLease.leaseGeneration,
      input:{ fileKey:'TestFileKey123',pageId:'12:0',packageHash:pkg.packageHash,mappings } }
    await expect(service.acknowledgeImport({ ...ack,input:{ ...ack.input,mappings:mappings.slice(1) } })).rejects.toMatchObject({ code:'incomplete_figma_import' })
    expect((await service.getHandoff({ actor,versionId })).state).toBe('importing')
    now+=2000
    const secondLease=await service.claimHandoff({ actor:designer,handoffId,workerId:'worker-2' })
    await expect(service.acknowledgeImport(ack)).rejects.toMatchObject({ code:'stale_figma_lease' })
    await expect(service.failImport({...ack})).rejects.toMatchObject({code:'stale_figma_lease'})
    expect((await service.failImport({actor:designer,handoffId,workerId:'worker-2',leaseGeneration:secondLease.leaseGeneration})).state).toBe('import_failed')
    const resumedLease=await service.claimHandoff({actor:designer,handoffId,workerId:'worker-2'})
    const finalAck={ ...ack,workerId:'worker-2',leaseGeneration:resumedLease.leaseGeneration }
    expect((await service.acknowledgeImport(finalAck)).state).toBe('imported')
    expect((await service.acknowledgeImport(finalAck)).state).toBe('imported')
    await expect(service.acknowledgeImport({ ...finalAck,input:{ ...finalAck.input,pageId:'99:99' } })).rejects.toMatchObject({ code:'figma_import_changed' })
    expect((await service.getHandoff({ actor,versionId })).figmaUrl).toContain('node-id=12-0')
    await expect(pool.query("UPDATE figma_handoffs SET package_hash=$1 WHERE id=$2",['0'.repeat(64),handoffId])).rejects.toMatchObject({ code:'23514' })
    const review=createReviewService({ pool })
    const submissionService=createFigmaSubmissionService({ pool,assetStore,reviewService:review })
    const checks={copyAccuracy:true,layoutQuality:true,exportReadiness:true}
    await expect(review.markReady({actor:designer,versionId,expectedRevision,idempotencyKey:'bypass',input:{figmaUrl:'https://www.figma.com/design/TestFileKey123',checklistAnswers:checks}})).rejects.toMatchObject({code:'figma_submission_required'})
    await expect(submissionService.beginSubmission({actor,handoffId,expectedRevision,idempotencyKey:'bad-submitter'})).rejects.toMatchObject({code:'forbidden'})
    const staged=await submissionService.beginSubmission({actor:designer,handoffId,expectedRevision,idempotencyKey:'submission'})
    const submissionId=staged.id
    await expect(submissionService.finalizeSubmission({actor:designer,submissionId,input:{checklistAnswers:checks,videoAssetIds:[]}})).rejects.toMatchObject({code:'incomplete_figma_submission'})
    const returned=[]
    for(const [index,output] of pkg.outputs.entries()) {
      const bytes=await sharp({create:{width:output.width,height:output.height,channels:3,background:index%2?'#223344':'#dd9933'}}).png().toBuffer()
      returned.push(createHash('sha256').update(bytes).digest('hex'))
      await submissionService.uploadOutput({actor:designer,submissionId,outputId:output.outputId,input:{frameId:mappings[index].frameId,pngBase64:bytes.toString('base64'),texts:[{layerId:'1:2',characters:'Designer revised headline'}]}})
    }
    const ready=await submissionService.finalizeSubmission({actor:designer,submissionId,input:{checklistAnswers:checks,videoAssetIds:[]}})
    expect(ready.submission.manifest.frames.map(f=>f.asset.sha256).sort()).toEqual(returned.sort())
    expect((await read()).campaign.status).toBe('ready')
    expect((await submissionService.finalizeSubmission({actor:designer,submissionId,input:{checklistAnswers:checks,videoAssetIds:[]}})).submission.submissionHash).toBe(ready.submission.submissionHash)
    await expect(review.approve({actor,versionId,expectedRevision:(await read()).campaign.revision,idempotencyKey:'wrong-approval',input:{submissionId,submissionHash:'0'.repeat(64)}})).rejects.toMatchObject({code:'figma_submission_changed'})
    await review.approve({actor,versionId,expectedRevision:(await read()).campaign.revision,idempotencyKey:'approve',input:{submissionId,submissionHash:ready.submission.submissionHash}})
    expect((await read()).campaign.status).toBe('approved')
    const delivered=await createDeliveryService({pool,assetStore}).createDelivery({actor,versionId,idempotencyKey:'delivery',input:{}})
    const object=(await pool.query('SELECT object_key FROM assets WHERE id=$1',[delivered.body.delivery.asset.id])).rows[0]
    const zip=Buffer.from(await assetStore.get({objectKey:object.object_key})),pngHashes=[]
    for(let offset=0;offset<zip.length-46;offset++) {
      if(zip.readUInt32LE(offset)!==0x02014b50)continue
      const filename=zip.subarray(offset+46,offset+46+zip.readUInt16LE(offset+28)).toString()
      if(!filename.endsWith('.png'))continue
      const local=zip.readUInt32LE(offset+42),start=local+30+zip.readUInt16LE(local+26)+zip.readUInt16LE(local+28)
      const data=zip.subarray(start,start+zip.readUInt32LE(offset+20))
      pngHashes.push(createHash('sha256').update(zip.readUInt16LE(offset+10)===8?inflateRawSync(data):data).digest('hex'))
    }
    expect(pngHashes.sort()).toEqual(returned.sort())
    expect((await versions.getVersion({actor,campaignId:'campaign',versionNumber:1})).snapshot).toEqual(created.body.version.snapshot)


  } finally {
    await pool.end()
    await maintenance.query(`DROP SCHEMA ${schema} CASCADE`)
    await maintenance.end()
  }
},30000)
