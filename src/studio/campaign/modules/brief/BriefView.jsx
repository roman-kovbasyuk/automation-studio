import { useEffect, useRef, useState } from 'react'
import { PromptComposer } from '../../../../components/design-system/organisms/PromptComposer.jsx'
import { AsyncStatus } from '../../../../components/design-system/molecules/AsyncStatus.jsx'
import { AnalysisProgress } from './AnalysisProgress.jsx'
import { Button, SectionHeading } from '../../../primitives.jsx'
import {
  briefTitle,
  briefToText,
  combineBrief,
  MAX_BRIEF_CHARACTERS,
  readBriefFile,
} from '../../../briefInput.js'
import { MAX_BRIEF_UPLOAD_BYTES } from '../../../../../shared/briefUploadLimits.js'
import { MAX_BRIEF_SOURCES } from '../../../../../shared/briefingContracts.js'

export function BriefView({
  campaign,
  api,
  onSave,
  onGenerate,
  pending,
  readOnly = false,
  onDirty = () => {},
  analyzed = false,
  heading = true,
  inputKey = JSON.stringify(campaign?.brief ?? null),
  operationError,
  Composer = PromptComposer,
  composerProps = {},
  collectSources = false,
  submitBlockedReason = '',
  showSubmitBlockedReason = true,
  showMaterialsHint = true,
}) {
  const [message, setMessage] = useState(() => briefToText(campaign?.brief))
  const [files, setFiles] = useState([])
  const [dirty, setDirty] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [error, setError] = useState('')
  const extractingRef = useRef(false)
  const generation = useRef(0)
  const sourceKey = useRef(inputKey)
  useEffect(() => {
    generation.current++
    return () => {
      generation.current++
    }
  }, [campaign?.id])
  useEffect(() => {
    if (dirty) return
    setMessage(briefToText(campaign?.brief))
    setFiles([])
    sourceKey.current = inputKey
  }, [inputKey, dirty])
  const notes = collectSources ? message : combineBrief(message, files)
  const tooLong = notes.length > MAX_BRIEF_CHARACTERS
  const failedFiles = files.filter((file) => file.error)
  const readyFiles = files.filter((file) => !file.error)
  const hasSubmissionContent = Boolean(notes.trim() || (collectSources && readyFiles.length))
  function markDirty() {
    setDirty(true)
    onDirty(true)
  }
  async function attach(incoming) {
    if (extractingRef.current || submittingRef.current || pending || readOnly) return
    extractingRef.current = true
    setExtracting(true)
    setError('')
    const ticket = generation.current
    const selected = collectSources
      ? Array.from(incoming).slice(0, Math.max(0, MAX_BRIEF_SOURCES - files.length))
      : Array.from(incoming)
    if (collectSources && selected.length < incoming.length) setError(`You can add up to ${MAX_BRIEF_SOURCES} campaign materials.`)
    const selectedBytes = selected.reduce((total, file) => total + file.size, 0)
    const attachedBytes = files.reduce((total, file) => total + file.byteSize, 0)
    if (attachedBytes + selectedBytes > MAX_BRIEF_UPLOAD_BYTES) {
      if (ticket === generation.current) {
        setFiles((previous) => [...previous, ...selected.map((file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          byteSize: file.size,
          text: '',
          error: 'Campaign materials can total up to 25 MB. Remove a file and try again.',
        }))])
        markDirty()
      }
      extractingRef.current = false
      if (ticket === generation.current) setExtracting(false)
      return
    }
    try {
      const added = []
      for (const file of selected) {
        try {
          const source = await readBriefFile(file)
          let resolvedFile
          if (collectSources) resolvedFile = { id: crypto.randomUUID(), name: source.name, byteSize: file.size, mimeType: source.mimeType, data: source.data }
          else {
            const result = await api.extractBriefFile(source)
            if (!result.text?.trim()) throw new Error('This file has no readable text. Paste the brief instead.')
            resolvedFile = { id: crypto.randomUUID(), name: file.name, byteSize: file.size, text: result.text }
          }
          if (!collectSources && combineBrief(message, [...files, ...added, resolvedFile]).length > MAX_BRIEF_CHARACTERS)
            throw new Error('The combined brief exceeds 20,000 characters. Shorten the text or attach a shorter document.')
          added.push(resolvedFile)
        } catch (failure) {
          added.push({
            id: crypto.randomUUID(),
            name: file.name,
            byteSize: file.size,
            text: '',
            error: failure.message,
          })
        }
      }
      if (ticket === generation.current) {
        setFiles((previous) => [...previous, ...added])
        markDirty()
      }
    } catch (failure) {
      if (ticket === generation.current) setError(failure.message)
    } finally {
      extractingRef.current = false
      if (ticket === generation.current) setExtracting(false)
    }
  }
  async function submit() {
    if (!hasSubmissionContent || tooLong || failedFiles.length || pending || extracting || readOnly || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    const input = {
      title: campaign?.title ?? briefTitle(message || files[0]?.text || notes),
      brief: { notes },
      ...(collectSources ? { sources: readyFiles.map(({ id, name, mimeType, data }) => ({ id, kind: 'file', name, mimeType, data })) } : {}),
    }
    try {
      const result = campaign && onGenerate
        ? await onGenerate(dirty ? input : undefined, { expectedInputKey: sourceKey.current })
        : await onSave(input)
      if (result?.ok === false && !result.silent) setError(result.message)
      if (result?.ok || result?.briefSaved) {
        setDirty(false)
        onDirty(false)
        setFiles([])
        setMessage(notes)
      }
    } catch (failure) {
      setError(failure.message)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }
  return (
    <section className="bs-brief" data-analyzed={analyzed ? 'true' : 'false'}>
      {heading && <SectionHeading as={campaign ? 'h2' : 'h1'} title={campaign ? 'Brief' : 'Describe your task...'} />}
      {(pending || submitting) && (collectSources && pending !== 'save' ? <AnalysisProgress />
        : <AsyncStatus>{pending === 'save' ? 'Saving your brief…' : 'Analyzing your brief and preparing the first drafts…'}</AsyncStatus>)}
      {showSubmitBlockedReason && submitBlockedReason && <p className="bs-info" role="alert">{submitBlockedReason}</p>}
      <Composer
        value={message}
        onChange={(value) => {
          setMessage(value)
          markDirty()
        }}
        files={files}
        onAttach={attach}
        onRemove={(id) => {
          setFiles((previous) => previous.filter((file) => file.id !== id))
          markDirty()
        }}
        onSubmit={submit}
        compact={analyzed}
        iconOnlySubmit
        readOnly={readOnly}
        disabled={Boolean(pending) || submitting}
        busy={extracting || submitting || Boolean(pending)}
        canSubmit={hasSubmissionContent && !tooLong && !failedFiles.length && !submitBlockedReason}
        submitLabel="Analyze brief"
        placeholder={analyzed ? 'Add more context…' : 'Paste your idea or attach a brief. AI will use the context to write five banner options.'}
        hint={campaign ? '' : readOnly ? 'This brief is read-only.' : ''}
        {...composerProps}
        accept=""
        formatLabel=""
      />
      {showMaterialsHint && <p className="bs-note">Add your campaign materials. Up to 25 MB in total.</p>}
      {failedFiles.length > 0 && (
        <div role="alert" aria-label="Files that need attention">
          <ul>
            {failedFiles.map((file) => (
              <li key={file.id}>
                {file.name}: {file.error}
              </li>
            ))}
          </ul>
        </div>
      )}
      {dirty && sourceKey.current !== inputKey && <div className="bs-info"><p>The saved brief changed. Your draft is kept here; reload the saved brief before submitting again.</p>
        <Button onClick={() => { setDirty(false); onDirty(false); setError('') }}>Reload saved brief</Button></div>}
      {extracting && (
        <p className="bs-note" role="status">
          Reading your brief…
        </p>
      )}
      {(error || operationError || tooLong) && (
        <p className="bs-brief-error" role="alert">
          {error || operationError?.message ||
            'The combined brief exceeds 20,000 characters. Shorten it before continuing.'}
        </p>
      )}
    </section>
  )
}
