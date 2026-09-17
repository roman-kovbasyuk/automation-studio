import { fireEvent, render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { Button, Panel, TextField, Checkbox, RadioGroup } from './index'

test('button activates from keyboard, defaults to button, and blocks busy actions', async () => {
  const user = userEvent.setup(), action = vi.fn()
  const view = render(<Button onClick={action}>Create project</Button>)
  const button = screen.getByRole('button', { name: 'Create project' })
  expect(button).toHaveAttribute('type', 'button')
  button.focus(); await user.keyboard('{Enter}')
  expect(action).toHaveBeenCalledTimes(1)
  view.rerender(<Button onClick={action} busy>Create project</Button>)
  await user.click(button)
  expect(button).toBeDisabled()
  expect(button).toHaveAttribute('aria-busy', 'true')
  expect(action).toHaveBeenCalledTimes(1)
})

test('icon-only actions keep their supplied accessible name', () => {
  render(<Button iconOnly icon="search" aria-label="Search projects" />)
  expect(screen.getByRole('button', { name: 'Search projects' })).toBeEnabled()
  expect(screen.queryByRole('img')).toBeNull()
})

test('Panel labels the section and retains zero-valued description and content', () => {
  render(<Panel title="Project brief" description={0}>{0}</Panel>)
  const panel = screen.getByRole('region', { name: 'Project brief' })
  expect(within(panel).getByRole('heading', { name: 'Project brief' })).toHaveAttribute('data-type', 'h4')
  expect(within(panel).getAllByText('0')).toHaveLength(2)
})

test('TextField connects unique labels, helper, errors, and caller descriptions', async () => {
  const user = userEvent.setup()
  render(<><span id="external">Additional context</span><TextField label="Project title" instructions="Use a short title" error="Title is required" aria-describedby="external" /><TextField label="Second title" /></>)
  const field = screen.getByRole('textbox', { name: 'Project title' })
  expect(field).toHaveAccessibleDescription('Additional context Use a short title Title is required')
  expect(field).toHaveAttribute('aria-invalid', 'true')
  expect(field.id).not.toBe(screen.getByRole('textbox', { name: 'Second title' }).id)
  await user.type(field, 'Nordic launch')
  expect(field).toHaveValue('Nordic launch')
})

test('Checkbox exposes mixed state and uses a native labelled control', async () => {
  const user = userEvent.setup(), change = vi.fn()
  const view = render(<Checkbox label="Include animation" indeterminate onChange={change} instructions="Optional" />)
  const checkbox = screen.getByRole('checkbox', { name: 'Include animation' })
  expect(checkbox).toBePartiallyChecked()
  expect(checkbox).toHaveAccessibleDescription('Optional')
  await user.click(screen.getByText('Include animation'))
  expect(change).toHaveBeenCalledTimes(1)
  view.rerender(<Checkbox label="Include animation" disabled />)
  expect(checkbox).not.toBePartiallyChecked()
  await user.click(checkbox)
  expect(change).toHaveBeenCalledTimes(1)
})

const options = [{ value: 'square', label: 'Square' }, { value: 'portrait', label: 'Portrait' }, { value: 'wide', label: 'Wide', disabled: true }]
test('RadioGroup keeps four pixels of horizontal breathing room', () => {
  render(<RadioGroup label="Export format" options={options} />)
  const group = screen.getByRole('group', { name: 'Export format' })
  expect(group).toHaveClass('c-radio-group')
  const css = readFileSync(resolve(process.cwd(), 'src/atomic/components/forms.css'), 'utf8')
  expect(css).toMatch(/\.c-radio-group\s*\{[^}]*padding:\s*0\s+var\(--a-space-1\)/)
})

test('RadioGroup respects controlled selection and reports the chosen value', async () => {
  const user = userEvent.setup(), change = vi.fn()
  const view = render(<RadioGroup label="Export format" options={options} value="square" onChange={change} instructions="Choose one" />)
  expect(screen.getByRole('group', { name: 'Export format' })).toHaveAccessibleDescription('Choose one')
  await user.click(screen.getByRole('radio', { name: 'Portrait' }))
  expect(change).toHaveBeenCalledWith('portrait')
  expect(screen.getByRole('radio', { name: 'Square' })).toBeChecked()
  view.rerender(<RadioGroup label="Export format" options={options} value="portrait" onChange={change} />)
  expect(screen.getByRole('radio', { name: 'Portrait' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Wide' })).toBeDisabled()
})

test('RadioGroup tags variant draws wrapping tags over native radios', async () => {
  const user = userEvent.setup(), change = vi.fn()
  render(<RadioGroup variant="tags" label="Export format" options={options} value="square" onChange={change} instructions="Choose one" error="Choose a format." />)
  const group = screen.getByRole('group', { name: 'Export format' })
  expect(group).toHaveClass('c-radio-group', 'c-radio-group--tags')
  expect(group).toHaveAccessibleDescription('Choose one Choose a format.')
  expect(within(group).getAllByRole('radio')).toHaveLength(3)
  screen.getByRole('radio', { name: 'Portrait' }).focus()
  await user.keyboard(' ')
  expect(change).toHaveBeenCalledWith('portrait')
  expect(screen.getByRole('radio', { name: 'Square' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Wide' })).toBeDisabled()
  const css = readFileSync(resolve(process.cwd(), 'src/atomic/components/forms.css'), 'utf8')
  expect(css).toMatch(/\.c-radio-tags\s*\{[^}]*flex-wrap:\s*wrap/)
  expect(css).toMatch(/\.c-radio-group--tags \.c-choice-row:has\(\.c-radio:checked\)[^{]*\{[^}]*background:\s*var\(--a-color-accent\)/)
  expect(css).toMatch(/\.c-radio-group--tags \.c-choice-row:has\(\.c-radio:focus-visible\)\s*\{[^}]*outline/)
  expect(css).toMatch(/forced-colors: active\) \{ \.c-radio-group--tags \.c-radio \{[^}]*opacity:\s*1/)
})

test('RadioGroup tags variant shows the custom answer only while it is selected', async () => {
  function Example() {
    const [value, setValue] = useState('square'), [text, setText] = useState('')
    return <RadioGroup variant="tags" label="Goal" options={options} value={value} onChange={setValue} customOption={{ value: 'other', label: 'Other', text, onTextChange: setText }} />
  }
  const user = userEvent.setup()
  render(<Example />)
  expect(screen.queryByRole('textbox', { name: 'Other answer' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: 'Other' }))
  await user.type(screen.getByRole('textbox', { name: 'Other answer' }), 'Open day visits')
  expect(screen.getByRole('textbox', { name: 'Other answer' })).toHaveValue('Open day visits')
  await user.click(screen.getByRole('radio', { name: 'Square' }))
  expect(screen.queryByRole('textbox', { name: 'Other answer' })).not.toBeInTheDocument()
})

test('uncontrolled RadioGroup allows native keyboard selection and group disabling', async () => {
  const user = userEvent.setup()
  const view = render(<form aria-label="Export"><RadioGroup label="Format" name="format" options={options} defaultValue="square" /><Checkbox label="Animate" name="animate" defaultChecked /></form>)
  screen.getByRole('radio', { name: 'Square' }).focus()
  await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('radio', { name: 'Portrait' })).toBeChecked()
  expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('format')).toBe('portrait')
  view.rerender(<form aria-label="Export"><RadioGroup label="Format" name="format" options={options} disabled /></form>)
  expect(new FormData(screen.getByRole('form') as HTMLFormElement).has('format')).toBe(false)
})
