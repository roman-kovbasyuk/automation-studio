import { TagInput } from 'brutalist-design-system'
import { MAX_VISUAL_TAG_LENGTH, MAX_VISUAL_TAGS } from '../../../../../shared/briefingContracts.js'
import { SuggestedBadge } from './SuggestedBadge.jsx'

/** Keywords that, with the brief and copy, shape the image prompts. */
export function VisualContextStep({ draft, suggested, disabled, onChange }) {
  const full = draft.visualTags.length >= MAX_VISUAL_TAGS
  return <TagInput label="Keywords" value={draft.visualTags} onChange={visualTags => onChange({ visualTags }, 'visualTags')}
    disabled={disabled} maxItems={MAX_VISUAL_TAGS} maxLength={MAX_VISUAL_TAG_LENGTH}
    placeholder="Images are based on these keywords, your brief and your copy."
    instructions={suggested.has('visualTags') ? <SuggestedBadge /> : undefined}
    error={full ? `Up to ${MAX_VISUAL_TAGS} keywords. Remove one to add another.` : undefined} />
}
