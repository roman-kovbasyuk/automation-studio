import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useCallback, useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { emptyBriefAnswers } from '../../../../../shared/briefingContracts.js'
import { AUTOSAVE_DELAY_MS, BriefReview } from './BriefReview.jsx'
import { initialDraft } from './briefReviewModel.js'

afterEach(() => vi.useRealTimers())

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

test('before confirmation every visible step is open at once, with one action at the bottom', () => {
  render(<Review />)
  expect(screen.getByRole('button', { name: 'Edit Summary' })).toBeVisible()
  expect(screen.queryByRole('region', { name: 'What we understood' })).not.toBeInTheDocument()
  const copy = screen.getByRole('region', { name: 'Copy found' })
  expect(within(copy).getByRole('group', { name: 'Also write new copy options?' })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Settings' })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Visual context' })).toBeVisible()
  expect(screen.queryByText(/Proceed to settings/)).not.toBeInTheDocument()
  expect(screen.queryByText(/Step \d of \d/)).not.toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Proceed to copy →' })).toHaveLength(1)
  expect(screen.queryByRole('button', { name: /^(Edit|Done|Collapse) (copy found|settings|visual context)$/i })).not.toBeInTheDocument()
})

test('without found copy, Copy found is not shown and Settings is already open', () => {
  render(<Review proposal={proposalFor({ copyMode: 'create_new' }, [])} />)
  expect(screen.queryByRole('region', { name: 'Copy found' })).not.toBeInTheDocument()
  expect(within(screen.getByRole('region', { name: 'Settings' })).getByRole('group', { name: 'Gender' })).toBeVisible()
})

test('Proceed to copy validates everything, focuses the first problem, and confirms once fixed', async () => {
  const user = userEvent.setup(), onConfirm = vi.fn(async () => ({ ok: true }))
  render(<Review proposal={proposalFor({ copyMode: null })} onConfirm={onConfirm} />)
  await user.click(screen.getByRole('button', { name: 'Proceed to copy →' }))
  expect(onConfirm).not.toHaveBeenCalled()
  const copyGroup = screen.getByRole('group', { name: 'Also write new copy options?' })
  await waitFor(() => expect(copyGroup).toContainElement(document.activeElement))
  expect(copyGroup).toHaveAccessibleDescription('Choose whether to also write new copy.')

  await user.click(within(copyGroup).getByRole('radio', { name: 'No, use this copy' }))
  await user.click(screen.getByRole('button', { name: 'Proceed to copy →' }))
  await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ ...answers, copyMode: 'keep_original' }))
})

test('an empty summary shows its own error text and takes focus', async () => {
  const user = userEvent.setup(), onConfirm = vi.fn(async () => ({ ok: true }))
  render(<Review proposal={proposalFor({ copyMode: 'create_new', summary: '' }, [])} onConfirm={onConfirm} />)
  await user.click(screen.getByRole('button', { name: 'Proceed to copy →' }))
  expect(onConfirm).not.toHaveBeenCalled()
  expect(screen.getByText('Enter a summary.')).toBeVisible()
})

test('legacy under-18 answers stay visible and cannot be reconfirmed until an adult range is chosen', async () => {
  const onConfirm = vi.fn(async () => ({ ok: true }))
  const historical = { ...answers, copyMode: 'create_new', ageGroups: ['under_18'] }
  const proposal = proposalFor(historical, [])
  render(<Review proposal={proposal} brief={briefFor(historical)} onConfirm={onConfirm} />)
  expect(screen.getByText(/Under 18 \(previous selection\).*Choose an age range from 18/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Proceed to copy →' }))
  expect(onConfirm).not.toHaveBeenCalled()
  expect(screen.getByText('Choose an age range starting at 18.')).toBeVisible()
  fireEvent.change(screen.getByRole('slider', { name: 'From' }), { target: { value: '1' } })
  fireEvent.click(screen.getByRole('button', { name: 'Proceed to copy →' }))
  await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ ...historical, ageGroups: ['25_34', '35_44', '45_54', '55_64', '65_plus'] }))
})

