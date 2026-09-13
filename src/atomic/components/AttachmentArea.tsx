import { useId, useRef, useState, type ReactNode } from 'react'
import { Inline, Stack, Surface, Text } from '../atoms'
import { Button } from './Button'
import './attachment-area.css'
export type AttachmentAreaProps = { label:string; children:ReactNode; actions?:ReactNode; onFiles?:(files:File[])=>void; disabled?:boolean; accept?:string; maxSize?:number }
export function AttachmentArea({label,children,actions,onFiles,disabled,accept='.txt,.md,.pdf,.docx',maxSize=10*1024*1024}:AttachmentAreaProps){
 const id=useId(),input=useRef<HTMLInputElement>(null),[dragging,setDragging]=useState(false),[error,setError]=useState('')
 function receive(files:File[]){
  if(disabled||!onFiles)return
  const invalid=files.find(file=>file.size>maxSize||!accept.split(',').some(rule=>{const type=rule.trim().toLowerCase();return type.startsWith('.')?file.name.toLowerCase().endsWith(type):type.endsWith('/*')?file.type.startsWith(type.slice(0,-1)):file.type===type}))
  if(invalid){setError(invalid.name+' is too large or has an unsupported file type.');return}
  setError('');if(files.length)onFiles(files)
 }
 return <Surface padding={4} role="group" aria-label={label} className="c-attachment-area" data-dragging={dragging||undefined} onDragOver={e=>{e.preventDefault();if(onFiles&&!disabled)setDragging(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragging(false)}} onDrop={e=>{e.preventDefault();setDragging(false);receive(Array.from(e.dataTransfer.files))}}>
 <Stack gap={3}>{children}<Inline className="c-attachment-area__toolbar">{onFiles&&<><input ref={input} id={id} className="c-attachment-area__picker" aria-label="Attach files" type="file" multiple accept={accept} disabled={disabled} tabIndex={-1} onChange={e=>{receive(Array.from(e.target.files??[]));e.target.value=''}}/><Button iconOnly variant="quiet" icon="Paperclip" aria-label="Attach files" disabled={disabled} onClick={()=>input.current?.click()}/></>}<Inline className="c-attachment-area__actions">{actions}</Inline></Inline>{error&&<Text role="alert" className="c-field-error" tone="inherit" variant="small">{error}</Text>}</Stack></Surface>
}
