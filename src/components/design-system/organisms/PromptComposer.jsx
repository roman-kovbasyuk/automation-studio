import { useId, useRef, useState } from 'react'
import { ArrowUp, Paperclip, X } from 'lucide-react'
import { Surface, TextArea } from 'brutalist-design-system'
import { AppButton } from "../compatibility.jsx"
import './prompt-composer.css'

/** App-owned prompt behavior composed from public design-system primitives. */
export function PromptComposer({
  value,
  onChange,
  files = [],
  onAttach,
  onRemove,
  onSubmit,
  disabled = false,
  readOnly = false,
  busy = false,
  canSubmit = false,
  submitLabel = 'Send prompt',
  label = 'Campaign description',
  formLabel = 'Campaign brief composer',
  rows = 7,
  maxLength,
  compact = false,
  iconOnlySubmit = false,
  showSubmit = true,
  hint,
  placeholder = 'Describe what you’re promoting, or drop your campaign brief here…',
  accept = '.txt,.md,.markdown,.pdf,.docx',
  formatLabel = 'TXT, MD, PDF, DOCX',
  attachmentsLabel = 'Brief attachments',
  fileInputLabel = 'Brief files',
  attachLabel = 'Attach brief files',
  attachIcon: AttachIcon = Paperclip,
  toolbarStart,
  className = '',
}) {
  const id = useId()
  const picker = useRef(null)
  const [dragging, setDragging] = useState(false)
  const locked = disabled || readOnly || busy
  function submit(event) {
    event?.preventDefault()
    if (!locked && canSubmit) onSubmit()
  }
  return (
    <form
      className={`bs-ds-prompt ${className}`.trim()}
      data-compact={compact || undefined}
      aria-label={formLabel}
      aria-busy={busy || undefined}
      onSubmit={submit}
    >
      <Surface><div
        className="bs-ds-prompt__surface"
        data-dragging={dragging}
        onDragOver={(event) => {
          event.preventDefault()
          if (!locked) setDragging(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!locked) onAttach?.(event.dataTransfer.files)
        }}
      >
        {files.length > 0 && (
          <ul className="bs-ds-prompt__attachments" aria-label={attachmentsLabel}>
            {files.map((file) => (
              <li key={file.id}>
                <Paperclip size={16} aria-hidden="true" />
                <span>{file.name ?? file.label}</span>
                <AppButton
                  type="button"
                  variant="quiet" size="compact" iconOnly
                  aria-label={`Remove ${file.name ?? file.label}`}
                  disabled={locked}
                  onClick={() => onRemove(file.id)}
                >
                  <X size={16} aria-hidden="true" />
                </AppButton>
              </li>
            ))}
          </ul>
        )}
        <TextArea
          label={label}
          instructions={hint}
          id={id}
          value={value}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled || busy}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              (event.metaKey || event.ctrlKey) &&
              !event.nativeEvent.isComposing
            )
              submit(event)
          }}
        />
        {!readOnly && (
          <div className="bs-ds-prompt__toolbar">
            {onAttach && <><input
              ref={picker}
              className="sr-only"
              tabIndex={-1}
              aria-label={fileInputLabel}
              type="file"
              accept={accept}
              multiple
              disabled={locked}
              onChange={(event) => {
                onAttach?.(event.target.files)
                event.target.value = ''
              }}
            />
            <AppButton
              type="button"
              variant="quiet" size="compact" iconOnly
              aria-label={attachLabel}
              disabled={locked}
              onClick={() => picker.current?.click()}
            >
              <AttachIcon size={20} aria-hidden="true" />
            </AppButton>
            </>}
            {toolbarStart}
            {onAttach && formatLabel && <span className="bs-prompt-formats">{formatLabel}</span>}
            {showSubmit && <span className="bs-ds-prompt__send"><AppButton
              type="submit"
              variant="primary"
              disabled={locked || !canSubmit}
              busy={busy}
              iconOnly={iconOnlySubmit}
              aria-label={iconOnlySubmit ? submitLabel : undefined}
            >
              {!iconOnlySubmit && (busy ? 'Working…' : submitLabel)}
              <ArrowUp size={17} aria-hidden="true" />
            </AppButton></span>}
          </div>
        )}
      </div></Surface>
    </form>
  )
}
