import { useId, useRef, useState } from 'react'
import { Icon, Inline, Stack, Surface, Text } from '../atoms'
import { Button } from './Button'
import './files.css'
import { ProgressBar } from './ProgressBar'
export type FileDropzoneProps = { label: string; onFiles: (files: File[]) => void; accept?: string; multiple?: boolean; maxSize?: number; disabled?: boolean; state?: 'idle' | 'uploading' | 'success' | 'error'; progress?: number; error?: string; onRetry?: () => void }
export function FileDropzone({ label, onFiles, accept, multiple = false, maxSize = 10 * 1024 * 1024, disabled, state = 'idle', progress = 0, error: externalError, onRetry }: FileDropzoneProps) {
  const id = useId(), [error, setError] = useState(''), [dragging, setDragging] = useState(false), input = useRef<HTMLInputElement>(null)
  const blocked = disabled || state === 'uploading', message = externalError || error
  const receive = (files: File[]) => {
    if (blocked) return
    const invalid = files.find(file => file.size > maxSize || accept && !accept.split(',').some(rule => { const type = rule.trim().toLowerCase(); return type.startsWith('.') ? file.name.toLowerCase().endsWith(type) : type.endsWith('/*') ? file.type.startsWith(type.slice(0, -1)) : file.type === type }))
    if (invalid) { setError(`${invalid.name} exceeds the size limit or has an unsupported file type.`); return }
    if (!multiple && files.length > 1) { setError('Choose one file.'); return }
    setError(''); if (files.length) onFiles(files)
  }
  return <Surface padding={6} radius="small" className="c-file-dropzone" data-state={dragging ? 'dragging' : state} aria-disabled={blocked || undefined} onDragEnter={event => { event.preventDefault(); if(!blocked)setDragging(true) }} onDragLeave={event => { if(!event.currentTarget.contains(event.relatedTarget as Node))setDragging(false) }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); setDragging(false); receive(Array.from(event.dataTransfer.files)) }}><Stack gap={3}><Icon name="upload" /><label htmlFor={id}><Text as="span" variant="h6">{label}</Text></label><Text variant="small" tone="secondary">Choose {multiple ? 'files' : 'a file'} or drop {multiple ? 'them' : 'it'} here. Maximum {Math.round(maxSize / 1024 / 1024)} MB per file.</Text><input ref={input} className="c-file-dropzone__input" tabIndex={-1} id={id} type="file" accept={accept} multiple={multiple} disabled={blocked} aria-describedby={message ? `${id}-error` : undefined} onChange={event => { receive(Array.from(event.target.files ?? [])); event.target.value = '' }} /><Inline><Button icon="upload" disabled={blocked} onClick={()=>input.current?.click()}>Choose files</Button>{state==='error' && onRetry && <Button onClick={onRetry} disabled={blocked}>Retry upload</Button>}</Inline>{state==='uploading' && <ProgressBar label="Uploading files" value={progress} />}{state==='success' && <Text variant="small" role="status">Files uploaded.</Text>}{message && <Text id={`${id}-error`} tone="inherit" className="c-field-error" variant="small" role="alert">{message}</Text>}</Stack></Surface>
}
export type FileItem = { id: string; name: string; size?: number }
export type FileListProps = { files: readonly FileItem[]; onRemove?: (id: string) => void; disabled?: boolean }
export function FileList({ files, onRemove, disabled }: FileListProps) { return <ul className="c-file-list" aria-label="Files">{files.map(file => <li key={file.id}><Inline gap={3}><Icon name="file" /><Stack gap={1} className="c-file-list__copy"><Text variant="h7">{file.name}</Text>{file.size !== undefined && <Text variant="small" tone="secondary">{Math.ceil(file.size / 1024)} KB</Text>}</Stack>{onRemove && <Button iconOnly size="compact" icon="close" aria-label={`Remove ${file.name}`} disabled={disabled} onClick={() => onRemove(file.id)} />}</Inline></li>)}</ul> }
