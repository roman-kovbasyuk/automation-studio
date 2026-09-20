import {briefingStoredProposalSchema,normalizeAgeGroups} from '../../shared/briefingContracts.js'
import {briefSourceError} from './sourceExtractor.js'

/** Validate provider claims against the immutable input snapshot, not its labels. */
export function verifyBriefingProposal(value,{sourceKey,sources}) {
  const invalid=()=>briefSourceError('invalid_copy_evidence','The analysis contains invalid source evidence.')
  const parsed=briefingStoredProposalSchema.safeParse(value)
  if (!parsed.success || parsed.data.sourceKey!==sourceKey) throw invalid()
  const proposal=parsed.data
  if (new Set(proposal.foundCopy.map(copy=>copy.id)).size!==proposal.foundCopy.length) throw invalid()
  proposal.foundCopy=proposal.foundCopy.map(copy=>{
    const snippets=[];let hasUnverifiedAttachment=false
    const sourceRefs=copy.sourceRefs.map(ref=>{
      const source=sources.find(item=>item.id===ref.sourceId)
      if (!source) throw invalid()
      const block=source.blocks.find(item=>item.id===ref.blockId)
      if (!block) {
        if (ref.blockId!=='attachment' || !source.attachmentRefs.length || copy.verification!=='needs_review'
          || ref.start!==undefined || ref.end!==undefined || ref.page!==undefined) throw invalid()
        hasUnverifiedAttachment=true
        return {sourceId:source.id,label:source.name,blockId:'attachment'}
      }
      if (!Number.isInteger(ref.start) || !Number.isInteger(ref.end) || ref.start<0 || ref.end<=ref.start || ref.end>block.text.length
        || ref.page!==undefined && ref.page!==block.page) throw invalid()
      snippets.push(block.text.slice(ref.start,ref.end))
      return {sourceId:source.id,label:source.name,blockId:block.id,start:ref.start,end:ref.end,...(block.page?{page:block.page}:{})}
    })
    if (!hasUnverifiedAttachment && Object.values(copy.fields).some(text=>text && !snippets.some(snippet=>snippet.includes(text)))) throw invalid()
    return {...copy,sourceRefs,verification:hasUnverifiedAttachment?'needs_review':'text_verified'}
  })
  return briefingStoredProposalSchema.parse(normalizeBriefingProposal(proposal))
}

/** Corrects answers the model can get wrong without failing the analysis: found copy is always kept, and ages form one range. */
export function normalizeBriefingProposal(proposal) {
  const copyMode=!proposal.foundCopy.length?'create_new':proposal.answers.copyMode==='create_new'?null:proposal.answers.copyMode
  return {...proposal,answers:{...proposal.answers,copyMode,
    ageGroups:proposal.answers.ageGroups.includes('under_18')?proposal.answers.ageGroups:normalizeAgeGroups(proposal.answers.ageGroups)}}
}
