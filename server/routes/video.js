import { z } from 'zod'
import { videoPlanRequestSchema,videoPlanSchema,videoJobRecordSchema } from '../../shared/videoContracts.js'
import { parse,parseIdempotencyKey,strictResponse,notFound } from './support.js'
const campaignParams=z.strictObject({campaignId:z.string().min(1).max(255)})
const jobParams=z.strictObject({jobId:z.string().min(1).max(255)})
const requestId=z.string().min(1).max(128)
const jobResponse=videoJobRecordSchema.extend({requestId})
export function registerVideoRoutes(app,{requireRole,videoGenerationService:service}) {
  app.post('/api/v1/campaigns/:campaignId/video-generation-plans',{preHandler:requireRole('marketer','admin')},async request=>{
    const {campaignId}=parse(campaignParams,request.params)
    return strictResponse(videoPlanSchema.extend({requestId}),request,await service.plan({actor:request.actor,campaignId,input:parse(videoPlanRequestSchema,request.body)}))
  })
  app.post('/api/v1/campaigns/:campaignId/video-generations',{preHandler:requireRole('marketer','admin')},async(request,reply)=>{
    const {campaignId}=parse(campaignParams,request.params)
    const idempotencyKey=parseIdempotencyKey(request)
    const input=parse(z.strictObject({planId:z.string().min(1).max(255),acceptedCostMicrounits:z.number().int().nonnegative()}),request.body)
    const job=await service.submitPlan({actor:request.actor,campaignId,idempotencyKey,...input})
    reply.code(202)
    return strictResponse(jobResponse,request,job)
  })
  app.get('/api/v1/video-jobs/:jobId',{preHandler:requireRole()},async request=>{
    const {jobId}=parse(jobParams,request.params)
    const job=await service.get({actor:request.actor,jobId})
    if(!job)return notFound('Video job')
    return strictResponse(jobResponse,request,job)
  })
  app.get('/api/v1/campaigns/:campaignId/video-jobs',{preHandler:requireRole()},async request=>{
    const {campaignId}=parse(campaignParams,request.params)
    return strictResponse(z.strictObject({jobs:z.array(videoJobRecordSchema),requestId}),request,{jobs:await service.list({actor:request.actor,campaignId})})
  })
  app.post('/api/v1/video-jobs/:jobId/cancel',{preHandler:requireRole('marketer','admin')},async request=>{
    const {jobId}=parse(jobParams,request.params)
    parse(z.strictObject({}),request.body??{})
    return strictResponse(jobResponse,request,await service.cancel({actor:request.actor,jobId}))
  })
}
