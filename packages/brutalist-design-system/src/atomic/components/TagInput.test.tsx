import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { TagInput } from './TagInput'

function Example(props: Partial<React.ComponentProps<typeof TagInput>> = {}) {
  const [value, setValue] = useState<string[]>(props.value as string[] ?? [])
  return <TagInput label="Keywords" {...props} value={value} onChange={setValue} />
}

test('adds a trimmed tag on Enter and clears the field', async () => {
  const user = userEvent.setup()
  render(<Example />)
  const field = screen.getByRole('textbox', { name: 'Keywords' })
  await user.type(field, '  winter light  {Enter}')
  expect(screen.getByText('winter light')).toBeVisible()
  expect(field).toHaveValue('')
})

test('ignores a duplicate tag case-insensitively and an empty entry', async () => {
  const user = userEvent.setup()
  render(<Example value={['Winter light']} />)
  const field = screen.getByRole('textbox', { name: 'Keywords' })
  await user.type(field, 'WINTER LIGHT{Enter}')
  expect(screen.getAllByText(/winter light/i)).toHaveLength(1)
  await user.type(field, '   {Enter}')
  expect(screen.getAllByText(/winter light/i)).toHaveLength(1)
})

test('removes a tag with its remove button and with Backspace on an empty field', async () => {
  const user = userEvent.setup()
  render(<Example value={['tram stop', 'cosy classroom']} />)
  await user.click(screen.getByRole('button', { name: 'Remove tram stop' }))
  expect(screen.queryByText('tram stop')).not.toBeInTheDocument()
  await user.click(screen.getByRole('textbox', { name: 'Keywords' }))
  await user.keyboard('{Backspace}')
  expect(screen.queryByText('cosy classroom')).not.toBeInTheDocument()
})

test('commits a typed value on blur so it is not lost', async () => {
  const user = userEvent.setup()
  render(<Example />)
  await user.type(screen.getByRole('textbox', { name: 'Keywords' }), 'snowy street')
  await user.tab()
  expect(screen.getByText('snowy street')).toBeVisible()
})

test('respects maxLength and maxItems, and hides the entry field once full', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<TagInput label="Keywords" value={[]} onChange={onChange} maxLength={5} />)
  await user.type(screen.getByRole('textbox', { name: 'Keywords' }), 'winter light{Enter}')
  expect(onChange).toHaveBeenCalledWith(['winte'])
  render(<TagInput label="Keywords" value={['a', 'b']} onChange={vi.fn()} maxItems={2} />)
  expect(screen.queryAllByRole('textbox', { name: 'Keywords' })).toHaveLength(1)
})

test('disabled removes remove buttons and the entry field, while keeping existing tags visible', () => {
  render(<TagInput label="Keywords" value={['tram stop']} onChange={vi.fn()} disabled />)
  expect(screen.getByText('tram stop')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Remove tram stop' })).not.toBeInTheDocument()
  expect(screen.queryByRole('textbox', { name: 'Keywords' })).not.toBeInTheDocument()
})

test('wires instructions and error to the entry field, and the placeholder text', () => {
  render(<TagInput label="Keywords" value={[]} onChange={vi.fn()} instructions="Press Enter to add." error="Too many keywords." placeholder="Add a keyword" />)
  const field = screen.getByRole('textbox', { name: 'Keywords' })
  expect(field).toHaveAccessibleDescription('Press Enter to add. Too many keywords.')
  expect(field).toHaveAttribute('aria-invalid', 'true')
  expect(field).toHaveAttribute('placeholder', 'Add a keyword')
})
