import { parseDocumentInChild, preflightDocx } from '../briefTextExtractor.js'
import { detectSourceType, nativeProcessingUnavailable } from './sourceType.js'
import { z } from 'zod'
import { decodeGeneratedImage } from '../images/imageDecoder.js'
import { MAX_SOURCE_TEXT, MAX_SOURCE_BYTES, foundCopySchema } from '../../shared/briefingContracts.js'

export const SOURCE_PARSER_VERSION = 'brief-source-v2'
export function briefSourceError(code, message, statusCode=422) {
  return Object.assign(new Error(message),{code,publicMessage:message,statusCode,expose:true})
}
export async function extractSource({bytes,mimeType}) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length>MAX_SOURCE_BYTES)
    throw briefSourceError('brief_file_too_large','Use a source of at most 25 MB.',413)
  const source=detectSourceType(bytes,mimeType)
  if (source.kind==='native_required') throw nativeProcessingUnavailable()
  mimeType=source.mimeType
  if (source.kind==='image') {
    if (!await decodeGeneratedImage(bytes,mimeType)) throw briefSourceError('unreadable_brief_file','This image could not be read safely.')
    return {blocks:[],attachments:[{kind:'image',mimeType,bytes}],parserVersion:SOURCE_PARSER_VERSION}
  }
  if (source.kind==='pdf' || source.kind==='zip') {
    const extension=source.kind==='pdf'?'.pdf':'.docx'
    if (extension==='.docx' && !preflightDocx(bytes).has('word/document.xml')) throw nativeProcessingUnavailable()
    const result=await parseDocumentInChild({extension,bytes,evidence:true})
    if (extension==='.docx' && !result.blocks.some(block=>block.text.trim()))
      throw briefSourceError('unreadable_brief_file','No readable campaign text was found. Paste the text instead.')
    return {...result,attachments:extension==='.pdf'?[{kind:'pdf',mimeType,bytes}]:[],parserVersion:SOURCE_PARSER_VERSION}
  }
  const text=source.text
  if (!text.trim()) throw briefSourceError('unreadable_brief_file','No readable campaign text was found.')
  if (text.length>MAX_SOURCE_TEXT) throw briefSourceError('brief_text_too_large','The source exceeds 20,000 text characters.',413)
  return {blocks:[{id:'text-1',text}],attachments:[],parserVersion:SOURCE_PARSER_VERSION}
}

const spanSchema=z.strictObject({sourceId:z.string().min(1),blockId:z.string().min(1),start:z.number().int().nonnegative(),end:z.number().int().positive()})
const candidateSchema=z.strictObject({id:z.string().min(1).max(200),fields:z.strictObject({
  headline:spanSchema.optional(),body:spanSchema.optional(),offer:spanSchema.optional(),cta:spanSchema.optional(),
})})

/** The provider identifies spans; it never supplies trusted verbatim wording. */
export function materializeFoundCopy(proposal, evidence) {
  const parsed=candidateSchema.safeParse(proposal)
  const invalid=()=>briefSourceError('invalid_copy_evidence','The detected copy contains invalid source evidence.')
  if (!parsed.success) throw invalid()
  const fields={headline:'',body:'',offer:'',cta:''},sourceRefs=[]
  for (const [field,span] of Object.entries(parsed.data.fields)) {
    const source=Object.hasOwn(evidence,span.sourceId)?evidence[span.sourceId]:null
    const block=source?.blocks.find(item=>item.id===span.blockId)
    if (!block || span.end<=span.start || span.end>block.text.length) throw invalid()
    fields[field]=block.text.slice(span.start,span.end)
    sourceRefs.push({sourceId:span.sourceId,label:source.name,blockId:block.id,
      ...(block.page?{page:block.page}:{}),start:span.start,end:span.end})
  }
  const result=foundCopySchema.safeParse({id:parsed.data.id,fields,sourceRefs,verification:'text_verified'})
  if (!result.success) throw invalid()
  return result.data
}
