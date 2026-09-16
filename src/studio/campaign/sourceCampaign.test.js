import {expect,test} from 'vitest'
import {createSourceCampaignSubmission} from './sourceCampaign.js'

test('an interrupted upload reuses its campaign and source identity; only complete material proceeds',async()=>{
  let created=0,fail=true,revision=0
  const sources=new Map(),attempts=[]
  const api={createCampaign:async()=>({id:`campaign-${++created}`,revision}),getWorkspace:async()=>({campaign:{id:'campaign-1',revision}}),
    patchCampaign:async()=>({revision:++revision}),putBriefSource:async(id,sourceId,input)=>{
      attempts.push({id,sourceId,input})
      if(fail){fail=false;throw Object.assign(new Error('Connection interrupted'),{status:0})}
      sources.set(sourceId,input);return {campaignRevision:++revision,source:{id:sourceId,status:'ready'}}
    }}
  const submit=createSourceCampaignSubmission({api})
  const input={title:'Course',brief:{notes:''},sources:[{id:'source-1',kind:'file',name:'brief.txt',mimeType:'text/plain',data:'Q291cnNl'}]}
  await expect(submit(input)).rejects.toThrow('Connection interrupted')
  expect(created).toBe(1)
  expect(await submit(input)).toMatchObject({id:'campaign-1'})
  expect(created).toBe(1)
  expect(attempts.map(x=>[x.id,x.sourceId])).toEqual([['campaign-1','source-1'],['campaign-1','source-1']])
  expect(sources.get('source-1').data).toBe('Q291cnNl')
})
