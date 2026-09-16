import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

const MAX_TEXT_CHARACTERS = 20_000

async function parse({ extension, bytes, evidence }) {
  if (extension === '.docx') {
    const text=(await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value
    if (!evidence) return {text}
    // Mammoth separates paragraphs by two newlines; remove only its final separator.
    return {blocks:text.replace(/\n\n$/,'').split('\n\n').map((text,index)=>({id:`paragraph-${index+1}`,text}))}
  }
  const parser = new PDFParse({ data: new Uint8Array(bytes) })
  try {
    if (evidence && (await parser.getInfo()).total>30) return {error:'too_many_pages'}
    const result=await parser.getText({pageJoiner:evidence?'':undefined})
    return evidence?{blocks:result.pages.map(page=>({id:`page-${page.num}`,page:page.num,text:page.text}))}:{text:result.text}
  } finally {
    await parser.destroy()
  }
}

process.once('message', async (input) => {
  try {
    const result = await parse(input)
    const size=result.blocks?.reduce((sum,block)=>sum+block.text.length,0)??result.text?.length??0
    process.send?.(size > MAX_TEXT_CHARACTERS ? { error: 'text_too_large' } : result)
  } catch {
    process.send?.({ error: 'unreadable' })
  }
})
