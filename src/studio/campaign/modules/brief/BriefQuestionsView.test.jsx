import { selectOption } from "../../../../test/selectOption.js"
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { MAX_VISUAL_TAG_LENGTH, MAX_VISUAL_TAGS } from '../../../../../shared/briefingContracts.js'
import { BriefQuestionsView } from './BriefQuestionsView.jsx'

export const baseDraft = Object.freeze({
  summary: 'A clear campaign idea.', audience: 'Commuters', copyMode: null,
  ageGroups: [], gender: 'all', reach: null, goal: null, goalCustom: '', visualTags: [],
})
export const foundCopy = Object.freeze([{ id: 'copy-1', fields: { headline: 'Travel lighter.', body: '', offer: '', cta: '' }, sourceRefs: [{ sourceId: 'source-1', label: 'campaign.pdf', blockId: 'page-2', page: 2 }], verification: 'text_verified' }])

function StatefulFixture({ initialDraft = baseDraft, copies = foundCopy, disabled = false, onChangeSpy = vi.fn(), onOpenSource = vi.fn() }) {
  const [draft, setDraft] = useState(initialDraft)
  return <BriefQuestionsView draft={draft} foundCopy={copies} sources={[]} disabled={disabled}
    onChange={nextDraft => { onChangeSpy(nextDraft); setDraft(nextDraft) }} onOpenSource={onOpenSource} />
}
function renderQuestions(overrides = {}) {
  const onChangeSpy = overrides.onChangeSpy ?? vi.fn()
  const onOpenSource = overrides.onOpenSource ?? vi.fn()
  return { onChangeSpy, onOpenSource, ...render(<StatefulFixture {...overrides} onChangeSpy={onChangeSpy} onOpenSource={onOpenSource} />) }
}

test('renders only the ordered briefing groups and approved banner copy prompt', () => {
  renderQuestions()
  const banner = screen.getByRole('group', { name: 'Banner copy' })
  const campaign = screen.getByRole('group', { name: 'Campaign' })
  const visual = screen.getByRole('group', { name: 'Visual context' })
  expect(banner.compareDocumentPosition(campaign) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(campaign.compareDocumentPosition(visual) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.getByText('We found wording in your documents that could work on your banners.')).toBeVisible()
  expect(screen.queryByLabelText(/location/i)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /back|continue/i })).not.toBeInTheDocument()
})

test('emits complete controlled draft changes for the approved campaign controls', async () => {
  const user = userEvent.setup()
  const { onChangeSpy } = renderQuestions()
  await user.click(screen.getByRole('radio', { name: /Keep original copy/ }))
  expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ copyMode: 'keep_original' }))
  await selectOption(screen.getByRole('combobox', { name: 'Campaign reach' }), 'national')
  expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ reach: 'national' }))
  await selectOption(screen.getByRole('combobox', { name: 'Campaign goal' }), 'other')
  expect(screen.getByRole('textbox', { name: 'Other campaign goal' })).toBeVisible()
  expect(screen.getAllByRole('radio', { name: /All|Women|Men/ })).toHaveLength(3)
  expect(screen.getAllByRole('checkbox')).toHaveLength(7)
})

test('disables unavailable original copy but keeps create-new available', () => {
  renderQuestions({ copies: [] })
  expect(screen.getByRole('radio', { name: /Keep original copy/ })).toBeDisabled()
  expect(screen.getByRole('radio', { name: /Create new copy/ })).toBeEnabled()
  expect(screen.getByText('No banner copy found in your materials.')).toBeVisible()
})

test('opens found copy from its controlled public Dialog trigger and restores focus after Escape', async () => {
  const user = userEvent.setup()
  renderQuestions()
  const trigger = screen.getByRole('button', { name: 'View found copy' })
  await user.click(trigger)
  expect(screen.getByRole('dialog', { name: 'Found copy' })).toBeVisible()
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
})

test('renders exactly seven initial tags and supports zero tags without a tag control', () => {
  const initialTags = Array.from({ length: 7 }, (_, index) => `source tag ${index + 1}`)
  const { unmount } = renderQuestions({ initialDraft: { ...baseDraft, visualTags: initialTags } })
  expect(initialTags.map(tag => screen.getByRole('button', { name: `Remove ${tag}` }))).toHaveLength(7)

  unmount()
  renderQuestions({ initialDraft: baseDraft })
  expect(screen.queryByRole('button', { name: 'source tag 1' })).not.toBeInTheDocument()
})

