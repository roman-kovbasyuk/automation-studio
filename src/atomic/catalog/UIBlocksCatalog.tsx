import { useState } from 'react'
import { Heading, Stack, Text } from '../atoms'
import { Button, NavigationList, AttachmentArea, TextArea, Toggle, type FileItem } from '../components'
import { SidebarPanel } from '../ui-blocks/SidebarPanel'
import { PromptInput } from '../ui-blocks/PromptInput'
import { CodeExample } from '../ui-blocks/CodeExample'
import { CatalogSection as Section } from './CatalogSection'
import { CatalogFilters } from './CatalogFilters'
export const uiBlockSections=[['block-sidebar','Sidebar panel'],['block-prompt-input','AI prompt input'],['block-code-example','Code example']] as const
export function UIBlocksCatalog(){
 const [projects,setProjects]=useState([{id:'oslo',title:'Oslo launch',href:'#block-sidebar',pinned:true},{id:'nordic',title:'Nordic spring campaign',href:'#block-sidebar',pinned:false}])
 const [notice,setNotice]=useState(''),[value,setValue]=useState(''),[files,setFiles]=useState<FileItem[]>([]),[busy,setBusy]=useState(false),[disabled,setDisabled]=useState(false),[readOnly,setReadOnly]=useState(false),[fail,setFail]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState('')
 async function send(){setBusy(true);setError('');await new Promise(resolve=>setTimeout(resolve,700));setBusy(false);if(fail)setError('Demo request failed. Your draft is preserved; turn off simulated failure and send again.');else setSent(value)}
 return <>
 <Section id="component-navigation-list" title="Navigation list"><NavigationList label="Example navigation" items={[{id:'overview',label:'Overview',href:'#component-navigation-list',icon:'LayoutDashboard',current:true},{id:'settings',label:'Settings',href:'#component-navigation-list',icon:'settings'}]}/></Section>
 <Section id="component-attachment-area" title="Attachment area"><AttachmentArea label="Example attachments" onFiles={items=>setNotice(items.map(f=>f.name).join(', '))}><TextArea label="Attachment note" placeholder="Drop a file or add a note" embedded /></AttachmentArea></Section>
 <Heading level={2} variant="h2">UI blocks</Heading>
 <Section id="block-sidebar" title="Sidebar panel">
 <SidebarPanel brand={{label:'Studio'}} primaryAction={{label:'New campaign',onClick:()=>setProjects(p=>[...p,{id:String(Date.now()),title:'Untitled campaign',href:'#block-sidebar',pinned:false}])}} navigation={[{id:'campaigns',label:'Campaigns',href:'#block-sidebar',icon:'folder',current:true},{id:'settings',label:'Settings',href:'#block-sidebar',icon:'settings'}]} projects={projects.map(p=>({...p,actions:[{id:'pin',label:p.pinned?'Unpin':'Pin',icon:'Pin'},{id:'duplicate',label:'Duplicate',icon:'copy'},{id:'delete',label:'Delete',icon:'delete',danger:true}]}))} onProjectAction={(id,action)=>setProjects(p=>action==='delete'?p.filter(x=>x.id!==id):action==='pin'?p.map(x=>x.id===id?{...x,pinned:!x.pinned}:x):[...p,...p.filter(x=>x.id===id).map(x=>({...x,id:String(Date.now()),title:x.title+' copy'}))])} account={{label:'Demo workspace',actions:[{id:'settings',label:'Settings',icon:'settings'},{id:'help',label:'Help',icon:'info'},{id:'signout',label:'Sign out',icon:'LogOut'}],onAction:id=>setNotice('Demo account action: '+id)}}/>
 {notice&&<Text role="status" variant="small">{notice}</Text>}
 </Section>
 <Section id="block-prompt-input" title="AI prompt input" filters={<CatalogFilters label="AI prompt input"><Toggle label="Disabled" checked={disabled} onChange={e=>setDisabled(e.target.checked)}/><Toggle label="Read only" checked={readOnly} onChange={e=>setReadOnly(e.target.checked)}/><Toggle label="Simulate failure" checked={fail} onChange={e=>setFail(e.target.checked)}/></CatalogFilters>}>
 <PromptInput value={value} onChange={setValue} onSubmit={send} files={files} onAttach={items=>setFiles(old=>[...old,...items.map((f,i)=>({id:f.name+'-'+Date.now()+'-'+i,name:f.name,size:f.size}))])} onRemove={id=>setFiles(f=>f.filter(x=>x.id!==id))} busy={busy} disabled={disabled} readOnly={readOnly} error={error}/>
 <Text variant="small" tone="secondary">Ctrl/⌘ + Enter to send. TXT, MD, PDF or DOCX, up to 10 MB each. Demo only—nothing is uploaded or sent to AI.</Text>
 {sent&&<Text role="status">Demo received: {sent}</Text>}
 </Section>
 <Section id="block-code-example" title="Code example"><CodeExample title="Button usage" filename="Example.tsx" source={"import { Button } from 'brutalist-design-system'\n\nexport default function Example() {\n  return <Button variant=\"primary\">Save changes</Button>\n}"} preview={<Button variant="primary">Save changes</Button>} /></Section></>
}
