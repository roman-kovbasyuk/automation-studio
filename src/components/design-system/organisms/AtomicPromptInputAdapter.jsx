import { PromptInput } from 'brutalist-design-system'

/**
 * Application adapter for the published PromptInput organism.
 *
 * PromptInput owns the rendered Atomic surface. The adapter only prevents a
 * submit callback when the surrounding workflow is not ready.
 */
export function AtomicPromptInputAdapter({
  canSubmit = true,
  onSubmit,
  accept,
  value = '',
  files = [],
  onChange,
  ...props
}) {
  // PromptInput enables its submit action from text only. Keep the existing
  // file-only brief flow working with an invisible value sentinel; the brief
  // state remains empty and is never submitted as prompt content.
  const fileOnlySentinel = '\u200b'
  const displayValue = !value && files.length > 0 && canSubmit ? fileOnlySentinel : value
  return (
    <PromptInput
      {...props}
      value={displayValue}
      onChange={(next) => onChange?.(next.startsWith(fileOnlySentinel) ? next.slice(fileOnlySentinel.length) : next)}
      files={files}
      accept={accept || '.txt,.md,.markdown,.pdf,.docx'}
      onSubmit={() => {
        if (canSubmit) onSubmit?.()
      }}
    />
  )
}