test('suggested marks show for analysis-filled values and clear once the user changes them', async () => {
  const user = userEvent.setup()
  const proposal = proposalFor({ copyMode: 'create_new' }, [])
  render(<Review proposal={proposal} />)
  const settings = screen.getByRole('region', { name: 'Settings' })
  expect(within(settings).getByRole('group', { name: 'Gender' })).toHaveAccessibleDescription('Suggested')
  await user.click(within(settings).getByRole('radio', { name: 'Men' }))
  expect(within(settings).getByRole('group', { name: 'Gender' })).not.toHaveAccessibleDescription('Suggested')
})

test('a confirmed brief renders every section collapsed with no bottom action', () => {
  const proposal = proposalFor({ copyMode: 'keep_original' })
  render(<Review proposal={proposal} brief={briefFor(proposal.answers, { id: 'confirmation-1' })} />)
  expect(screen.getByRole('region', { name: 'Copy found' })).toHaveTextContent('Use this copy only')
  expect(screen.getByRole('region', { name: 'Settings' })).toHaveTextContent('25–44 · Women · Sign-ups · National')
  expect(screen.queryByRole('group', { name: 'Gender' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Proceed to copy →' })).not.toBeInTheDocument()
})

test('editing a confirmed brief that keeps original copy autosaves quietly, with no button and no explanatory text', async () => {
  const onConfirm = vi.fn(async () => ({ ok: true }))
  const proposal = proposalFor({ copyMode: 'keep_original' })
  render(<Review proposal={proposal} brief={briefFor(proposal.answers, { id: 'confirmation-1' })} onConfirm={onConfirm} />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit settings' }))
  const settings = screen.getByRole('region', { name: 'Settings' })
  expect(settings.closest('.bs-brief-step')).toHaveAttribute('data-state', 'revealed')

  vi.useFakeTimers()
  fireEvent.click(within(settings).getByRole('radio', { name: 'Men' }))
  expect(screen.queryByRole('button', { name: 'Proceed to copy →' })).not.toBeInTheDocument()
  expect(screen.queryByText(/updating/)).not.toBeInTheDocument()
  expect(screen.queryByText(/writing/)).not.toBeInTheDocument()
  expect(onConfirm).not.toHaveBeenCalled()
  await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS))
  expect(onConfirm).toHaveBeenCalledWith({ ...proposal.answers, gender: 'men' })
})

test('editing a confirmed brief so it would write new copy needs an explicit click, and can be discarded', async () => {
  const user = userEvent.setup(), onConfirm = vi.fn(async () => ({ ok: true })), onDiscard = vi.fn()
  const proposal = proposalFor({ copyMode: 'create_new' }, [])
  render(<Review proposal={proposal} brief={briefFor(proposal.answers, { id: 'confirmation-1' })} onConfirm={onConfirm} onDiscard={onDiscard} />)
  await user.click(screen.getByRole('button', { name: 'Edit settings' }))
  const settings = screen.getByRole('region', { name: 'Settings' })
  await user.click(within(settings).getByRole('radio', { name: 'Sales' }))

  await screen.findByRole('button', { name: 'Proceed to copy →' })
  expect(screen.getByRole('button', { name: 'Discard changes' })).toBeVisible()
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(onConfirm).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: 'Discard changes' }))
  expect(onDiscard).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('button', { name: 'Proceed to copy →' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Edit settings' }))
  await user.click(within(screen.getByRole('region', { name: 'Settings' })).getByRole('radio', { name: 'Sales' }))
  await user.click(await screen.findByRole('button', { name: 'Proceed to copy →' }))
  await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ ...proposal.answers, goal: 'sales' }))
})

test('people without edit rights see collapsed steps with no Edit buttons or actions', () => {
  const proposal = proposalFor({ copyMode: 'keep_original' })
  render(<Review proposal={proposal} brief={briefFor(proposal.answers, { id: 'confirmation-1' })} readOnly />)
  expect(screen.getByRole('region', { name: 'Copy found' })).toBeVisible()
  expect(screen.queryAllByRole('button')).toHaveLength(0)
})

