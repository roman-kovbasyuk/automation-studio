import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import BriefModule from './BriefModule.jsx'

const answers = {
  summary: 'A clear campaign idea.', audience: 'Commuters', copyMode: 'create_new',
  ageGroups: [], gender: 'all', reach: 'national', goal: 'signups', goalCustom: '', visualTags: [],
}
const proposal = { foundCopy: [{ id: 'copy-1', fields: { headline: 'Travel lighter.', body: '', offer: '', cta: '' }, sourceRefs: [{ sourceId: 'source-1', label: 'campaign.pdf', blockId: 'page-2', page: 2 }] }] }

test('opens the same source preview from found copy only after an explicit click', async () => {
  const getSource = vi.fn(async () => ({ source: { id: 'source-1', name: 'campaign.pdf' }, blocks: [{ id: 'page-2', text: 'Travel lighter.', page: 2 }] }))
  const port = {
    input: { brief: { notes: 'Original', briefing: { schemaVersion: 2, sourceKey: 'a'.repeat(64), analysisJobId: 'analysis-1', answers } }, analysis: { briefingProposal: proposal }, sources: [{ id: 'source-1', name: 'campaign.pdf', status: 'ready' }] },
    inputKey: 'source-key', access: { canEdit: true }, operation: { kind: 'idle' },
    actions: { confirm: vi.fn(), getSource, retrySource: vi.fn(), removeSource: vi.fn() }, setDirty: vi.fn(),
  }
  render(<BriefModule port={port} />)

  expect(getSource).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'View found copy' }))
  fireEvent.click(screen.getByRole('button', { name: 'Open source campaign.pdf · page 2' }))
  await waitFor(() => expect(getSource).toHaveBeenCalledWith('source-1'))
  expect(screen.getByRole('dialog', { name: 'campaign.pdf' })).toHaveTextContent('Travel lighter.')
})

test('offers legacy review only when supported and never starts it on mount', async () => {
  const startReview = vi.fn(async () => ({ ok: true }))
  const port = {
    input: { brief: { notes: 'Original brief' }, analysis: { title: 'Launch', summary: 'A launch.', audience: 'Commuters', objective: 'Shop', channels: [], formats: [], themes: [], warnings: [] } },
    inputKey: 'legacy-key', access: { canEdit: true }, operation: { kind: 'idle' },
    actions: { save: vi.fn(), refine: vi.fn(), submit: vi.fn(), startReview }, setDirty: vi.fn(),
  }
  render(<BriefModule port={port} />)

  expect(startReview).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Review campaign questions' }))
  await waitFor(() => expect(startReview).toHaveBeenCalledTimes(1))
})

test('keeps the legacy review entry disabled while read-only', () => {
  const port = {
    input: { brief: { notes: 'Original brief' }, analysis: { title: 'Launch', summary: 'A launch.', audience: 'Commuters', objective: 'Shop', channels: [], formats: [], themes: [], warnings: [] } },
    inputKey: 'legacy-key', access: { canEdit: false }, operation: { kind: 'idle' },
    actions: { save: vi.fn(), refine: vi.fn(), submit: vi.fn(), startReview: vi.fn() }, setDirty: vi.fn(),
  }
  render(<BriefModule port={port} />)
  expect(screen.getByRole('button', { name: 'Review campaign questions' })).toBeDisabled()
})
