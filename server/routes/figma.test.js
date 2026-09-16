import { expect,test,vi } from 'vitest'
import Fastify from 'fastify'
import { registerFigmaRoutes } from './figma.js'

test('plugin routes use only paired identity, while app creation requires role, revision and idempotency',async()=>{
  const app=Fastify()
  const actor={id:'designer',role:'designer'}
  const requireRole=(...roles)=>async request=>{
    const role=request.headers['x-role']
    if(!role||roles.length&&!roles.includes(role)) throw Object.assign(new Error('forbidden'),{statusCode:403})
    request.actor={id:role,role}
  }
  const figmaHandoffService={ createHandoff:vi.fn(async()=>({status:202,body:{handoff:{state:'queued'}}})),
    getHandoff:vi.fn(async()=>null),getPackage:vi.fn(async()=>({outputs:[]})),listHandoffs:vi.fn(async()=>[]),
    claimHandoff:vi.fn(async()=>({leaseGeneration:1})),acknowledgeImport:vi.fn(async()=>({state:'imported'})) }
  const figmaPairingService={ beginPairing:vi.fn(async()=>({pairingId:'p',code:'SYNTHETIC',sessionToken:'synthetic'})),
    confirmPairing:vi.fn(async()=>({expiresAt:'later'})),authenticate:vi.fn(async token=>{
      if(token!=='paired') throw Object.assign(new Error('unauthorized'),{statusCode:401})
      return {actor,workerId:'session-1'}
    }) }
  registerFigmaRoutes(app,{requireRole,figmaHandoffService,figmaPairingService})
  const create={method:'POST',url:'/api/v1/versions/v1/figma-handoff',payload:{fileKey:'TestFile123'}}
  expect((await app.inject({...create,headers:{'x-role':'designer'}})).statusCode).toBe(403)
  expect((await app.inject({...create,headers:{'x-role':'marketer'}})).statusCode).toBe(428)
  expect((await app.inject({...create,headers:{'x-role':'marketer','if-match':'"1"','idempotency-key':'create'}})).statusCode).toBe(202)
  const claim={method:'POST',url:'/api/v1/figma/plugin/handoffs/h1/claim',payload:{}}
  expect((await app.inject({...claim,headers:{'x-role':'designer'}})).statusCode).toBe(401)
  expect((await app.inject({...claim,headers:{authorization:'Bearer paired'}})).statusCode).toBe(200)
  expect(figmaHandoffService.claimHandoff).toHaveBeenCalledWith({actor,workerId:'session-1',handoffId:'h1'})
  expect((await app.inject({...claim,headers:{authorization:'Bearer paired'},payload:{workerId:'spoof'}})).statusCode).toBe(400)
  const options=await app.inject({method:'OPTIONS',url:'/api/v1/figma/plugin/handoffs/h1/claim'})
  expect(options.headers['access-control-allow-headers']).toContain('Authorization')
  expect(options.statusCode).toBe(204)
  await app.close()
})
