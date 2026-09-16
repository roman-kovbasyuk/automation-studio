import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import BriefModule from './BriefModule.jsx'

const answers = {
  summary: 'A clear campaign idea.', audience: 'Commuters', copyMode: 'create_new',
  ageGroups: [], gender: 'all', reach: 'national', goal: 'signups', goalCustom: '', visualTags: [],
}
const sourceKey = 'a'.repeat(64)
const proposal = { foundCopy: [{ id: 'copy-1', fields: { headline: 'Travel lighter.', body: '', offer: '', cta: '' }, sourceRefs: [{ sourceId: 'source-1', label: 'campaign.pdf', blockId: 'page-2', page: 2 }], verification: 'text_verified' }] }

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

test('renders the v2 review, preserves an edit across refresh, and confirms it against the captured input', async () => {
  const port = reviewedPort()
  const { rerender } = render(<BriefModule port={port} />)
  const summary = screen.getByRole('textbox', { name: 'Summary' })
  expect(screen.getByRole('button', { name: 'Confirm brief' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Edit summary' })).not.toBeInTheDocument()

  fireEvent.change(summary, { target: { value: 'My edited brief.' } })
  expect(port.setDirty).toHaveBeenLastCalledWith(true)
  port.inputKey = 'source-after-refresh'
  port.input = { brief: { notes: 'Refreshed brief', briefing: { schemaVersion: 2, sourceKey, analysisJobId: 'analysis-1', answers: { ...answers, summary: 'Server value.' }, confirmation: null } }, analysis: { briefingProposal: proposal } }
  rerender(<BriefModule port={port} />)
  expect(screen.getByRole('textbox', { name: 'Summary' })).toHaveValue('My edited brief.')

  fireEvent.click(screen.getByRole('button', { name: 'Confirm brief' }))
  await waitFor(() => expect(port.actions.confirm).toHaveBeenCalledWith({ sourceKey, analysisJobId: 'analysis-1', answers: { ...answers, summary: 'My edited brief.' } }, { expectedInputKey: 'source-before-edit' }))
  expect(port.setDirty).toHaveBeenLastCalledWith(false)
})

test('keeps the review dirty and shows the parent error when confirmation fails', async () => {
  const port = reviewedPort({ actions: { confirm: vi.fn(async () => ({ ok: false, message: 'The source changed.' })) } })
  render(<BriefModule port={port} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Summary' }), { target: { value: 'My edited brief.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Confirm brief' }))

  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The source changed.'))
  expect(port.setDirty).toHaveBeenLastCalledWith(true)
})

test('prototype uses the same complete brief review groups as the approved flow', () => {
  render(<BriefModule port={reviewedPort({ prototypeMode: true })} />)
  expect(screen.getByRole('textbox', { name: 'Summary' })).toBeVisible()
  expect(screen.getByRole('group', { name: 'Age groups' })).toBeVisible()
  expect(screen.getByRole('textbox', { name: 'Add visual keyword' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Confirm brief' })).toBeVisible()
})
