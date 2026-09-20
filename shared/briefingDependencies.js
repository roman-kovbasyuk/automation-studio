// Browser-safe semantic projections. Hash only on the server, using canonicalJson.
const rawFields = ['product','audience','objective','offer','locale','notes']
export const isBriefingV2 = brief => brief?.briefing?.schemaVersion === 2
export function reviewedAnalysis(brief,analysis) {
  if(!isBriefingV2(brief)) return brief.analysis??analysis
  const answers=brief.briefing.answers
  const goals={awareness:'Brand awareness',traffic:'Website traffic',leads:'Generate leads',signups:'Sign-ups',sales:'Sales'}
  // Historical suggestions are immutable evidence, not generation input after an adult-range correction.
  const {briefingProposal:oldProposal,...content}=analysis
  const current=oldProposal?.answers?.ageGroups.includes('under_18')?content:analysis
  return {...current,summary:answers.summary,audience:answers.audience,objective:answers.goal==='other'?answers.goalCustom:goals[answers.goal]??''}
}
export function sourceProjection(brief, sources = []) {
  const raw = Object.fromEntries(rawFields.map(key => [key, brief[key] ?? (key==='locale'?'auto':'')]))
  return {raw,sources:sources.map(({id,contentHash,parserVersion})=>({id,contentHash,parserVersion}))}
}
export function copyProjection(brief) {
  if (!isBriefingV2(brief)) return brief
  const {answers,sourceKey} = brief.briefing
  const {summary,audience,ageGroups,gender,reach,goal,goalCustom} = answers
  return {version:2,sourceKey,locale:brief.locale,summary,audience,ageGroups:[...ageGroups].sort(),gender,reach,goal,
    goalCustom:goal==='other'?goalCustom:''}
}
export function visualProjection(brief) {
  if (!isBriefingV2(brief)) return brief
  return {...copyProjection(brief),tags:brief.briefing.answers.visualTags}
}
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])) : item)
export function classifyBriefChange(before, after) {
  const source = canonical(sourceProjection(before)) !== canonical(sourceProjection(after))
    || canonical(before.briefing?.sourceIds) !== canonical(after.briefing?.sourceIds)
    || before.briefing?.sourceKey !== after.briefing?.sourceKey
  const copy = source || canonical(copyProjection(before)) !== canonical(copyProjection(after))
  return {source,copy,visual:copy || canonical(visualProjection(before)) !== canonical(visualProjection(after))}
}
