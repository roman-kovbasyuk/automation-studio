import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import BriefModule from './BriefModule.jsx'
import { AUTOSAVE_DELAY_MS } from './BriefReview.jsx'

afterEach(() => vi.useRealTimers())

const answers = {
  summary: 'A clear campaign idea.', audience: 'Commuters', copyMode: 'create_new',
  ageGroups: [], gender: 'all', reach: 'national', goal: 'signups', goalCustom: '', visualTags: [],
}
const sourceKey = 'a'.repeat(64)
const proposal = { sourceKey, answers: { ...answers, copyMode: null }, suggestedVisualTags: [],
  foundCopy: [{ id: 'copy-1', fields: { headline: 'Travel lighter.', body: '', offer: '', cta: '' }, verification: 'text_verified', sourceRefs: [{ sourceId: 'source-1', label: 'campaign.pdf', blockId: 'page-2', page: 2 }] }] }

function reviewedPort(overrides = {}) {
  return {
    input: { brief: { notes: 'Original brief', briefing: { schemaVersion: 2, sourceKey, analysisJobId: 'analysis-1', answers, confirmation: null } }, analysis: { briefingProposal: proposal } },
    inputKey: 'source-before-edit',
    access: { canEdit: true },
    operation: { kind: 'idle' },
    actions: { confirm: vi.fn(async () => ({ ok: true })) },
    setDirty: vi.fn(),
    ...overrides,
  }
}

function editSummary(value) {
  fireEvent.click(screen.getByRole('button', { name: 'Edit Summary' }))
  const field = screen.getByRole('textbox', { name: 'Summary' })
  fireEvent.change(field, { target: { value } })
  fireEvent.keyDown(field, { key: 'Enter' })
}

async function finalize() {
  fireEvent.click(screen.getByRole('radio', { name: 'No, use this copy' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Proceed to copy →' }))
}

test('reviews the analysed brief with every step open at once, keeps an edit across refresh, and confirms it against the captured input', async () => {
  const port = reviewedPort()
  const { rerender } = render(<BriefModule port={port} />)
  expect(screen.getByRole('region', { name: 'Copy found' })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Settings' })).toBeVisible()

  editSummary('My edited brief.')
  await waitFor(() => expect(port.setDirty).toHaveBeenLastCalledWith(true))
  port.inputKey = 'source-after-refresh'
  port.input = { brief: { notes: 'Refreshed brief', briefing: { schemaVersion: 2, sourceKey, analysisJobId: 'analysis-1', answers: { ...answers, summary: 'Server value.' }, confirmation: null } }, analysis: { briefingProposal: proposal } }
  rerender(<BriefModule port={port} />)
  expect(screen.getByRole('button', { name: 'Edit Summary' })).toHaveTextContent('My edited brief.')

  await finalize()
  await waitFor(() => expect(port.actions.confirm).toHaveBeenCalledWith({ sourceKey, analysisJobId: 'analysis-1', answers: { ...answers, summary: 'My edited brief.', copyMode: 'keep_original' } }, { expectedInputKey: 'source-before-edit' }))
  await waitFor(() => expect(port.setDirty).toHaveBeenLastCalledWith(false))
})

test('keeps the review dirty and shows the parent error when confirmation fails', async () => {
  const port = reviewedPort({ actions: { confirm: vi.fn(async () => ({ ok: false, message: 'The source changed.' })) } })
  render(<BriefModule port={port} />)
  editSummary('My edited brief.')
  await waitFor(() => expect(port.setDirty).toHaveBeenLastCalledWith(true))
  await finalize()

  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The source changed.'))
  expect(port.setDirty).toHaveBeenLastCalledWith(true)
})

test('prototype uses the same flat review as the approved flow', () => {
  render(<BriefModule port={reviewedPort({ prototypeMode: true })} />)
  expect(screen.getByRole('button', { name: 'Edit Summary' })).toBeVisible()
  expect(within(screen.getByRole('region', { name: 'Copy found' })).getByRole('group', { name: 'Also write new copy options?' })).toBeVisible()
})

test('shows the analysis progress panel while the materials are analysed again', () => {
  render(<BriefModule port={reviewedPort({ operation: { kind: 'running', actionId: 'analyze' } })} />)
  expect(screen.getByRole('region', { name: 'Analyzing your materials' })).toBeVisible()
  expect(screen.queryByRole('region', { name: 'What we understood' })).not.toBeInTheDocument()
})

test('tells the requester when a new analysis replaced the suggestions', () => {
  const port = reviewedPort()
  const { rerender } = render(<BriefModule port={port} />)
  port.inputKey = 'after-new-analysis'
  port.input = { ...port.input, brief: { ...port.input.brief, briefing: { ...port.input.brief.briefing, analysisJobId: 'analysis-2' } } }
  rerender(<BriefModule port={port} />)
  expect(screen.getByRole('status')).toHaveTextContent('Your materials changed, so the settings were suggested again.')
})

test('an edit made while an autosave is in flight is kept and saved next, against the key the first save produced', async () => {
  let finishSave
  const confirmed = { ...answers, copyMode: 'keep_original' }
  const port = reviewedPort({ actions: { confirm: vi.fn(() => new Promise(resolve => { finishSave = resolve })) } })
  port.input = { ...port.input, brief: { ...port.input.brief, briefing: { ...port.input.brief.briefing, answers: confirmed, confirmation: { id: 'confirmation-1' } } } }
  const { rerender } = render(<BriefModule port={port} />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit settings' }))

  vi.useFakeTimers()
  fireEvent.click(screen.getByRole('radio', { name: 'Men' }))
  await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS))
  expect(port.actions.confirm).toHaveBeenCalledTimes(1)
  expect(port.actions.confirm).toHaveBeenLastCalledWith(expect.objectContaining({ answers: { ...confirmed, gender: 'men' } }), { expectedInputKey: 'source-before-edit' })

  // The runtime reports the save as a running confirm; the review stays usable.
  port.operation = { kind: 'running', actionId: 'confirm' }
  rerender(<BriefModule port={{ ...port }} />)
  expect(screen.getByRole('radio', { name: 'Women' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Collapse settings' })).toBeVisible()
  fireEvent.click(screen.getByRole('radio', { name: 'Women' }))

  await act(async () => { finishSave({ ok: true }) })
  port.operation = { kind: 'idle' }
  port.inputKey = 'after-own-save'
  port.input = { ...port.input, brief: { ...port.input.brief, briefing: { ...port.input.brief.briefing, answers: { ...confirmed, gender: 'men' }, confirmation: { id: 'confirmation-2' } } } }
  rerender(<BriefModule port={{ ...port }} />)
  expect(port.setDirty).toHaveBeenLastCalledWith(true)
  expect(screen.getByRole('radio', { name: 'Women' })).toBeChecked()

  await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS))
  expect(port.actions.confirm).toHaveBeenCalledTimes(2)
  expect(port.actions.confirm).toHaveBeenLastCalledWith(expect.objectContaining({ answers: { ...confirmed, gender: 'women' } }), { expectedInputKey: 'after-own-save' })
})
