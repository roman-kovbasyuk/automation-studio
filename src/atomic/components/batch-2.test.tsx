import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import * as components from './index'

test('second batch exposes its five reusable components', () => {
  for (const name of ['Toggle', 'TextArea', 'Select', 'Tag', 'SegmentedControl']) {
    expect(components).toHaveProperty(name, expect.any(Function))
  }
})

test('Toggle submits native checked state and cannot change while disabled', async () => {
  const user = userEvent.setup()
  const view = render(<form aria-label="Preferences"><components.Toggle label="Autosave" name="autosave" instructions="Saves changes automatically" /></form>)
  const control = screen.getByRole('switch', { name: 'Autosave' })
  expect(control).toHaveAccessibleDescription('Saves changes automatically')
  await user.click(screen.getByText('Autosave'))
  expect(control).toBeChecked()
  expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('autosave')).toBe('on')
  view.rerender(<form aria-label="Preferences"><components.Toggle label="Autosave" name="autosave" checked disabled /></form>)
  await user.click(control)
  expect(control).toBeChecked()
  expect(new FormData(screen.getByRole('form') as HTMLFormElement).has('autosave')).toBe(false)
})

test('TextArea wires labels and errors without losing controlled multiline edits', async () => {
  const user = userEvent.setup()
  function Example() {
    const [value, setValue] = useState('')
    return <components.TextArea label="Brief" value={value} onChange={e => setValue(e.target.value)} instructions="Describe the campaign" error={!value ? 'Brief is required' : undefined} />
  }
  render(<Example />)
  const field = screen.getByRole('textbox', { name: 'Brief' })
  expect(field).toHaveAccessibleDescription('Describe the campaign Brief is required')
  await user.type(field, 'First line{Enter}Second line')
  expect(field).toHaveValue('First line\nSecond line')
  expect(field).not.toHaveAttribute('aria-invalid')
})

test('Select keeps placeholder and disabled choices out of valid selection', async () => {
  const user = userEvent.setup()
  render(<form aria-label="Channel"><components.Select label="Channel" name="channel" placeholder="Choose a channel" options={[{ value: 'social', label: 'Paid social' }, { value: 'email', label: 'Email', disabled: true }]} instructions="One channel" /></form>)
  const select = screen.getByRole('combobox', { name: 'Channel' })
  expect(select).toHaveTextContent('Choose a channel')
  expect(select).toHaveAccessibleDescription('One channel')
  await user.click(select)
  expect(screen.getByRole('option', { name: 'Email' })).toHaveAttribute('aria-disabled', 'true')
  await user.click(screen.getByRole('option', { name: 'Paid social' }))
  expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('channel')).toBe('social')
})

test('Tag removal has an explicit accessible action and removes only its item', async () => {
  const user = userEvent.setup()
  function Example() {
    const [visible, setVisible] = useState(true)
    return <>{visible && <components.Tag removeLabel="Remove paid social" onRemove={() => setVisible(false)} icon="check">Paid social</components.Tag>}<components.Tag>Default</components.Tag></>
  }
  render(<Example />)
  await user.click(screen.getByRole('button', { name: 'Remove paid social' }))
  expect(screen.queryByText('Paid social')).not.toBeInTheDocument()
  expect(screen.getByText('Default')).toBeInTheDocument()
})

const options = [{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact', disabled: true }, { value: 'spacious', label: 'Spacious' }]
test('SegmentedControl keyboard skips disabled items, wraps, and submits selection', async () => {
  const user = userEvent.setup()
  render(<form aria-label="View"><components.SegmentedControl label="Density" name="density" options={options} defaultValue="comfortable" /></form>)
  const first = screen.getByRole('radio', { name: 'Comfortable' }), last = screen.getByRole('radio', { name: 'Spacious' })
  first.focus(); await user.keyboard('{ArrowRight}')
  expect(last).toHaveFocus()
  expect(last).toHaveAttribute('aria-checked', 'true')
  expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('density')).toBe('spacious')
  await user.keyboard('{ArrowRight}')
  expect(first).toHaveFocus()
  await user.keyboard('{End}')
  expect(last).toHaveFocus()
  await user.keyboard('{Home}')
  expect(first).toHaveFocus()
})

test('SegmentedControl respects controlled value and disabled/empty groups', async () => {
  const user = userEvent.setup()
  function Example() {
    const [value, setValue] = useState('comfortable')
    return <components.SegmentedControl label="Density" options={options} value={value} onChange={setValue} />
  }
  const view = render(<Example />)
  await user.click(screen.getByRole('radio', { name: 'Spacious' }))
  expect(screen.getByRole('radio', { name: 'Spacious' })).toHaveAttribute('aria-checked', 'true')
  view.rerender(<components.SegmentedControl label="Density" options={options} disabled />)
  expect(screen.getAllByRole('radio').every(el => el.hasAttribute('disabled'))).toBe(true)
  view.rerender(<components.SegmentedControl label="Density" options={[]} />)
  expect(screen.queryAllByRole('radio')).toHaveLength(0)
})

test('SegmentedControl exposes a compact 44px size variant', () => {
  render(<components.SegmentedControl label="Density" options={options} size="compact" />)
  expect(screen.getByRole('radiogroup', { name: 'Density' })).toHaveAttribute('data-size', 'compact')
})
