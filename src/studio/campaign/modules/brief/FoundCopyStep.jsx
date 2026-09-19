import { Button, Inline, RadioGroup, Stack, Text, TextAction } from 'brutalist-design-system'
import { useState } from 'react'
import { COPY_OPTIONS } from './briefReviewModel.js'
import { FoundCopyDialog } from './FoundCopyDialog.jsx'
import { SuggestedBadge } from './SuggestedBadge.jsx'

const PREVIEW_LIMIT = 3

function FoundCopyPreview({ candidate, onOpenSource }) {
  const { headline, body, offer, cta } = candidate.fields
  const [first] = candidate.sourceRefs
  const otherSources = new Set(candidate.sourceRefs.map(ref => ref.sourceId)).size - 1
  return <Stack gap={2}>
    {headline && <Text variant="h6">{headline}</Text>}
    {body && <Text>{body}</Text>}
    {offer && <Text variant="small">{offer}</Text>}
    {cta && <Text variant="small">Call to action: {cta}</Text>}
    <Inline gap={3}>
      <TextAction onClick={() => onOpenSource(first.sourceId)}>From {first.label}{otherSources > 0 ? ` and ${otherSources} more` : ''}</TextAction>
      {candidate.verification === 'needs_review' && <Text variant="small" tone="secondary">Check this wording</Text>}
    </Inline>
  </Stack>
}

/** Found copy is always kept; the question is whether to also write new options. */
export function FoundCopyStep({ draft, foundCopy, errors, suggested, disabled, onChange, onOpenSource }) {
  const [allOpen, setAllOpen] = useState(false)
  return <Stack gap={6}>
    <ul className="bs-found-copy-list" aria-label="Found copy">
      {foundCopy.slice(0, PREVIEW_LIMIT).map(candidate => <li key={candidate.id}><FoundCopyPreview candidate={candidate} onOpenSource={onOpenSource} /></li>)}
    </ul>
    {foundCopy.length > PREVIEW_LIMIT && <FoundCopyDialog open={allOpen} foundCopy={foundCopy} onClose={() => setAllOpen(false)} onOpenSource={onOpenSource}
      trigger={<Button size="compact" onClick={() => setAllOpen(true)}>Show all ({foundCopy.length})</Button>} />}
    <RadioGroup variant="tags" name="copy-mode" label="Also write new copy options?" options={COPY_OPTIONS} value={draft.copyMode ?? undefined}
      instructions={suggested.has('copyMode') ? <SuggestedBadge /> : undefined} error={errors.copyMode} disabled={disabled}
      onChange={copyMode => onChange({ copyMode }, 'copyMode')} />
  </Stack>
}
