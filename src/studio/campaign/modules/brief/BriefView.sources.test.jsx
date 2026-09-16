import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { BriefView } from './BriefView.jsx'

function SourceComposer({ files, onAttach, onSubmit, canSubmit }) {
  return <div>
    <button type="button" onClick={() => onAttach([new File(['campaign source'], 'brief.pdf', { type: 'application/pdf' })])}>Attach source</button>
    <button type="button" disabled={!canSubmit} onClick={onSubmit}>Analyze brief</button>
    <output>{files.map(file => file.name).join(', ')}</output>
  </div>
}

test('text-only Home submission opts into briefing questions when source collection is enabled', async () => {
  const onSave = vi.fn(async () => ({ ok: true }))
  render(<BriefView onSave={onSave} collectSources />)

  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Promote a local community event' } })
  fireEvent.submit(screen.getByRole('form'))

  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    brief: { notes: 'Promote a local community event' },
    sources: [],
  })))
})

test('submits a readable file as a source without extracting it into notes', async () => {
  const onGenerate = vi.fn(async () => ({ ok: true }))
  const extractBriefFile = vi.fn()
  render(<BriefView campaign={{ title: 'Spring campaign', brief: { notes: '' } }} api={{ extractBriefFile }} onGenerate={onGenerate}
    inputKey="source-key" collectSources Composer={SourceComposer} />)

  fireEvent.click(screen.getByRole('button', { name: 'Attach source' }))
  await waitFor(() => expect(screen.getByText('brief.pdf')).toBeVisible())
  fireEvent.click(screen.getByRole('button', { name: 'Analyze brief' }))

  await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(1))
  expect(extractBriefFile).not.toHaveBeenCalled()
  expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Spring campaign',
    brief: { notes: '' },
    sources: [expect.objectContaining({ kind: 'file', name: 'brief.pdf', mimeType: 'application/pdf', data: expect.any(String) })],
  }), { expectedInputKey: 'source-key' })
})

test('keeps legacy extracted file-only submission available when source collection is disabled', async () => {
  const onGenerate = vi.fn(async () => ({ ok: true }))
  const extractBriefFile = vi.fn(async () => ({ text: 'Extracted campaign source' }))
  render(<BriefView campaign={{ title: 'Spring campaign', brief: { notes: '' } }} api={{ extractBriefFile }} onGenerate={onGenerate}
    inputKey="legacy-source-key" Composer={SourceComposer} />)

  fireEvent.click(screen.getByRole('button', { name: 'Attach source' }))
  await waitFor(() => expect(screen.getByText('brief.pdf')).toBeVisible())
  fireEvent.click(screen.getByRole('button', { name: 'Analyze brief' }))

  await waitFor(() => expect(onGenerate).toHaveBeenCalledWith({
    title: 'Spring campaign',
    brief: { notes: 'Attached brief: brief.pdf\nExtracted campaign source' },
  }, { expectedInputKey: 'legacy-source-key' }))
})

test('uses source-collection pending copy without promising first drafts', () => {
  render(<BriefView campaign={{ title: 'Spring campaign', brief: { notes: '' } }} api={{ extractBriefFile: vi.fn() }} pending="analyze"
    collectSources Composer={SourceComposer} />)

  expect(screen.getByText('Analyzing campaign materials…')).toBeVisible()
  expect(screen.queryByText(/preparing the first drafts/i)).not.toBeInTheDocument()
})
