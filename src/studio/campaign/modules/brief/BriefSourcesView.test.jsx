import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { BriefSourcesView } from './BriefSourcesView.jsx'

test('reads a source only after its explicit preview click and presents extracted blocks', async () => {
  const getSource = vi.fn(async () => ({
    source: { id: 'source-1', name: 'campaign.pdf' },
    blocks: [{ id: 'page-2', text: 'Travel lighter.', page: 2 }],
  }))
  render(<BriefSourcesView sources={[{ id: 'source-1', name: 'campaign.pdf', status: 'ready' }]} disabled={false}
    actions={{ getSource, retrySource: vi.fn(), removeSource: vi.fn() }} />)

  expect(getSource).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Preview campaign.pdf' }))
  await waitFor(() => expect(getSource).toHaveBeenCalledWith('source-1'))
  expect(screen.getByRole('dialog', { name: 'campaign.pdf' })).toHaveTextContent('Page 2')
  expect(screen.getByRole('dialog', { name: 'campaign.pdf' })).toHaveTextContent('Travel lighter.')
})

test('retries only a failed source and disables writes while read-only', async () => {
  const retrySource = vi.fn(async () => ({ ok: true }))
  const removeSource = vi.fn(async () => ({ ok: true }))
  const { rerender } = render(<BriefSourcesView sources={[
    { id: 'failed', name: 'failed.pdf', status: 'failed', errorCode: 'extract_failed' },
    { id: 'ready', name: 'ready.pdf', status: 'ready' },
  ]} disabled={false} actions={{ getSource: vi.fn(), retrySource, removeSource }} />)

  fireEvent.click(screen.getByRole('button', { name: 'Retry failed.pdf' }))
  await waitFor(() => expect(retrySource).toHaveBeenCalledWith('failed'))
  expect(screen.queryByRole('button', { name: 'Retry ready.pdf' })).not.toBeInTheDocument()

  rerender(<BriefSourcesView sources={[{ id: 'ready', name: 'ready.pdf', status: 'ready' }]} disabled
    actions={{ getSource: vi.fn(), retrySource, removeSource }} />)
  expect(screen.getByRole('button', { name: 'Remove ready.pdf' })).toBeDisabled()
})

test('explains why a source failed without showing its code', () => {
  render(<BriefSourcesView sources={[
    { id: 'too-much', name: 'notes.pdf', status: 'failed', errorCode: 'brief_collection_text_too_large' },
    { id: 'strange', name: 'other.pdf', status: 'failed', errorCode: 'extract_failed' },
  ]} disabled={false} actions={{ getSource: vi.fn(), retrySource: vi.fn(), removeSource: vi.fn() }} />)
  expect(screen.getByText('Together, the attached files have more text than a brief can use. Remove a file or attach shorter documents.')).toBeVisible()
  expect(screen.getByText('This file could not be read.')).toBeVisible()
  expect(screen.queryByText(/brief_collection_text_too_large|extract_failed/)).not.toBeInTheDocument()
})

test('shows source preview failures and does not mutate sources from mount', async () => {
  const getSource = vi.fn(async () => { throw new Error('Preview unavailable.') })
  const retrySource = vi.fn()
  const removeSource = vi.fn()
  render(<BriefSourcesView sources={[{ id: 'source-1', name: 'campaign.pdf', status: 'processing' }]} disabled={false}
    actions={{ getSource, retrySource, removeSource }} />)

  expect(retrySource).not.toHaveBeenCalled()
  expect(removeSource).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Preview campaign.pdf' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Preview unavailable.'))
})
