import { Stack, Text, TextArea, TextField } from 'brutalist-design-system'
import { AppButton } from "../../../../components/design-system/compatibility.jsx"
import { useState } from 'react'
import { briefAnswersConfirmedSchema } from '../../../../../shared/briefingContracts.js'
import { BriefQuestionsView } from './BriefQuestionsView.jsx'

const confirmationLabels = {
  summary: 'Summary',
  audience: 'Audience',
  copyMode: 'Copy mode',
  reach: 'Campaign reach',
  goal: 'Campaign goal',
  goalCustom: 'Campaign goal details',
}

function formatFields(fields) {
  if (fields.length < 2) return fields[0]
  return `${fields.slice(0, -1).join(', ')}, and ${fields.at(-1)}`
}

/** @param {{draft:import('./BriefQuestionsView.jsx').BriefDraft,foundCopy:Array,sources:Array,disabled:boolean,error:string,confirmed:boolean,onChange:(nextDraft:object)=>void,onConfirm:()=>void,onOpenSource:(sourceId:string)=>void}} props */
export function ReviewedBriefView({ draft, foundCopy, sources, disabled, error, confirmed, onChange, onConfirm, onOpenSource }) {
  const [confirmationAttempted, setConfirmationAttempted] = useState(false)
  const validation = briefAnswersConfirmedSchema.safeParse(draft)
  const missingFields = validation.success ? [] : [...new Set(validation.error.issues.map(issue => confirmationLabels[issue.path[0]]).filter(Boolean))]
  const update = patch => onChange({ ...draft, ...patch })
  const confirm = () => {
    if (disabled) return
    setConfirmationAttempted(true)
    if (validation.success) onConfirm()
  }

  return <Stack gap={6}>
    <Text tone="secondary">Review the brief before generating copy or visuals.</Text>
    <Stack gap={4}>
      <TextArea label="Summary" value={draft.summary} maxLength={1000} disabled={disabled}
        onChange={event => update({ summary: event.target.value })} />
      <TextField label="Audience" value={draft.audience} maxLength={500} disabled={disabled}
        onChange={event => update({ audience: event.target.value })} />
    </Stack>
    <BriefQuestionsView draft={draft} foundCopy={foundCopy} sources={sources} disabled={disabled}
      onChange={onChange} onOpenSource={onOpenSource} />
    {confirmationAttempted && missingFields.length > 0 && <p role="alert">Complete {formatFields(missingFields)} before confirming.</p>}
    {error && <p role="alert">{error}</p>}
    <AppButton type="button" disabled={disabled} onClick={confirm}>{confirmed ? 'Save changes' : 'Confirm brief'}</AppButton>
  </Stack>
}
