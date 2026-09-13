import { useEffect, useState } from 'react'
import { FileDropzone, FileList, Select, Toggle, type FileItem } from '../components'
import { Inline, Text } from '../atoms'
import { CatalogSection } from './CatalogSection'
import { CatalogFilters } from './CatalogFilters'
const example = [{id:'brief',name:'campaign-brief.pdf',size:24576},{id:'image',name:'hero-image.png',size:98304}]
export function UploadExample(){
 const [state,setState]=useState<'idle'|'uploading'|'success'|'error'>('idle'),[progress,setProgress]=useState(0),[disabled,setDisabled]=useState(false),[fail,setFail]=useState(false),[files,setFiles]=useState<FileItem[]>([])
 useEffect(()=>{if(state!=='uploading')return;const timer=setInterval(()=>setProgress(v=>Math.min(100,v+20)),250);return ()=>clearInterval(timer)},[state])
 useEffect(()=>{if(state==='uploading'&&progress===100)setState(fail?'error':'success')},[progress,state,fail])
 const start=()=>{setProgress(0);setState('uploading')}
 return <CatalogSection id="component-file-dropzone" title="File dropzone" filters={<CatalogFilters label="Upload"><Toggle label="Disabled" checked={disabled} onChange={e=>setDisabled(e.target.checked)}/><Toggle label="Simulate upload failure" checked={fail} onChange={e=>setFail(e.target.checked)}/><Select label="Preview state" value={state} onValueChange={v=>{setFiles(v==='idle'?[]:example);if(v==='uploading')start();else setState(v as typeof state)}} options={[{value:'idle',label:'Ready to upload'},{value:'uploading',label:'Uploading'},{value:'success',label:'Uploaded'},{value:'error',label:'Error'}]}/></CatalogFilters>}>
 <FileDropzone label="Upload campaign assets" multiple accept=".png,.jpg,.pdf" disabled={disabled} state={state} progress={progress} error={state==='error'?'Upload failed. Retry or remove these files.':undefined} onRetry={start} onFiles={items=>{setFiles(items.map((file,i)=>({id:`${file.name}-${i}`,name:file.name,size:file.size})));start()}}/>
 {!!files.length&&<FileList files={files} disabled={disabled||state==='uploading'} onRemove={id=>{const remaining=files.filter(file=>file.id!==id);setFiles(remaining);if(!remaining.length)setState('idle')}}/>}
 <Text variant="small" tone="secondary">Demo uploads are simulated locally; no files are sent to a server. PNG, JPG or PDF, up to 10 MB.</Text>
 </CatalogSection>
}
