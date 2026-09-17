import { Alert, AttachmentArea, Button, Form, Tag, TextArea, type FileItem } from '../components'
import { Inline, Text } from '../atoms'
export type PromptInputProps = { value:string;onChange:(value:string)=>void;onSubmit:()=>void;files?:readonly FileItem[];onAttach?:(files:File[])=>void;onRemove?:(id:string)=>void;disabled?:boolean;readOnly?:boolean;busy?:boolean;error?:string;label?:string;placeholder?:string;accept?:string }
export function PromptInput({value,onChange,onSubmit,files=[],onAttach,onRemove,disabled,readOnly,busy,error,label='Prompt',placeholder='Describe what you want to create…',accept}:PromptInputProps){
 const locked=disabled||readOnly||busy,canSubmit=!!value.trim()&&!locked
 const submit=()=>{if(canSubmit)onSubmit()}
 return <Form label="AI prompt input" aria-busy={busy||undefined} onSubmit={e=>{e.preventDefault();submit()}}>
 <AttachmentArea label="Prompt attachments" onFiles={readOnly?undefined:onAttach} disabled={locked} accept={accept} actions={!readOnly&&<Button type="submit" variant="primary" icon="arrowUp" iconOnly aria-label="Send prompt" busy={busy} disabled={!canSubmit}/>}>
 {!!files.length&&<Inline>{files.map(file=>onRemove&&!locked?<Tag key={file.id} icon="Paperclip" onRemove={()=>onRemove(file.id)} removeLabel={'Remove '+file.name}>{file.name}</Tag>:<Tag key={file.id} icon="Paperclip">{file.name}</Tag>)}</Inline>}
 <TextArea label={label} hideLabel embedded rows={5} value={value} placeholder={placeholder} disabled={disabled||busy} readOnly={readOnly} onChange={e=>onChange(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!e.nativeEvent.isComposing){e.preventDefault();submit()}}}/>
 </AttachmentArea>
 {error&&<Alert tone="danger" title="Could not send prompt" description={error}/>}
 </Form>
}
