import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import * as C from './index'
test('Dialog traps context, closes with Escape and returns focus to trigger', async () => {
  const user = userEvent.setup()
  function Example() { const [open, setOpen] = useState(false); return <C.Dialog title="Confirm export" description="Review before exporting." trigger="Open dialog" open={open} onOpenChange={setOpen}><C.Button>Export</C.Button></C.Dialog> }
  render(<Example />); await user.click(screen.getByRole('button', { name: 'Open dialog' }))
  expect(screen.getByRole('dialog', { name: 'Confirm export' })).toBeInTheDocument()
  expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Review before exporting.')
  await user.keyboard('{Escape}'); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await waitFor(() => expect(screen.getByRole('button', { name: 'Open dialog' })).toHaveFocus())
})
test('Drawer preserves dialog semantics and a named close action', async () => {
  const user = userEvent.setup()
  function Example() { const [open, setOpen] = useState(false); return <C.Drawer title="Details" trigger="Open drawer" open={open} onOpenChange={setOpen}>Campaign details</C.Drawer> }
  render(<Example />); await user.click(screen.getByRole('button', { name: 'Open drawer' })); expect(screen.getByRole('dialog', { name: 'Details' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Close dialog' })); expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
test('Menu provides item icons, keyboard selection and disabled items', async () => {
  const select = vi.fn(), user = userEvent.setup()
  render(<C.Menu label="Asset actions" items={[{ id: 'copy', label: 'Duplicate', icon: 'copy' }, { id: 'delete', label: 'Delete', icon: 'delete', disabled: true }]} onSelect={select} />)
  await user.click(screen.getByRole('button', { name: 'Asset actions' }))
  expect(screen.getByRole('menuitem', { name: 'Duplicate' }).querySelector('[data-icon="copy"]')).toBeTruthy()
  const duplicate = screen.getByRole('menuitem', { name: 'Duplicate' })
  expect(duplicate).toHaveClass('c-menu__item')
  expect(duplicate.querySelector('button')).toBeNull()
  expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveAttribute('data-disabled')
  await user.keyboard('{Home}{Enter}'); expect(select).toHaveBeenCalledWith('copy')
})
test('Popover exposes labelled contextual content and dismisses on Escape', async () => {
  const user = userEvent.setup(); render(<C.Popover label="Display settings"><C.Checkbox label="Show labels" /></C.Popover>)
  await user.click(screen.getByRole('button', { name: 'Display settings' })); expect(screen.getByRole('checkbox', { name: 'Show labels' })).toBeInTheDocument()
  await user.keyboard('{Escape}'); expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
})
test('Tooltip is available on keyboard focus', async () => {
  const user = userEvent.setup(); render(<C.Tooltip label="Help" content="Export includes all formats." />)
  await user.tab(); expect(await screen.findByRole('tooltip')).toHaveTextContent('Export includes all formats.')
})
test('Tabs arrow keys select matching content and skip disabled tabs', async () => {
  const user = userEvent.setup(); render(<C.Tabs label="Campaign views" items={[{ id: 'brief', label: 'Brief', content: 'Brief content' }, { id: 'copy', label: 'Copy', content: 'Copy content', disabled: true }, { id: 'assets', label: 'Assets', content: 'Assets content' }]} />)
  screen.getByRole('tab', { name: 'Brief' }).focus(); await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('tab', { name: 'Assets' })).toHaveAttribute('aria-selected', 'true'); expect(screen.getByRole('tabpanel')).toHaveTextContent('Assets content')
})
test('Tabs exposes a compact 44px size variant', () => {
  const items = [{ id: 'brief', label: 'Brief', content: 'Brief content' }]
  const view = render(<C.Tabs label="Campaign views" items={items} />)
  expect(screen.getByRole('tablist')).toHaveAttribute('data-size', 'default')
  view.rerender(<C.Tabs label="Campaign views" items={items} size="compact" />)
  expect(screen.getByRole('tablist')).toHaveAttribute('data-size', 'compact')
})
test('Combobox filters, keyboard selects, and emits an option value', async () => {
  const user = userEvent.setup(), change = vi.fn()
  render(<C.Combobox label="Market" value="" onChange={change} options={[{ value: 'no', label: 'Norway' }, { value: 'se', label: 'Sweden' }]} />)
  await user.type(screen.getByRole('combobox'), 'Nor{ArrowDown}{Enter}'); expect(change).toHaveBeenCalledWith('no')
})
test('MultiSelect composes selectable options and removable tags', async () => {
  const user = userEvent.setup()
  function Example() { const [value, setValue] = useState<string[]>([]); return <C.MultiSelect label="Channels" value={value} onChange={setValue} options={[{ value: 'social', label: 'Social' }, { value: 'email', label: 'Email', disabled: true }]} /> }
  render(<Example />); await user.click(screen.getByRole('button', { name: /Channels/ })); await user.click(screen.getByRole('checkbox', { name: 'Social' }))
  expect(screen.getByRole('checkbox', { name: 'Email' })).toBeDisabled(); await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Remove Social' })); expect(screen.queryByRole('button', { name: 'Remove Social' })).not.toBeInTheDocument()
})
test('Combobox ArrowUp from no active option selects the last enabled option', async () => {
  const user = userEvent.setup(), change = vi.fn()
  render(<C.Combobox label="Market" value="" onChange={change} options={[{ value: 'no', label: 'Norway' }, { value: 'se', label: 'Sweden' }, { value: 'dk', label: 'Denmark', disabled: true }]} />)
  await user.click(screen.getByRole('combobox')); await user.keyboard('{ArrowUp}{Enter}')
  expect(change).toHaveBeenCalledWith('se')
})
test('InlineConfirmation requires confirmation and restores trigger focus on cancel', async () => {
  const user = userEvent.setup(), confirm = vi.fn()
  render(<C.InlineConfirmation label="Delete draft" question="Delete this draft?" onConfirm={confirm} />)
  await user.click(screen.getByRole('button', { name: 'Delete draft' })); expect(confirm).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Cancel' })); expect(screen.getByRole('button', { name: 'Delete draft' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Delete draft' })); await user.click(screen.getByRole('button', { name: 'Confirm' })); expect(confirm).toHaveBeenCalledTimes(1)
})
