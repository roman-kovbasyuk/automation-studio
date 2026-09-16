import { ZipArchive } from 'archiver'
import { PassThrough } from 'node:stream'

export function sourcePdf(pages) {
  const objects=['<< /Type /Catalog /Pages 2 0 R >>',`<< /Type /Pages /Kids [${pages.map((_,i)=>`${4+i*2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
  for (const [i,text] of pages.entries()) {
    const content=text?`BT /F1 18 Tf 72 720 Td (${text}) Tj ET`:''
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5+i*2} 0 R >>`,
      `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`)
  }
  let pdf='%PDF-1.4\n';const offsets=[]
  for (const [i,object] of objects.entries()) {offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${object}\nendobj\n`}
  const xref=Buffer.byteLength(pdf)
  pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')}`
  return Buffer.from(`${pdf}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
}

export async function sourceDocx(paragraphs) {
  const output=new PassThrough(),chunks=[]
  output.on('data',chunk=>chunks.push(chunk))
  const complete=new Promise((resolve,reject)=>{output.on('end',resolve);output.on('error',reject)})
  const zip=new ZipArchive({});zip.on('error',error=>output.destroy(error));zip.pipe(output)
  zip.append('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',{name:'[Content_Types].xml'})
  zip.append('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',{name:'_rels/.rels'})
  zip.append(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.map(text=>`<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`,{name:'word/document.xml'})
  await zip.finalize();await complete;return Buffer.concat(chunks)
}
