import {expect,test,vi} from 'vitest'
import {buildApp} from '../app.js'
const source={id:'s1',name:'Pasted text',kind:'text',mimeType:'text/plain',byteSize:4,status:'ready',errorCode:null,contentHash:'a'.repeat(64),contentRevision:1}
test('confirmation requires revision and idempotency headers and delegates only explicit POST',async()=>{
  const receipt={confirmationId:'confirmation',campaignRevision:3,initialCopy:'skip',importedCopySetId:null}
  const confirm=vi.fn(async()=>receipt)
  const app=buildApp({resolveActor:async()=>({id:'actor',role:'marketer'}),workflowService:{},briefingService:{confirm}})
  try {
    const request={method:'POST',url:'/api/v1/campaigns/c1/brief-confirmations',payload:{}}
    expect((await app.inject(request)).statusCode).toBe(428)
    const response=await app.inject({...request,headers:{'if-match':'"2"','idempotency-key':'confirm-1'}})
    expect(response.statusCode).toBe(200)
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({expectedRevision:2,idempotencyKey:'confirm-1',campaignId:'c1'}))
    expect(response.json()).toMatchObject(receipt)
  } finally {await app.close()}
})
test('campaign sources require an editor and exact revision; public payload excludes storage details',async()=>{
  const putSource=vi.fn(async()=>({source,campaignRevision:2,objectKey:'must-not-leak'}))
  const app=buildApp({resolveActor:async request=>({id:'actor',role:request.headers['x-test-role']??'marketer'}),workflowService:{},briefSourceService:{putSource}})
  try {
    const request={method:'PUT',url:'/api/v1/campaigns/c1/brief-sources/s1',payload:{kind:'text',text:'Copy'}}
    expect((await app.inject(request)).statusCode).toBe(428)
    expect((await app.inject({...request,headers:{'if-match':'"0"','x-test-role':'designer'}})).statusCode).toBe(403)
    const response=await app.inject({...request,headers:{'if-match':'"0"'}})
    expect(response.statusCode).toBe(200)
    expect(response.headers.etag).toBe('"2"')
    expect(response.json()).toEqual({source,campaignRevision:2,requestId:response.headers['x-request-id']})
    expect(putSource).toHaveBeenCalledWith(expect.objectContaining({campaignId:'c1',sourceId:'s1',expectedRevision:0}))
  } finally {await app.close()}
})
