import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { FeedbackButton } from './FeedbackButton'

test('shows the completed label and icon after its action resolves', async () => {
  const user = userEvent.setup()
  render(<FeedbackButton label="Copy" successLabel="Copied" icon="copy" successIcon="check" onAction={() => Promise.resolve()} />)

  const button = screen.getByRole('button', { name: 'Copy' })
  await user.click(button)

  expect(screen.getByRole('button', { name: 'Copied' })).toHaveTextContent('Copied')
  expect(screen.getByRole('button', { name: 'Copied' }).querySelector('[data-icon="check"]')).toBeTruthy()
})

test('keeps the idle state and reports rejected actions', async () => {
  const user = userEvent.setup()
  const onError = vi.fn()
  render(<FeedbackButton label="Save" successLabel="Saved" onAction={() => Promise.reject(new Error('Denied'))} onError={onError} />)

  await user.click(screen.getByRole('button', { name: 'Save' }))

  expect(screen.getByRole('button', { name: 'Save' })).toHaveTextContent('Save')
  expect(onError).toHaveBeenCalledOnce()
})
