import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { BriefStage } from './BriefStage.jsx'

describe('brief composer', () => {
  test('creates a campaign from one description without additional fields', async () => {
    const onSave = vi.fn(async () => {})
    render(<BriefStage onSave={onSave} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Campaign description'), { target: { value: 'Autumn headphones launch. For commuters, 20% off until October 1.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze brief' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ title: 'Autumn headphones launch', brief: { notes: 'Autumn headphones launch. For commuters, 20% off until October 1.' } }))
  })
  test('allows a file-only brief and passes extracted text to campaign creation', async () => {
    const onSave = vi.fn(async () => {})
    const api = { extractBriefFile: vi.fn(async () => ({ text: 'Promote the autumn collection. Save 20% this weekend.' })) }
    render(<BriefStage onSave={onSave} api={api} />)
    fireEvent.change(screen.getByLabelText('Brief files'), { target: { files: [new File(['Promote the autumn collection.'], 'campaign.txt', { type: 'text/plain' })] } })
    await screen.findByRole('button', { name: 'Remove campaign.txt' })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze brief' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ brief: { notes: expect.stringContaining('Save 20% this weekend.') } })))
    expect(api.extractBriefFile).toHaveBeenCalledWith({ name: 'campaign.txt', mimeType: 'text/plain', data: expect.any(String) })
  })
  test.each([
    ['campaign.md', '', 'application/octet-stream'],
    ['campaign.md', 'application/octet-stream', 'application/octet-stream'],
    ['campaign.markdown', '', 'application/octet-stream'],
  ])('normalizes browser MIME %p for file-only %s briefs', async (name, browserType, expectedType) => {
    const onSave = vi.fn(async () => {})
    const api = { extractBriefFile: vi.fn(async () => ({ text: 'Campaign launch notes' })) }
    render(<BriefStage onSave={onSave} api={api} />)
    fireEvent.change(screen.getByLabelText('Brief files'), {
      target: { files: [new File(['Campaign launch notes'], name, { type: browserType })] },
    })
    await screen.findByRole('button', { name: `Remove ${name}` })
    expect(api.extractBriefFile).toHaveBeenCalledWith({ name, mimeType: expectedType, data: expect.any(String) })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze brief' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ brief: { notes: expect.stringContaining('Campaign launch notes') } })))
  })
  test('preserves contradictory browser MIME for server-side rejection', async () => {
    const api = { extractBriefFile: vi.fn(async () => { throw new Error('Unsupported attachment') }) }
    render(<BriefStage onSave={vi.fn()} api={api} />)
    fireEvent.change(screen.getByLabelText('Brief files'), {
      target: { files: [new File(['Campaign'], 'campaign.md', { type: 'application/pdf' })] },
    })
    await screen.findByRole('button', { name: 'Remove campaign.md' })
    expect(api.extractBriefFile).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'application/pdf' }))
  })
  test('preserves an over-limit paste so the user can edit it while blocking submission', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(async () => {})
    render(<BriefStage onSave={onSave} />)
    const composer = screen.getByLabelText('Campaign description')
    const pasted = 'x'.repeat(20_001)
    await user.click(composer)
    await user.paste(pasted)
    expect(composer).toHaveValue(pasted)
    expect(screen.getByRole('alert')).toHaveTextContent('exceeds 20,000 characters')
    expect(screen.getByRole('button', { name: 'Analyze brief' })).toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })
  test('preserves typed input and explains extraction failure', async () => {
    const api = { extractBriefFile: vi.fn(async () => { throw new Error('This PDF has no readable text. Paste the brief instead.') }) }
    render(<BriefStage onSave={vi.fn()} api={api} />)
    fireEvent.change(screen.getByLabelText('Campaign description'), { target: { value: 'Keep this draft' } })
    fireEvent.change(screen.getByLabelText('Brief files'), { target: { files: [new File(['pdf'], 'scan.pdf', { type: 'application/pdf' })] } })
    await screen.findByRole('button', { name: 'Remove scan.pdf' })
    expect(screen.getByLabelText('Campaign description')).toHaveValue('Keep this draft')
    expect(screen.getByRole('button', { name: 'Remove scan.pdf' })).toBeVisible()
    expect(screen.getByLabelText('Files that need attention')).toHaveTextContent('This PDF has no readable text. Paste the brief instead.')
    expect(screen.getByRole('button', { name: 'Analyze brief' })).toBeDisabled()
  })
  test('allows a custom-extension file through the unrestricted picker', async () => {
    const api = { extractBriefFile: vi.fn(async () => ({ text: 'Custom campaign material' })) }
    render(<BriefStage onSave={vi.fn()} api={api} />)
    const picker = screen.getByLabelText('Brief files')
    expect(picker).toHaveAttribute('accept', '')
    fireEvent.change(picker, {
      target: { files: [new File(['Custom campaign material'], 'campaign.brandpack', { type: 'application/x-brandpack' })] },
    })
    await screen.findByRole('button', { name: 'Remove campaign.brandpack' })
    expect(api.extractBriefFile).toHaveBeenCalledWith(expect.objectContaining({
      name: 'campaign.brandpack', mimeType: 'application/x-brandpack', data: expect.any(String),
    }))
  })
  test('retains failed files with readable errors and blocks submit until removed', async () => {
    const onSave = vi.fn(async () => {})
    const api = { extractBriefFile: vi.fn(async ({ name }) => {
      if (name === 'unreadable.asset') throw new Error('The selected file needs native AI input.')
      return { text: 'Readable campaign material' }
    }) }
    render(<BriefStage onSave={onSave} api={api} />)
    fireEvent.change(screen.getByLabelText('Brief files'), {
      target: { files: [
        new File(['Readable campaign material'], 'readable.asset', { type: 'application/x-asset' }),
        new File(['Unreadable campaign material'], 'unreadable.asset', { type: 'application/x-asset' }),
      ] },
    })
    await screen.findByRole('button', { name: 'Remove unreadable.asset' })
    expect(screen.getByRole('button', { name: 'Remove readable.asset' })).toBeVisible()
    fireEvent.change(screen.getByLabelText('Campaign description'), { target: { value: 'Keep this draft' } })
    expect(screen.getByRole('button', { name: 'Analyze brief' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Remove unreadable.asset' }))
    expect(screen.getByRole('button', { name: 'Analyze brief' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Analyze brief' }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })
  test('rejects an over-budget batch without reading any selected file', async () => {
    const api = { extractBriefFile: vi.fn() }
    const oversized = new File(['small placeholder'], 'over-budget.asset', { type: 'application/x-asset' })
    Object.defineProperty(oversized, 'size', { value: 25 * 1024 * 1024 + 1 })
    render(<BriefStage onSave={vi.fn()} api={api} />)
    fireEvent.change(screen.getByLabelText('Brief files'), { target: { files: [oversized] } })
    await screen.findByText(/over-budget\.asset: Campaign materials can total up to 25 MB/)
    expect(api.extractBriefFile).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Remove over-budget.asset' })).toBeVisible()
  })
  test('frees a removed failed attachment byte budget for a later file', async () => {
    const api = { extractBriefFile: vi.fn(async () => ({ text: 'Readable campaign material' })) }
    const first = new File(['first'], 'first.asset', { type: 'application/x-asset' })
    const rejected = new File(['rejected'], 'rejected.asset', { type: 'application/x-asset' })
    const later = new File(['later'], 'later.asset', { type: 'application/x-asset' })
    Object.defineProperty(first, 'size', { value: 20 * 1024 * 1024 })
    Object.defineProperty(rejected, 'size', { value: 10 * 1024 * 1024 })
    Object.defineProperty(later, 'size', { value: 5 * 1024 * 1024 })
    render(<BriefStage onSave={vi.fn()} api={api} />)
    const picker = screen.getByLabelText('Brief files')
    fireEvent.change(picker, { target: { files: [first] } })
    await screen.findByRole('button', { name: 'Remove first.asset' })
    fireEvent.change(picker, { target: { files: [rejected] } })
    await screen.findByRole('button', { name: 'Remove rejected.asset' })
    expect(screen.getByLabelText('Brief attachments')).toHaveTextContent('rejected.asset')
    expect(api.extractBriefFile).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Remove rejected.asset' }))
    fireEvent.change(picker, { target: { files: [later] } })
    await waitFor(() => expect(api.extractBriefFile).toHaveBeenCalledTimes(2))
    expect(api.extractBriefFile).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'later.asset' }))
  })
  test('keeps structured legacy context readable while hiding configuration fields', () => {
    render(<BriefStage campaign={{ id: 'old', revision: 1, title: 'Launch', brief: { product: 'Headphones', audience: 'Commuters', objective: 'Try the collection', offer: '20% off', locale: 'fr', notes: 'Keep it simple.' } }} readOnly />)
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getByLabelText('Campaign description')).toBeEnabled()
    expect(screen.getByLabelText('Campaign description')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Campaign description').value).toContain('Headphones')
    expect(screen.getByLabelText('Campaign description').value).toContain('Keep it simple.')
    expect(screen.queryByRole('button', { name: 'Analyze brief' })).not.toBeInTheDocument()
  })
})
