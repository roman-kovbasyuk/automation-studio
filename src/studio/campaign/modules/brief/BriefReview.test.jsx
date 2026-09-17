import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { emptyBriefAnswers } from '../../../../../shared/briefingContracts.js'
import { BriefReview } from './BriefReview.jsx'
import { initialDraft } from './briefReviewModel.js'

const foundCopy = [{ id: 'c1', fields: { headline: 'Spring sale: 20% off', body: '', offer: '', cta: '' }, verification: 'text_verified',
  sourceRefs: [{ sourceId: 'brochure', label: 'brochure.pdf', blockId: 'p1' }] }]
const answers = { ...emptyBriefAnswers(), summary: 'Evening courses', audience: 'Adults in Oslo', copyMode: null, ageGroups: ['25_34', '35_44'],
  gender: 'women', reach: 'national', goal: 'signups', visualTags: ['winter light'] }
const proposalFor = (overrides = {}, copy = foundCopy) => ({ foundCopy: copy, answers: { ...answers, ...overrides }, suggestedVisualTags: ['winter light'] })
const briefFor = (stored, confirmation = null) => ({ notes: 'Brief', locale: 'en', briefing: { schemaVersion: 2, sourceIds: [], sourceKey: 'a'.repeat(64),
  analysisJobId: 'analysis-1', answers: stored, confirmation } })

function Review({ proposal = proposalFor(), brief = briefFor(proposal.answers), onConfirm = vi.fn(async () => ({ ok: true })), onDiscard = vi.fn(), ...props }) {
  const saved = initialDraft(brief.briefing.answers, proposal)
  const [draft, setDraft] = useState(saved), [dirty, setDirty] = useState(false)
  return <BriefReview brief={brief} proposal={proposal} draft={draft} dirty={dirty} busy={false} error="" notice="" onOpenSource={vi.fn()}
    onChange={next => { setDraft(next); setDirty(true) }} onConfirm={onConfirm}
    onDiscard={() => { setDraft(saved); setDirty(false); onDiscard() }} {...props} />
}

test('opens Copy found first, checks each step before moving on and keeps finished steps as summaries', async () => {
  const user = userEvent.setup()
  render(<Review />)
  expect(screen.getByRole('region', { name: 'What we understood' })).toBeVisible()
  const copy = screen.getByRole('region', { name: '1. Copy found' })
  expect(within(copy).getByText('Step 1 of 3')).toBeVisible()
  expect(screen.queryByRole('region', { name: '2. Settings' })).not.toBeInTheDocument()

  await user.click(within(copy).getByRole('button', { name: 'Proceed to settings →' }))
  const noAnswer = within(copy).getByRole('radio', { name: 'No, use this copy' })
  expect(within(copy).getByRole('group', { name: 'Also write new copy options?' })).toHaveAccessibleDescription('Choose whether to also write new copy.')
  await waitFor(() => expect(noAnswer).toHaveFocus())

  await user.click(noAnswer)
  await user.click(within(copy).getByRole('button', { name: 'Proceed to settings →' }))
  expect(within(screen.getByRole('region', { name: '1. Copy found' })).getByText('“Spring sale: 20% off” · Use this copy only')).toBeVisible()
  const settings = screen.getByRole('region', { name: '2. Settings' })
  await waitFor(() => expect(settings).toHaveFocus())
  expect(within(settings).getByText('Step 2 of 3')).toBeVisible()

  await user.click(screen.getByRole('button', { name: 'Edit copy found' }))
  expect(within(screen.getByRole('region', { name: '2. Settings' })).getByText('25–44 · Women · Sign-ups · National')).toBeVisible()
  expect(screen.getByRole('region', { name: '1. Copy found' })).toHaveFocus()
})

test('without found copy the review starts at Settings, and suggested marks clear once a value changes', async () => {
  const user = userEvent.setup()
  render(<Review proposal={proposalFor({ copyMode: 'create_new' }, [])} />)
  const settings = screen.getByRole('region', { name: '1. Settings' })
  expect(within(settings).getByText('Step 1 of 2')).toBeVisible()
  expect(screen.queryByRole('region', { name: /Copy found/ })).not.toBeInTheDocument()
  expect(within(settings).getByRole('group', { name: 'Gender' })).toHaveAccessibleDescription('Suggested')
  await user.click(within(settings).getByRole('radio', { name: 'Men' }))
  expect(within(settings).getByRole('group', { name: 'Gender' })).not.toHaveAccessibleDescription('Suggested')
  expect(within(settings).getByRole('group', { name: 'Reach' })).toHaveAccessibleDescription('Suggested')
})

