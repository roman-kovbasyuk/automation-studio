import { AppButton, Dialog } from "../../../../components/design-system/compatibility.jsx"
import { forwardRef, useImperativeHandle, useState } from 'react'

const statusLabel = {
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Needs attention',
}

/** @param {{sources:Array<{id:string,name:string,status:'processing'|'ready'|'failed',errorCode?:string}>, disabled:boolean, actions:{getSource:(sourceId:string)=>Promise<{source:{id:string,name:string},blocks:Array<{id:string,text:string,page?:number}>}>,retrySource:(sourceId:string)=>Promise<{ok:boolean,message?:string}>,removeSource:(sourceId:string)=>Promise<{ok:boolean,message?:string}>}}} props */
export const BriefSourcesView = forwardRef(function BriefSourcesView({ sources, disabled, actions }, ref) {
  const [preview, setPreview] = useState(null)
  const [previewError, setPreviewError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [writePending, setWritePending] = useState(false)
  const [actionError, setActionError] = useState('')

  async function openSource(sourceId) {
    const selected = sources.find(source => source.id === sourceId) ?? (sourceId==='campaign-input'?{id:sourceId,name:'Campaign input'}:null)
    if (!selected || previewLoading) return
    setPreview({ source: { id: selected.id, name: selected.name }, blocks: [] })
    setPreviewError('')
    setPreviewLoading(true)
    try {
      const result = await actions.getSource(sourceId)
      setPreview(result)
    } catch (failure) {
      setPreviewError(failure.message || 'Unable to preview this source.')
    } finally {
      setPreviewLoading(false)
    }
  }

  useImperativeHandle(ref, () => ({ openSource }))

  async function write(action, sourceId) {
    if (disabled || writePending) return
    setWritePending(true)
    setActionError('')
    try {
      const result = await actions[action](sourceId)
      if (!result?.ok) setActionError(result?.message || 'Unable to update this source.')
    } catch (failure) {
      setActionError(failure.message || 'Unable to update this source.')
    } finally {
      setWritePending(false)
    }
  }

  return <section aria-label="Campaign sources">
    <h3>Campaign sources</h3>
    {sources.length === 0 ? <p>No campaign sources attached.</p> : <ul>
      {sources.map(source => <li key={source.id}>
        <p>{source.name} — {statusLabel[source.status] || source.status}</p>
        {source.errorCode && <p>{source.errorCode}</p>}
        <AppButton type="button" disabled={previewLoading} onClick={() => openSource(source.id)}>Preview {source.name}</AppButton>
        {(source.status === 'failed' || source.status === 'processing') && <AppButton type="button" disabled={disabled || writePending} onClick={() => write('retrySource', source.id)}>Retry {source.name}</AppButton>}
        <AppButton type="button" disabled={disabled || writePending} onClick={() => write('removeSource', source.id)}>Remove {source.name}</AppButton>
      </li>)}
    </ul>}
    {actionError && <p role="alert">{actionError}</p>}
    <Dialog open={Boolean(preview)} onOpenChange={nextOpen => { if (!nextOpen) setPreview(null) }} title={preview?.source.name || 'Source preview'}>
      {previewLoading && <p role="status">Loading source preview…</p>}
      {previewError && <p role="alert">{previewError}</p>}
      {!previewLoading && !previewError && preview && (preview.blocks.length > 0
        ? <div>{preview.blocks.map(block => <section key={block.id}><p>{block.page ? `Page ${block.page}` : 'Extracted text'}</p><p>{block.text}</p></section>)}</div>
        : <p>This source is analyzed visually. You can still view found wording in the existing found-copy dialog.</p>) }
    </Dialog>
  </section>
})
