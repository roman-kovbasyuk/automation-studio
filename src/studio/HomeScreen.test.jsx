import { changeControl } from "../test/selectOption.js"
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { HomeScreen } from './HomeScreen.jsx'

describe('Home creation entry', () => {
  test('keeps a typed draft and explains why AI submission is paused', () => {
    render(<HomeScreen onSave={vi.fn()} readiness={{
      state: 'paused', reasonCode: 'kill_switch_active', message: 'AI generation is paused.',
      destination: 'vertex-eu', textModel: 'gemini-3.5-flash', imageModel: null,
      maskedCredential: null, spendingControl: 'external',
    }} />)
    changeControl(screen.getByRole('textbox'), { target: { value: 'Synthetic bookshop launch' } })
    expect(screen.getByRole('button', { name: 'Send prompt' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Send prompt' }))
    expect(screen.getByRole('textbox')).toHaveValue('Synthetic bookshop launch')
    expect(screen.getByRole('textbox')).toHaveValue('Synthetic bookshop launch')
    expect(screen.getByRole('alert')).toHaveTextContent('AI generation is paused.')
  })

  test('uses one PromptComposer for the banner brief without a secondary asset selector', () => {
    render(<HomeScreen onSave={vi.fn()} />)
    expect(screen.getByRole('form', { name: 'AI prompt input' })).toBeVisible()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText('Add your campaign materials. Up to 25 MB in total.')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What would you like to create?' })).toHaveAttribute('data-type', 'h2')
  })

  test('preserves the prompt and submits the banner project type', async () => {
    const onSave = vi.fn(async () => ({ ok: true }))
    render(<HomeScreen onSave={onSave} />)
    expect(screen.getByRole('button', { name: 'Send prompt' })).toBeDisabled()
    changeControl(screen.getByRole('textbox'), { target: { value: 'Autumn launch for a local bookshop.' } })
    expect(screen.getByRole('textbox')).toHaveValue('Autumn launch for a local bookshop.')
    fireEvent.click(screen.getByRole('button', { name: 'Send prompt' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ projectType: 'banners', brief: { notes: 'Autumn launch for a local bookshop.' } })))
  })

  test('attaches and removes files, then creates a project from a files-only brief', async () => {
    const api = { extractBriefFile: vi.fn(async () => ({ text: 'Launch a bookshop campaign.' })) }
    const onSave = vi.fn(async () => ({ ok: true }))
    render(<HomeScreen api={api} onSave={onSave} />)
    const attach = () => changeControl(screen.getByLabelText('Attach files', { selector: 'input' }), { target: { files: [new File(['Synthetic brief'], 'brief.txt', { type: 'text/plain' })] } })
    attach()
    fireEvent.click(await screen.findByRole('button', { name: 'Remove brief.txt' }))
    expect(screen.getByRole('button', { name: 'Send prompt' })).toBeDisabled()
    attach()
    await screen.findByRole('button', { name: 'Remove brief.txt' })
    fireEvent.click(screen.getByRole('button', { name: 'Send prompt' }))
    // Files are uploaded as project sources in the Brief stage, not extracted on Home.
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ projectType: 'banners', brief: { notes: '' },
      sources: [expect.objectContaining({ name: 'brief.txt', mimeType: 'text/plain' })] })))
    expect(api.extractBriefFile).not.toHaveBeenCalled()
  })

  test('keeps the picker available without adding helper copy around the composer', () => {
    render(<HomeScreen onSave={vi.fn()} />)
    expect(screen.queryByText('Add your campaign materials. Up to 25 MB in total.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Attach files', { selector: 'input' })).toHaveAttribute('accept', '.txt,.md,.markdown,.pdf,.docx')
  })

  test('collects attached files as project sources without extracting them', async () => {
    const api = { extractBriefFile: vi.fn() }
    render(<HomeScreen api={api} onSave={vi.fn()} />)
    changeControl(screen.getByLabelText('Attach files', { selector: 'input' }), { target: { files: [new File(['Source'], 'brief.txt', { type: 'text/plain' })] } })
    await screen.findByRole('button', { name: 'Remove brief.txt' })
    expect(api.extractBriefFile).not.toHaveBeenCalled()
  })

  test('submits a text-only brief with no sources for question review', async () => {
    const onSave = vi.fn(async () => ({ ok: true }))
    render(<HomeScreen onSave={onSave} />)
    changeControl(screen.getByRole('textbox'), { target: { value: 'A synthetic bookshop launch.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send prompt' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ projectType: 'banners', brief: { notes: 'A synthetic bookshop launch.' } })))
    expect(onSave.mock.calls[0][0]).toHaveProperty('sources', [])
  })
})
