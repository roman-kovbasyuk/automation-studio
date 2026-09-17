import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import * as C from './index'

test('InlineText autosaves on blur and does not expose Save or Cancel controls', async () => {
  const user = userEvent.setup()
  function Example() { const [value, setValue] = useState('Campaign'); return <><C.InlineText label="Title" value={value} onSave={setValue} /><button>Next</button></> }
  render(<Example />)
  await user.click(screen.getByRole('button', { name: 'Edit Title' }))
  const input = screen.getByRole('textbox', { name: 'Title' })
  await user.clear(input); await user.type(input, 'Updated campaign'); await user.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Title' })).toHaveTextContent('Updated campaign'))
  expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
})
test('InlineText keeps a failed draft and retries rather than discarding it', async () => {
  const user = userEvent.setup(), save = vi.fn().mockResolvedValueOnce({ ok: false, message: 'Offline' }).mockResolvedValueOnce(undefined)
  render(<C.InlineText label="Title" value="Original" onSave={save} />)
  await user.click(screen.getByRole('button', { name: 'Edit Title' })); await user.type(screen.getByRole('textbox'), ' changed{Enter}')
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline')
  expect(screen.getByRole('textbox')).toHaveValue('Original changed')
  await user.type(screen.getByRole('textbox'), '{Enter}')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Title' })).toHaveTextContent('Original changed'))
})
test('InlineText Escape restores original text and cannot save when read-only', async () => {
  const user = userEvent.setup(), save = vi.fn()
  const view = render(<C.InlineText label="Title" value="Original" onSave={save} />)
  await user.click(screen.getByRole('button', { name: 'Edit Title' })); await user.type(screen.getByRole('textbox'), ' discarded{Escape}')
  expect(screen.getByRole('button', { name: 'Edit Title' })).toHaveTextContent('Original')
  expect(save).not.toHaveBeenCalled()
  view.rerender(<C.InlineText label="Title" value="Original" onSave={save} readOnly />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
test('InlineText captures source identity when editing starts', async () => {
  const user = userEvent.setup(), save = vi.fn()
  const view = render(<C.InlineText label="Title" value="Original" sourceKey="a" onSave={save} />)
  await user.click(screen.getByRole('button', { name: 'Edit Title' })); await user.type(screen.getByRole('textbox'), ' edit')
  view.rerender(<C.InlineText label="Title" value="External" sourceKey="b" onSave={save} />)
  await user.type(screen.getByRole('textbox'), '{Enter}')
  expect(save).toHaveBeenCalledWith('Original edit', 'a')
})
