import { expect, test } from 'vitest'
import { copyProjection, visualProjection, sourceProjection, classifyBriefChange } from './briefingDependencies.js'
const makeBrief = (answers = {}) => ({ product:'Course', audience:'Learners', objective:'Signups', offer:'', locale:'no', notes:'Oslo',
  briefing:{ schemaVersion:2, sourceIds:['s1'], sourceKey:'a'.repeat(64), analysisJobId:'job1', confirmation:null,
    answers:{summary:'Norwegian courses',audience:'Adult learners',copyMode:'keep_original',ageGroups:[],gender:'all',reach:'local',goal:'signups',goalCustom:'',visualTags:['Oslo'],...answers} } })
test('tag-only edits invalidate visuals without touching copy or source', () => {
  const before=makeBrief(), after=makeBrief({visualTags:['Classrooms']})
  expect(copyProjection(after)).toEqual(copyProjection(before))
  expect(visualProjection(after)).not.toEqual(visualProjection(before))
  expect(classifyBriefChange(before,after)).toEqual({source:false,copy:false,visual:true})
})
test('goal edits affect copy and visuals, while source edits affect every dependency', () => {
  expect(classifyBriefChange(makeBrief(),makeBrief({goal:'awareness'}))).toEqual({source:false,copy:true,visual:true})
  expect(classifyBriefChange(makeBrief(),{...makeBrief(),notes:'Bergen'})).toEqual({source:true,copy:true,visual:true})
})
test('workflow decisions and analysis receipts are not creative dependencies', () => {
  expect(classifyBriefChange(makeBrief(),makeBrief({copyMode:'create_new'}))).toEqual({source:false,copy:false,visual:false})
  const after=makeBrief(); after.briefing.analysisJobId='job2'
  expect(sourceProjection(after,[])).toEqual(sourceProjection(makeBrief(),[]))
})
test('source display names do not affect identity but changed bytes do', () => {
  const before=sourceProjection(makeBrief(),[{id:'s1',contentHash:'a',parserVersion:'v1',name:'Old'}])
  expect(sourceProjection(makeBrief(),[{id:'s1',contentHash:'a',parserVersion:'v1',name:'New'}])).toEqual(before)
  expect(sourceProjection(makeBrief(),[{id:'s1',contentHash:'b',parserVersion:'v1'}])).not.toEqual(before)
})
