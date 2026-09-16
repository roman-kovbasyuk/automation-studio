import {expect,test} from 'vitest'
import {readBriefFile,combineBrief} from './briefInput.js'

test.each([['context.custom',''],['brief','application/octet-stream'],['brief.pdf',''],['table.csv','text/csv'],['context.json','application/json']])
  ('reads %s without an extension allowlist',async(name,type)=>{
    const result=await readBriefFile(new File(['Campaign context'],name,{type}))
    expect(result).toEqual({name,mimeType:type||'application/octet-stream',data:'Q2FtcGFpZ24gY29udGV4dA=='})
  })
test('permits a file above the old five-megabyte ceiling',async()=>{
  const file=new File(['Campaign context'],'brief.txt',{type:'text/plain'})
  Object.defineProperty(file,'size',{value:6*1024*1024})
  expect((await readBriefFile(file)).name).toBe('brief.txt')
})
test('rejects a file above the total campaign budget before reading',async()=>{
  const file=new File(['context'],'brief',{type:''})
  Object.defineProperty(file,'size',{value:25*1024*1024+1})
  await expect(readBriefFile(file)).rejects.toThrow(/25 MB/)
})
test('failed attachment text cannot enter the campaign prompt',()=>{
  expect(combineBrief('My brief',[{name:'good.csv',text:'Audience: students'},
    {name:'bad.file',text:'unverified text',error:'Cannot read'}])).toBe('My brief\n\nAttached brief: good.csv\nAudience: students')
})
