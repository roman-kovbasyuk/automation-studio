import {expect,test,vi} from 'vitest'
import { approvedSourceProvider } from './providerBoundary.js'
import {createGeminiProvider} from '../providers/geminiProvider.js'

test('only a managed Vertex EU adapter may receive campaign sources',()=>{
  const client={models:{generateContent:vi.fn()}}
  const managed=createGeminiProvider({project:'synthetic-project',location:'eu',client})
  const personal=createGeminiProvider({apiKey:'synthetic-not-a-secret',location:'eu',client})
  const job={provider:'gemini',region:'eu'}
  expect(approvedSourceProvider(job,{gemini:managed})).toBe(managed)
  expect(()=>approvedSourceProvider(job,{gemini:personal})).toThrow(/Vertex AI EU/)
  for(const bad of [{...job,region:'global'},{...job,provider:'openai'},{...job,credentialVersion:1}])
    expect(()=>approvedSourceProvider(bad,{gemini:managed})).toThrow(/Vertex AI EU/)
  expect(client.models.generateContent).not.toHaveBeenCalled()
})