test('does not emit a draft change for a blank Enter', async () => {
  const user = userEvent.setup()
  const { onChangeSpy } = renderQuestions()
  await user.type(screen.getByRole('textbox', { name: 'Add visual keyword' }), '   {Enter}')
  expect(onChangeSpy).not.toHaveBeenCalled()
})

test('emits the exact age enums and exposes the approved goal option values and labels', async () => {
  const user = userEvent.setup()
  const { onChangeSpy } = renderQuestions()
  for (const label of ['Under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+']) await user.click(screen.getByRole('checkbox', { name: label }))
  expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ ageGroups: ['under_18', '18_24', '25_34', '35_44', '45_54', '55_64', '65_plus'] }))
  const goal = screen.getByRole('combobox', { name: 'Campaign goal' })
  expect(goal).toHaveTextContent('Choose goal')
  for (const [value, label] of [
    ['awareness', 'Brand awareness'], ['traffic', 'Traffic'], ['leads', 'Lead generation'], ['signups', 'Sign-ups'], ['sales', 'Sales'], ['other', 'Other'], ['', 'Choose goal'],
  ]) {
    selectOption(goal, label)
    expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ goal: value || null }))
  }
})

test('disables every Brief answer control when the root marks the view disabled', () => {
  renderQuestions({ disabled: true, initialDraft: { ...baseDraft, goal: 'other', visualTags: ['Rain'] } })
  for (const control of [...screen.getAllByRole('button'), ...screen.getAllByRole('radio'), ...screen.getAllByRole('checkbox'), ...screen.getAllByRole('combobox'), ...screen.getAllByRole('textbox')]) expect(control).toBeDisabled()
})

test('renders fewer than seven source tags as dismissible labels and can remove the final tag', async () => {
  const user = userEvent.setup()
  const { onChangeSpy } = renderQuestions({ initialDraft: { ...baseDraft, visualTags: ['Rain'] } })
  await user.click(screen.getByRole('button', { name: 'Remove Rain' }))
  expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ visualTags: [] }))
})

test('adds unique tags and retains invalid typed tag input for local feedback', async () => {
  const user = userEvent.setup()
  const { onChangeSpy } = renderQuestions({ initialDraft: { ...baseDraft, visualTags: ['Rain'] } })
  const input = screen.getByRole('textbox', { name: 'Add visual keyword' })
  await user.type(input, 'night transit{Enter}')
  expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ visualTags: ['Rain', 'night transit'] }))
  await user.type(input, 'RAIN{Enter}')
  expect(onChangeSpy).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
  expect(onChangeSpy).toHaveBeenCalledTimes(1)
  await user.clear(input)
  await user.type(input, 'x'.repeat(MAX_VISUAL_TAG_LENGTH + 1))
  await user.keyboard('{Enter}')
  expect(input).toHaveValue('x'.repeat(MAX_VISUAL_TAG_LENGTH + 1))
  expect(screen.getByRole('alert')).toHaveTextContent(String(MAX_VISUAL_TAG_LENGTH))
})

test('allows more than seven tags but never emits a thirteenth tag', async () => {
  const user = userEvent.setup()
  const initialDraft = { ...baseDraft, visualTags: Array.from({ length: 8 }, (_, index) => `tag ${index + 1}`) }
  const { onChangeSpy } = renderQuestions({ initialDraft })
  const input = screen.getByRole('textbox', { name: 'Add visual keyword' })
  await user.type(input, 'tag nine{Enter}')
  expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ visualTags: expect.arrayContaining(['tag nine']) }))
  for (let index = 10; index <= MAX_VISUAL_TAGS; index += 1) await user.type(input, `tag ${index}{Enter}`)
  await user.type(input, 'tag thirteen{Enter}')
  expect(input).toHaveValue('tag thirteen')
  expect(screen.getByRole('alert')).toHaveTextContent(String(MAX_VISUAL_TAGS))
})
