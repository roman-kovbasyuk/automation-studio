import { describe, expect, test } from 'vitest'
import sharp from 'sharp'
import { extractSource, materializeFoundCopy } from './sourceExtractor.js'
import { sourcePdf,sourceDocx } from '../testFixtures/briefSourceDocuments.js'

describe('source evidence', () => {
  test('preserves original PDF page coordinates, including empty pages', async () => {
    const bytes=sourcePdf(['Oslo courses','','Join us'])
    const result=await extractSource({bytes,mimeType:'application/pdf',name:'brief.pdf'})
    expect(result.blocks.map(block=>[block.id,block.page])).toEqual([['page-1',1],['page-2',2],['page-3',3]])
    expect(result.blocks[2].text).toContain('Join us')
    expect(result.attachments).toEqual([{kind:'pdf',mimeType:'application/pdf',bytes}])
  })
  test('rejects PDFs over 30 pages before text extraction', async () => {
    await expect(extractSource({bytes:sourcePdf(Array(31).fill('')),mimeType:'application/pdf',name:'long.pdf'}))
      .rejects.toMatchObject({code:'brief_file_too_complex'})
  })
  test('retains DOCX paragraphs and exact extracted whitespace', async () => {
    const bytes=await sourceDocx(['  Learn Norwegian.  ','Join us'])
    const result=await extractSource({bytes,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',name:'brief.docx'})
    expect(result.blocks).toEqual([{id:'paragraph-1',text:'  Learn Norwegian.  '},{id:'paragraph-2',text:'Join us'}])
  })
  test('preserves UTF-8 text verbatim regardless of extension', async () => {
    const bytes=Buffer.from('  Learn Norwegian.\r\nTogether.  ')
    expect((await extractSource({bytes,mimeType:'text/plain',name:'brief.txt'})).blocks[0].text).toBe(bytes.toString())
    expect((await extractSource({bytes,mimeType:'text/plain',name:'brief.pdf'})).blocks[0].text).toBe(bytes.toString())
    await expect(extractSource({bytes,mimeType:'application/pdf',name:'brief.txt'})).rejects.toMatchObject({code:'unreadable_brief_file'})
  })
  test('accepts bounded actual images without inventing OCR text', async () => {
    const bytes=await sharp({create:{width:8,height:8,channels:3,background:'white'}}).png().toBuffer()
    const result=await extractSource({bytes,mimeType:'image/png',name:'reference.png'})
    expect(result.blocks).toEqual([])
    expect(result.attachments).toEqual([{kind:'image',mimeType:'image/png',bytes}])
    await expect(extractSource({bytes,mimeType:'image/jpeg',name:'reference.jpg'})).rejects.toMatchObject({code:'unreadable_brief_file'})
  })
  test('keeps binary DOC disabled until a sandboxed converter is available', async () => {
    await expect(extractSource({bytes:Buffer.from('d0cf11e0a1b11ae1','hex'),mimeType:'application/msword',name:'brief.doc'}))
      .rejects.toMatchObject({code:'brief_format_unavailable'})
  })
  test('materializes exact field spans and derives provenance from stored evidence', () => {
    const evidence={s1:{name:'Brief.txt',blocks:[{id:'p1',text:' Learn Norwegian.\r\n',page:1}]}}
    expect(materializeFoundCopy({id:'c1',fields:{headline:{sourceId:'s1',blockId:'p1',start:1,end:17}}},evidence))
      .toEqual({id:'c1',fields:{headline:'Learn Norwegian.',body:'',offer:'',cta:''},verification:'text_verified',
        sourceRefs:[{sourceId:'s1',label:'Brief.txt',blockId:'p1',page:1,start:1,end:17}]})
  })
  test.each([
    {sourceId:'foreign',blockId:'p1',start:0,end:5},
    {sourceId:'s1',blockId:'wrong',start:0,end:5},
    {sourceId:'s1',blockId:'p1',start:-1,end:5},
    {sourceId:'s1',blockId:'p1',start:0,end:100},
    {sourceId:'s1',blockId:'p1',start:3,end:3},
  ])('rejects fabricated or out-of-range evidence: %j', span => {
    expect(()=>materializeFoundCopy({id:'c1',fields:{headline:span}}, {s1:{name:'Brief.txt',blocks:[{id:'p1',text:'Hello'}]}}))
      .toThrow(/evidence/i)
  })
})
