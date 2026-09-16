import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { CopyEditor } from './CopyEditor.jsx'

const authoredCopy = { id: 'supplied-1', origin: 'supplied', headline: '  Exact supplied headline  ', body: '', offer: '', cta: '' }
const generatedCopy = { id: 'generated-1', headline: 'Generated headline', body: 'Generated body', offer: '', cta: 'Learn more' }

test('saves a headline-only authored copy without changing its whitespace', async () => {
  const onSave = vi.fn(async () => ({ ok: true }))
  render(<CopyEditor copy={authoredCopy} inputKey="source-key" onSave={onSave} onClose={vi.fn()} readOnly={false} />)

  expect(screen.getByRole('textbox', { name: 'Headline' })).toHaveValue('  Exact supplied headline  ')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() => expect(onSave).toHaveBeenCalledWith('supplied-1', {
    headline: '  Exact supplied headline  ', body: '', offer: '', cta: '',
  }, { expectedInputKey: 'source-key' }))
})

test('keeps generated-copy required-field validation', async () => {
  const onSave = vi.fn()
  render(<CopyEditor copy={generatedCopy} inputKey="source-key" onSave={onSave} onClose={vi.fn()} readOnly={false} />)

  fireEvent.change(screen.getByRole('textbox', { name: 'Body' }), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  expect(onSave).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox', { name: 'Body' })).toBeRequired()
})