test('a capacity failure focuses Copy found', async () => {
  const user = userEvent.setup()
  const onConfirm = vi.fn(async () => ({ ok: false, code: 'copy_capacity_exceeded', message: 'Delete copy options to make room for the found copy and five new options.' }))
  render(<Review proposal={proposalFor({ copyMode: 'keep_and_create' })} onConfirm={onConfirm} />)
  await user.click(screen.getByRole('button', { name: 'Proceed to copy →' }))
  await waitFor(() => expect(screen.getByRole('region', { name: 'Copy found' })).toHaveFocus())
  expect(screen.getByRole('alert')).toHaveTextContent('Delete copy options to make room for the found copy and five new options.')
})

test('sources render right after the audience field', () => {
  render(<Review sourcesSlot={<div data-testid="sources">Campaign sources</div>} />)
  const understanding = screen.getByRole('button', { name: 'Edit Summary' }).closest('.bs-brief-understanding')
  expect(understanding.nextElementSibling).toHaveAttribute('data-testid', 'sources')
})

test('a brief that gets confirmed while this component stays mounted collapses its open steps', () => {
  const proposal = proposalFor({ copyMode: 'keep_original' })
  function ConfirmsInPlace() {
    const [confirmation, setConfirmation] = useState(null)
    const [draft, setDraft] = useState(initialDraft(proposal.answers, proposal))
    return <>
      <button type="button" onClick={() => setConfirmation({ id: 'confirmation-1' })}>Simulate confirm</button>
      <BriefReview brief={briefFor(proposal.answers, confirmation)} proposal={proposal} draft={draft} dirty={false} busy={false} error="" notice=""
        onChange={setDraft} onConfirm={vi.fn(async () => ({ ok: true }))} onDiscard={vi.fn()} onOpenSource={vi.fn()} />
    </>
  }
  render(<ConfirmsInPlace />)
  expect(within(screen.getByRole('region', { name: 'Settings' })).getByRole('group', { name: 'Gender' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Simulate confirm' }))
  expect(screen.queryByRole('group', { name: 'Gender' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Edit settings' })).toBeVisible()
})

test('an autosave in flight keeps every control usable and schedules nothing more until it finishes', async () => {
  const onConfirm = vi.fn(async () => ({ ok: true }))
  const proposal = proposalFor({ copyMode: 'keep_original' })
  render(<Review proposal={proposal} brief={briefFor(proposal.answers, { id: 'confirmation-1' })} onConfirm={onConfirm} saving />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit visual context' }))
  const keywords = screen.getByRole('textbox', { name: 'Keywords' })
  expect(keywords).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Remove winter light' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Collapse visual context' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Edit Summary' })).toBeVisible()

  vi.useFakeTimers()
  fireEvent.change(keywords, { target: { value: 'tram stop' } })
  fireEvent.keyDown(keywords, { key: 'Enter' })
  await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2))
  expect(onConfirm).not.toHaveBeenCalled()
})

test('a failed autosave shows its error and waits for the next change instead of retrying', async () => {
  const onConfirm = vi.fn(async () => ({ ok: false, message: 'The source changed. Review it before applying this draft.' }))
  const proposal = proposalFor({ copyMode: 'keep_original' })
  function SavingReview() {
    const [saving, setSaving] = useState(false)
    const confirm = useCallback(async draft => { setSaving(true); try { return await onConfirm(draft) } finally { setSaving(false) } }, [])
    return <Review proposal={proposal} brief={briefFor(proposal.answers, { id: 'confirmation-1' })} onConfirm={confirm} saving={saving} />
  }
  render(<SavingReview />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit settings' }))

  vi.useFakeTimers()
  fireEvent.click(screen.getByRole('radio', { name: 'Men' }))
  await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS))
  expect(onConfirm).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('alert')).toHaveTextContent('The source changed. Review it before applying this draft.')
  await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 4))
  expect(onConfirm).toHaveBeenCalledTimes(1)

  fireEvent.click(screen.getByRole('radio', { name: 'Both' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS))
  expect(onConfirm).toHaveBeenCalledTimes(2)
})
