import {expect,test} from 'vitest'
import {emptyBriefAnswers} from '../../shared/briefingContracts.js'
import {verifyBriefingProposal} from './analysisEvidence.js'

const sourceKey='a'.repeat(64)
const sources=[{id:'s1',name:'Brief.txt',mimeType:'text/plain',contentHash:'b'.repeat(64),blocks:[{id:'text-1',text:'  Learn Norwegian.  '}],attachmentRefs:[]}]
const candidate={id:'c1',fields:{headline:'  Learn Norwegian.  ',body:'',offer:'',cta:''},verification:'text_verified',
  sourceRefs:[{sourceId:'s1',label:'Provider label',blockId:'text-1',start:0,end:20}]}
const proposal=()=>({sourceKey,foundCopy:[structuredClone(candidate)],answers:emptyBriefAnswers(),suggestedVisualTags:['Oslo']})
test('verifies exact source text and uses server-owned source labels',()=>{
  const result=verifyBriefingProposal(proposal(),{sourceKey,sources})
  expect(result.foundCopy[0].fields).toEqual(candidate.fields)
  expect(result.foundCopy[0].sourceRefs[0].label).toBe('Brief.txt')
})
test.each(['wrong source','rewritten text','invented CTA','invalid span','wrong source key'])('rejects %s',problem=>{
  const value=proposal()
  if(problem==='wrong source') value.foundCopy[0].sourceRefs[0].sourceId='foreign'
  if(problem==='rewritten text') value.foundCopy[0].fields.headline='Learn Norwegian!'
  if(problem==='invented CTA') value.foundCopy[0].fields.cta='Join us'
  if(problem==='invalid span') value.foundCopy[0].sourceRefs[0].end=200
  if(problem==='wrong source key') value.sourceKey='c'.repeat(64)
  expect(()=>verifyBriefingProposal(value,{sourceKey,sources})).toThrow(/evidence/i)
})
test('image wording remains needs-review and cannot claim text verification',()=>{
  const images=[{...sources[0],mimeType:'image/png',blocks:[],attachmentRefs:[{kind:'image',mimeType:'image/png'}]}]
  const value=proposal();value.foundCopy[0].sourceRefs=[{sourceId:'s1',label:'Image',blockId:'attachment'}]
  expect(()=>verifyBriefingProposal(value,{sourceKey,sources:images})).toThrow(/evidence/i)
  value.foundCopy[0].verification='needs_review'
  expect(verifyBriefingProposal(value,{sourceKey,sources:images}).foundCopy[0].verification).toBe('needs_review')
})
test('corrects copy questions and age ranges the model can get wrong, and stays stable when repeated',()=>{
  const found=proposal();found.answers={...found.answers,copyMode:'create_new',ageGroups:['45_54','18_24']}
  const corrected=verifyBriefingProposal(found,{sourceKey,sources})
  expect(corrected.answers).toMatchObject({copyMode:null,ageGroups:['18_24','25_34','35_44','45_54']})
  expect(verifyBriefingProposal(corrected,{sourceKey,sources})).toEqual(corrected)
  for(const copyMode of ['keep_original','keep_and_create'])
    expect(verifyBriefingProposal({...proposal(),answers:{...emptyBriefAnswers(),copyMode}},{sourceKey,sources}).answers.copyMode).toBe(copyMode)
  const none={...proposal(),foundCopy:[],answers:{...emptyBriefAnswers(),copyMode:'keep_original',ageGroups:['under_18','18_24','25_34','35_44','45_54','55_64','65_plus']}}
  expect(verifyBriefingProposal(none,{sourceKey,sources}).answers).toMatchObject({copyMode:'create_new',ageGroups:[]})
})
