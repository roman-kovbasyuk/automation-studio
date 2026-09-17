import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import BriefModule from './BriefModule.jsx'

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

async function finalize() {
  fireEvent.click(screen.getByRole('radio', { name: 'No, use this copy' }))
  fireEvent.click(screen.getByRole('button', { name: 'Proceed to settings →' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Proceed to visual context →' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Finalize brief & proceed to copy →' }))
}

test('reviews the analysed brief in steps, keeps an edit across refresh, and confirms it against the captured input', async () => {
  const port = reviewedPort()
  const { rerender } = render(<BriefModule port={port} />)
  expect(screen.getByRole('region', { name: '1. Copy found' })).toBeVisible()

  fireEvent.change(screen.getByRole('textbox', { name: 'Summary' }), { target: { value: 'My edited brief.' } })
  expect(port.setDirty).toHaveBeenLastCalledWith(true)
  port.inputKey = 'source-after-refresh'
  port.input = { brief: { notes: 'Refreshed brief', briefing: { schemaVersion: 2, sourceKey, analysisJobId: 'analysis-1', answers: { ...answers, summary: 'Server value.' }, confirmation: null } }, analysis: { briefingProposal: proposal } }
  rerender(<BriefModule port={port} />)
  expect(screen.getByRole('textbox', { name: 'Summary' })).toHaveValue('My edited brief.')

  await finalize()
  await waitFor(() => expect(port.actions.confirm).toHaveBeenCalledWith({ sourceKey, analysisJobId: 'analysis-1', answers: { ...answers, summary: 'My edited brief.', copyMode: 'keep_original' } }, { expectedInputKey: 'source-before-edit' }))
  expect(port.setDirty).toHaveBeenLastCalledWith(false)
})

test('keeps the review dirty and shows the parent error when confirmation fails', async () => {
  const port = reviewedPort({ actions: { confirm: vi.fn(async () => ({ ok: false, message: 'The source changed.' })) } })
  render(<BriefModule port={port} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Summary' }), { target: { value: 'My edited brief.' } })
  await finalize()

  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The source changed.'))
  expect(port.setDirty).toHaveBeenLastCalledWith(true)
})

test('prototype uses the same stepwise review as the approved flow', () => {
  render(<BriefModule port={reviewedPort({ prototypeMode: true })} />)
  expect(screen.getByRole('region', { name: 'What we understood' })).toBeVisible()
  expect(within(screen.getByRole('region', { name: '1. Copy found' })).getByRole('group', { name: 'Also write new copy options?' })).toBeVisible()
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
