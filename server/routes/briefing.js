import {z} from 'zod'
import {briefSourceSummarySchema,briefConfirmationResponseSchema} from '../../shared/briefingContracts.js'
import {MAX_BRIEF_UPLOAD_BASE64} from '../../shared/briefUploadLimits.js'
import {parse,parseIfMatch,parseIdempotencyKey,strictResponse} from './support.js'
const params=z.strictObject({campaignId:z.string().min(1),sourceId:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/)})
const response=z.strictObject({source:briefSourceSummarySchema,campaignRevision:z.number().int().nonnegative(),requestId:z.string()})
const detail=z.strictObject({source:briefSourceSummarySchema,blocks:z.array(z.strictObject({id:z.string(),text:z.string().max(20_000),page:z.number().int().positive().optional()})),requestId:z.string()})
const removed=z.strictObject({campaignRevision:z.number().int().nonnegative(),requestId:z.string()})
export function registerBriefingRoutes(app,{requireRole,briefSourceService,briefingService}) {
  const path='/api/v1/campaigns/:campaignId/brief-sources/:sourceId'
  const editors={preHandler:requireRole('marketer','admin')}
  if(briefingService) app.post('/api/v1/campaigns/:campaignId/briefing',editors,async(request,reply)=>{
    parse(z.strictObject({}),request.body??{})
    const value=await briefingService.startReview({actor:request.actor,campaignId:parse(z.strictObject({campaignId:z.string().min(1)}),request.params).campaignId,expectedRevision:parseIfMatch(request)})
    reply.header('etag',`"${value.campaignRevision}"`)
    return strictResponse(removed,request,value)
  })
  if(briefingService) app.post('/api/v1/campaigns/:campaignId/brief-confirmations',editors,async(request,reply)=>{
    const value=await briefingService.confirm({actor:request.actor,campaignId:parse(z.strictObject({campaignId:z.string().min(1)}),request.params).campaignId,
      expectedRevision:parseIfMatch(request),idempotencyKey:parseIdempotencyKey(request),input:request.body})
    reply.header('etag',`"${value.campaignRevision}"`)
    return strictResponse(briefConfirmationResponseSchema.extend({requestId:z.string()}),request,value)
  })
  if(!briefSourceService) return
  const command=request=>({actor:request.actor,...parse(params,request.params),expectedRevision:parseIfMatch(request)})
  const result=(request,reply,value)=>{
    const {source,campaignRevision}=value
    reply.header('etag',`"${campaignRevision}"`)
    return strictResponse(response,request,{source,campaignRevision})
  }
  app.put(path,{...editors,bodyLimit:MAX_BRIEF_UPLOAD_BASE64+4_096},async(request,reply)=>result(request,reply,
    await briefSourceService.putSource({...command(request),input:request.body})))
  app.post(`${path}/retry`,editors,async(request,reply)=>{
    parse(z.strictObject({}),request.body??{})
    return result(request,reply,await briefSourceService.retrySource(command(request)))
  })
  app.get(path,{preHandler:requireRole('marketer','designer','admin')},async request=>{
    const {source,blocks}=await briefSourceService.getSource({actor:request.actor,...parse(params,request.params)})
    return strictResponse(detail,request,{source,blocks})
  })
  app.delete(path,editors,async(request,reply)=>{
    const {campaignRevision}=await briefSourceService.removeSource(command(request))
    reply.header('etag',`"${campaignRevision}"`)
    return strictResponse(removed,request,{campaignRevision})
  })
}
