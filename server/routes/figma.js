import { figmaUploadSchema,figmaFinalizeSchema } from '../services/figmaSubmissionService.js'
import { z } from 'zod'
import { parse,parseIfMatch,parseIdempotencyKey } from './support.js'
import { createFigmaHandoffSchema,figmaImportAckSchema,figmaFail } from '../services/figmaHandoffService.js'
const empty=z.object({}).strict()
const identifier=z.string().min(1).max(256)
const versionParams=z.object({versionId:identifier}).strict()
const handoffParams=z.object({handoffId:identifier}).strict()

export function registerFigmaRoutes(app,{ requireRole,figmaHandoffService,figmaPairingService,figmaSubmissionService }) {
  app.get('/api/v1/versions/:versionId/figma-handoff',{preHandler:requireRole()},async request=>({
    handoff:await figmaHandoffService.getHandoff({actor:request.actor,...parse(versionParams,request.params)}),
  }))
  app.post('/api/v1/versions/:versionId/figma-handoff',{preHandler:requireRole('marketer','admin')},async(request,reply)=>{
    const outcome=await figmaHandoffService.createHandoff({actor:request.actor,...parse(versionParams,request.params),
      expectedRevision:parseIfMatch(request),idempotencyKey:parseIdempotencyKey(request),input:parse(createFigmaHandoffSchema,request.body)})
    reply.code(outcome.status); return outcome.body
  })
  app.post('/api/v1/figma/pairings/:pairingId/confirm',{preHandler:requireRole()},async request=>{
    const {pairingId}=parse(z.object({pairingId:identifier}).strict(),request.params)
    const {code}=parse(z.object({code:z.string().min(1).max(32)}).strict(),request.body)
    return figmaPairingService.confirmPairing({actor:request.actor,pairingId,code})
  })

  // The plugin has no app cookies. Only these bearer-authenticated routes allow
  // cross-origin access from Figma's sandboxed UI; normal app routes are unchanged.
  const prefix='/api/v1/figma/plugin'
  app.addHook('onRequest',async(request,reply)=>{
    if(!request.url.startsWith(`${prefix}/`)) return
    reply.header('Access-Control-Allow-Origin','*')
    reply.header('Access-Control-Allow-Headers','Authorization, Content-Type')
    reply.header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
    reply.header('Cache-Control','no-store')
  })
  app.options(`${prefix}/*`,async(_request,reply)=>reply.code(204).send())
  const attempts=new Map()
  app.post(`${prefix}/pairings`,{bodyLimit:1024},async request=>{
    parse(empty,request.body??{})
    const now=Date.now()
    for(const [key,value] of attempts) if(value.expires<=now) attempts.delete(key)
    const key=request.ip,prior=attempts.get(key)??{count:0,expires:now+60000}
    if(prior.count>=10||attempts.size>5000) figmaFail(429,'pairing_rate_limited','Wait a minute before starting another pairing')
    prior.count++;attempts.set(key,prior)
    return figmaPairingService.beginPairing()
  })
  const pluginAuth=async request=>{
    const token=/^Bearer (\S+)$/.exec(request.headers.authorization??'')?.[1]
    request.figmaSession=await figmaPairingService.authenticate(token)
  }
  app.get(`${prefix}/session`,{preHandler:pluginAuth},async request=>({role:request.figmaSession.actor.role,expiresAt:request.figmaSession.expiresAt}))
  app.get(`${prefix}/handoffs`,{preHandler:pluginAuth},async request=>({handoffs:await figmaHandoffService.listHandoffs({actor:request.figmaSession.actor})}))
  app.get(`${prefix}/handoffs/:handoffId/package`,{preHandler:pluginAuth},async request=>figmaHandoffService.getPackage({
    actor:request.figmaSession.actor,...parse(handoffParams,request.params),
  }))
  app.post(`${prefix}/handoffs/:handoffId/claim`,{preHandler:pluginAuth},async request=>{
    parse(empty,request.body??{})
    return figmaHandoffService.claimHandoff({...request.figmaSession,...parse(handoffParams,request.params)})
  })
  app.post(`${prefix}/handoffs/:handoffId/failed`,{preHandler:pluginAuth},async request=>{
    const body=parse(z.object({leaseGeneration:z.number().int().positive()}).strict(),request.body)
    return figmaHandoffService.failImport({...request.figmaSession,...parse(handoffParams,request.params),...body})
  })
  app.post(`${prefix}/handoffs/:handoffId/acknowledge`,{preHandler:pluginAuth},async request=>{
    const body=parse(z.object({leaseGeneration:z.number().int().positive(),input:figmaImportAckSchema}).strict(),request.body)
    return figmaHandoffService.acknowledgeImport({...request.figmaSession,...parse(handoffParams,request.params),...body})
  })
  if(figmaSubmissionService) {
    app.get('/api/v1/versions/:versionId/figma-submission',{preHandler:requireRole()},async request=>({submission:await figmaSubmissionService.getForVersion({actor:request.actor,...parse(versionParams,request.params)})}))
    const outputParams=z.object({submissionId:identifier,outputId:identifier}).strict()
    app.get('/api/v1/figma/submissions/:submissionId/outputs/:outputId',{preHandler:requireRole()},async(request,reply)=>{
      const output=await figmaSubmissionService.getOutput({actor:request.actor,...parse(outputParams,request.params)})
      reply.type(output.mimeType).header('Cache-Control','private, no-store');return output.bytes
    })
    app.post(`${prefix}/handoffs/:handoffId/submissions`,{preHandler:pluginAuth},async request=>{
      const input=parse(z.object({expectedRevision:z.number().int().nonnegative(),idempotencyKey:z.string().min(1).max(255)}).strict(),request.body)
      return figmaSubmissionService.beginSubmission({actor:request.figmaSession.actor,...parse(handoffParams,request.params),...input})
    })
    app.post(`${prefix}/submissions/:submissionId/outputs/:outputId`,{preHandler:pluginAuth,bodyLimit:38_000_000},async request=>{
      return figmaSubmissionService.uploadOutput({actor:request.figmaSession.actor,...parse(outputParams,request.params),input:parse(figmaUploadSchema,request.body)})
    })
    app.post(`${prefix}/submissions/:submissionId/finalize`,{preHandler:pluginAuth},async request=>{
      const {submissionId}=parse(z.object({submissionId:identifier}).strict(),request.params)
      return figmaSubmissionService.finalizeSubmission({actor:request.figmaSession.actor,submissionId,input:parse(figmaFinalizeSchema,request.body)})
    })
  }

}
