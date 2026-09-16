import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { CopyManualEntryView } from './CopyManualEntryView.jsx'

const value = { headline: '', body: '', offer: '', cta: '' }

test('emits the complete changed fields and delegates add intent', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  const onSubmit = vi.fn()
  render(<CopyManualEntryView value={value} onChange={onChange} onSubmit={onSubmit} disabled={false} error={null} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Headline' }), { target: { value: 'Travel lighter' } })
  expect(onChange).toHaveBeenCalledWith({ ...value, headline: 'Travel lighter' })
  await user.click(screen.getByRole('button', { name: 'Add copy' }))
  expect(onSubmit).toHaveBeenCalledOnce()
  expect(screen.getByRole('textbox', { name: 'Body' })).toHaveValue('')
})

test('keeps all input and submit intents disabled while showing root validation feedback', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  const onSubmit = vi.fn()
  render(<CopyManualEntryView value={value} onChange={onChange} onSubmit={onSubmit} disabled error="Enter a headline, body, offer, or CTA." />)
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a headline, body, offer, or CTA.')
  expect(screen.getByRole('textbox', { name: 'Headline' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Add copy' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Add copy' }))
  expect(onSubmit).not.toHaveBeenCalled()
})