test('finalize checks everything, reopens the step that owns a problem and confirms the reviewed answers', async () => {
  const user = userEvent.setup(), onConfirm = vi.fn(async () => ({ ok: true }))
  render(<Review proposal={proposalFor({ copyMode: 'create_new', goal: null }, [])} onConfirm={onConfirm} />)
  await user.click(screen.getByRole('radio', { name: 'Sales' }))
  await user.click(screen.getByRole('button', { name: 'Proceed to visual context →' }))
  const visuals = screen.getByRole('region', { name: '2. Visual context' })
  expect(within(visuals).getByText('Starts writing 5 copy options.')).toBeVisible()

  await user.clear(screen.getByRole('textbox', { name: 'Summary' }))
  await user.click(within(visuals).getByRole('button', { name: 'Finalize brief & proceed to copy →' }))
  expect(onConfirm).not.toHaveBeenCalled()
  const summary = screen.getByRole('textbox', { name: 'Summary' })
  expect(summary).toHaveAccessibleDescription('Enter a summary.')
  await waitFor(() => expect(summary).toHaveFocus())

  await user.type(summary, 'Evening courses for adults')
  await user.click(screen.getByRole('button', { name: 'Finalize brief & proceed to copy →' }))
  await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ ...answers, summary: 'Evening courses for adults', copyMode: 'create_new', goal: 'sales' }))
})

test('a missing goal found at finalize reopens Settings with the problem next to the field', async () => {
  const user = userEvent.setup(), onConfirm = vi.fn(async () => ({ ok: true }))
  render(<Review proposal={proposalFor({ copyMode: 'create_new' }, [])} onConfirm={onConfirm} />)
  await user.click(screen.getByRole('button', { name: 'Proceed to visual context →' }))
  await user.click(screen.getByRole('button', { name: 'Edit settings' }))
  await user.click(screen.getByRole('radio', { name: 'Other' }))
  await user.click(screen.getByRole('button', { name: 'Proceed to visual context →' }))
  expect(screen.getByRole('group', { name: 'Goal' })).toHaveAccessibleDescription('Describe the goal.')
  expect(screen.queryByRole('region', { name: '2. Visual context' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '1. Settings' })).toHaveTextContent('Step 1 of 2')
})

test('a confirmed brief opens collapsed; saving warns what goes out of date and cancel discards the change', async () => {
  const user = userEvent.setup(), onConfirm = vi.fn(async () => ({ ok: true })), onDiscard = vi.fn()
  const proposal = proposalFor({ copyMode: 'create_new' }, [])
  render(<Review proposal={proposal} brief={briefFor({ ...proposal.answers }, { id: 'confirmation-1' })} onConfirm={onConfirm} onDiscard={onDiscard} />)
  expect(screen.getByRole('region', { name: '1. Settings' })).toHaveTextContent('25–44 · Women · Sign-ups · National')
  expect(screen.getByRole('region', { name: '2. Visual context' })).toHaveTextContent('winter light')
  expect(screen.queryByText('Suggested')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Edit settings' }))
  await user.click(screen.getByRole('radio', { name: 'Sales' }))
  const settings = screen.getByRole('region', { name: '1. Settings' })
  expect(within(settings).getByText('Copy and visuals will need updating.')).toBeVisible()
  expect(within(settings).getByText('Starts writing 5 copy options.')).toBeVisible()
  await user.click(within(settings).getByRole('button', { name: 'Cancel' }))
  expect(onDiscard).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('region', { name: '1. Settings' })).toHaveTextContent('Sign-ups')

  await user.click(screen.getByRole('button', { name: 'Edit visual context' }))
  await user.type(screen.getByRole('textbox', { name: 'Add a keyword' }), 'tram stop{Enter}')
  const visuals = screen.getByRole('region', { name: '2. Visual context' })
  expect(within(visuals).getByText('Visuals will need updating.')).toBeVisible()
  expect(within(visuals).queryByText('Starts writing 5 copy options.')).not.toBeInTheDocument()
  await user.click(within(visuals).getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ ...proposal.answers, visualTags: ['winter light', 'tram stop'] }))
  await waitFor(() => expect(screen.getByRole('region', { name: '2. Visual context' })).toHaveTextContent('winter light, tram stop'))
})

test('people without edit rights see collapsed steps without Edit or actions', () => {
  render(<Review readOnly />)
  expect(screen.getByRole('textbox', { name: 'Summary' })).toHaveAttribute('readonly')
  expect(screen.getByRole('region', { name: '1. Copy found' })).toHaveTextContent('Copy choice needed')
  expect(screen.getByRole('region', { name: '3. Visual context' })).toBeVisible()
  expect(screen.queryAllByRole('button')).toHaveLength(0)
})

test('a capacity failure reopens Copy found with the message', async () => {
  const user = userEvent.setup()
  const onConfirm = vi.fn(async () => ({ ok: false, code: 'copy_capacity_exceeded', message: 'Delete copy options to make room for the found copy and five new options.' }))
  render(<Review proposal={proposalFor({ copyMode: 'keep_and_create' })} onConfirm={onConfirm} />)
  await user.click(screen.getByRole('button', { name: 'Proceed to settings →' }))
  await user.click(screen.getByRole('button', { name: 'Proceed to visual context →' }))
  await user.click(screen.getByRole('button', { name: 'Finalize brief & proceed to copy →' }))
  await waitFor(() => expect(screen.getByRole('region', { name: '1. Copy found' })).toHaveTextContent('Step 1 of 3'))
  expect(screen.getByRole('alert')).toHaveTextContent('Delete copy options to make room for the found copy and five new options.')
})
