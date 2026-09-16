import { expect, test, vi } from 'vitest'
import { buildApp } from '../app.js'

test('video routes require explicit estimate acceptance, preserve idempotency and only read status on GET', async () => {
  const record = { id:'job',campaignId:'campaign',directionId:'direction',model:'veo-3.1-lite-generate-preview',phase:'queued',
    errorCode:null,asset:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString() }
  const service = { submitPlan:vi.fn(async()=>record),get:vi.fn(async()=>record),list:vi.fn(async()=>[record]),cancel:vi.fn(async()=>record),plan:vi.fn() }
  const app=buildApp({resolveActor:async req=>({id:'actor',role:req.headers.role??'marketer'}),workflowService:{},videoGenerationService:service})
  try {
    expect((await app.inject({method:'POST',url:'/api/v1/campaigns/campaign/video-generations',payload:{planId:'plan',acceptedCostMicrounits:200000}})).statusCode).toBe(428)
    const response=await app.inject({method:'POST',url:'/api/v1/campaigns/campaign/video-generations',headers:{'idempotency-key':'one-video'},payload:{planId:'plan',acceptedCostMicrounits:200000}})
    expect(response.statusCode).toBe(202)
    expect(service.submitPlan).toHaveBeenCalledWith(expect.objectContaining({idempotencyKey:'one-video',acceptedCostMicrounits:200000}))
    expect((await app.inject({method:'GET',url:'/api/v1/video-jobs/job'})).statusCode).toBe(200)
    expect(service.submitPlan).toHaveBeenCalledTimes(1)
    expect((await app.inject({method:'POST',url:'/api/v1/campaigns/campaign/video-generations',headers:{role:'designer','idempotency-key':'no'},payload:{planId:'plan',acceptedCostMicrounits:200000}})).statusCode).toBe(403)
  } finally {await app.close()}
})
