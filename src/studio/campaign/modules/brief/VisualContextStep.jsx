import { Inline, Stack, Tag, Text, TextField } from 'brutalist-design-system'
import { useState } from 'react'
import { MAX_VISUAL_TAG_LENGTH, MAX_VISUAL_TAGS, normalizeVisualTag } from '../../../../../shared/briefingContracts.js'
import { SuggestedBadge } from './SuggestedBadge.jsx'

/** Step 3: keywords that, with the brief and copy, shape the image prompts. */
export function VisualContextStep({ draft, suggested, disabled, onChange }) {
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')
  const full = draft.visualTags.length >= MAX_VISUAL_TAGS
  const setTags = visualTags => onChange({ visualTags }, 'visualTags')
  const add = event => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    const keyword = normalizeVisualTag(input)
    if (!keyword.label) return
    if (keyword.label.length > MAX_VISUAL_TAG_LENGTH) return setMessage(`Keep keywords to ${MAX_VISUAL_TAG_LENGTH} characters or fewer.`)
    setInput('')
    setMessage('')
    if (!draft.visualTags.some(tag => normalizeVisualTag(tag).key === keyword.key)) setTags([...draft.visualTags, keyword.label])
  }
  return <Stack gap={4}>
    <Inline gap={2}><Text as="span" variant="h7">Keywords</Text>{suggested.has('visualTags') && <SuggestedBadge />}</Inline>
    {draft.visualTags.length > 0 && <ul className="bs-brief-keywords" aria-label="Keywords">
      {draft.visualTags.map(tag => <li key={tag}>{disabled ? <Tag>{tag}</Tag>
        : <Tag onRemove={() => setTags(draft.visualTags.filter(item => item !== tag))} removeLabel={`Remove ${tag}`}>{tag}</Tag>}</li>)}
    </ul>}
    <TextField label="Add a keyword" value={input} disabled={disabled || full} error={message}
      instructions={full ? `Up to ${MAX_VISUAL_TAGS} keywords. Remove one to add another.` : 'Press Enter to add.'}
      onChange={event => { setInput(event.target.value); setMessage('') }} onKeyDown={add} />
    <Text tone="secondary">Images are based on these keywords, your brief and your copy.</Text>
  </Stack>
}
