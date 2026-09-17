import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as C from './index'

test('Form and FormActions submit and cancel through shared controls', async () => {
  const submit = vi.fn(), cancel = vi.fn(), user = userEvent.setup()
  render(<C.Form label="Settings" onSubmit={event => { event.preventDefault(); submit() }}><C.FormActions onCancel={cancel} submitLabel="Save settings" /></C.Form>)
  await user.click(screen.getByRole('button', { name: 'Save settings' })); expect(submit).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button', { name: 'Cancel' })); expect(cancel).toHaveBeenCalledTimes(1)
})
test('TextAction keeps links semantic and disabled actions inert', async () => {
  const click = vi.fn(), user = userEvent.setup()
  render(<><C.TextAction href="/projects">Projects</C.TextAction><C.TextAction onClick={click} disabled>Archive</C.TextAction></>)
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects')
  await user.click(screen.getByRole('button', { name: 'Archive' })); expect(click).not.toHaveBeenCalled()
})
test('PasswordField reveal keeps the same value and SearchField clear resets text', async () => {
  const user = userEvent.setup()
  function Example() { const [value, setValue] = useState('Oslo'); return <><C.PasswordField label="Password" defaultValue="example" /><C.SearchField label="Search" value={value} onChange={setValue} /></> }
  render(<Example />)
  await user.click(screen.getByRole('button', { name: 'Show Password' })); expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('type', 'text')
  await user.click(screen.getByRole('button', { name: 'Clear Search' })); expect(screen.getByRole('searchbox')).toHaveValue('')
})
test('SearchField shows a search glyph when empty and an unlabeled clear icon when populated', () => {
  const { rerender } = render(<C.SearchField label="Search" value="" onChange={() => {}} />)
  expect(screen.getByRole('searchbox')).toHaveValue('')
  expect(screen.getByRole('searchbox').parentElement?.querySelector('[data-icon="search"]')).not.toBeNull()
  expect(screen.queryByRole('button', { name: 'Clear Search' })).not.toBeInTheDocument()
  rerender(<C.SearchField label="Search" value="Oslo" onChange={() => {}} />)
  expect(screen.getByRole('button', { name: 'Clear Search' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Clear Search' })).toHaveAttribute('data-variant', 'quiet')
  expect(screen.getByRole('button', { name: 'Clear Search' }).querySelector('[data-icon="close"]')).not.toBeNull()
})
test('DatePicker disables its field and calendar trigger', () => {
  render(<C.DatePicker label="Start" min="2026-01-01" max="2026-12-31" disabled />)
  expect(screen.getByLabelText('Start')).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Open Start calendar' })).toBeDisabled()
})
test('loading and empty feedback have explicit accessible content', () => {
  render(<><C.Spinner label="Loading assets" /><C.Skeleton label="Loading project" /><C.EmptyState title="No projects" description="Create your first project." /></>)
  expect(screen.getByRole('status', { name: 'Loading assets' })).toBeInTheDocument()
  expect(screen.getByRole('status', { name: 'Loading project' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'No projects' })).toBeInTheDocument()
})
test('FileDropzone accepts valid files and reports size rejections', async () => {
  const user = userEvent.setup(), change = vi.fn()
  render(<C.FileDropzone label="Upload assets" onFiles={change} maxSize={10} />)
  await user.upload(screen.getByLabelText('Upload assets'), new File(['ok'], 'asset.txt'))
  expect(change).toHaveBeenCalledTimes(1)
  await user.upload(screen.getByLabelText('Upload assets'), new File(['this is too large'], 'large.txt'))
  expect(screen.getByRole('alert')).toHaveTextContent('large.txt')
  expect(change).toHaveBeenCalledTimes(1)
})
test('FileDropzone exposes a small container size', () => {
  render(<C.FileDropzone label="Upload assets" onFiles={() => {}} size="small" />)
  const dropzone = screen.getByText('Upload assets').closest('.c-file-dropzone')
  expect(dropzone).toHaveAttribute('data-size', 'small')
  expect(dropzone).toHaveAttribute('style', expect.stringContaining('padding: var(--a-space-4)'))
})
test('FileList removal identifies only the selected file', async () => {
  const remove = vi.fn(), user = userEvent.setup()
  render(<C.FileList files={[{ id: 'a', name: 'brief.pdf', size: 1024 }]} onRemove={remove} />)
  await user.click(screen.getByRole('button', { name: 'Remove brief.pdf' })); expect(remove).toHaveBeenCalledWith('a')
})
test('FileList file icon matches compact remove button height', () => {
  const css = readFileSync(resolve(__dirname, 'files.css'), 'utf8')
  expect(css).toContain('.c-file-list__icon { display: grid; place-items: center; width: var(--a-size-compact); height: var(--a-size-compact); border: var(--a-border-width) solid var(--a-color-ink); border-radius: var(--a-radius-pill); background: var(--a-color-accent); }')
  render(<C.FileList files={[{ id: 'a', name: 'brief.pdf', size: 1024 }]} onRemove={() => {}} />)
  expect(screen.getByRole('listitem').querySelector('.c-file-list__icon')).not.toBeNull()
  expect(screen.getByRole('button', { name: 'Remove brief.pdf' })).toHaveAttribute('data-size', 'compact')
})
test('WorkflowSteps marks current step and disables unavailable destinations', async () => {
  const change = vi.fn(), user = userEvent.setup()
  render(<C.WorkflowSteps label="Project workflow" current="copy" onChange={change} steps={[{ id: 'brief', label: 'Brief', complete: true }, { id: 'copy', label: 'Copy' }, { id: 'export', label: 'Export', disabled: true }]} />)
  expect(screen.getByRole('button', { name: /Copy/ })).toHaveAttribute('aria-current', 'step')
  await user.click(screen.getByRole('button', { name: /Export/ })); expect(change).not.toHaveBeenCalled()
})

test('WorkflowSteps aligns circles to headers with 8px copy spacing', () => {
  const css = readFileSync(resolve(__dirname, 'workflow.css'), 'utf8')
  expect(css).toContain('.c-workflow__step { display: flex; align-items: flex-start;')
  expect(css).toContain('.c-workflow__copy { display: grid; gap: var(--a-space-2); }')
})
test('Table sorting reports column and direction with semantic headers', async () => {
  const sort = vi.fn(), user = userEvent.setup()
  render(<C.Table label="Projects" rows={[{ id: 'a', name: 'Oslo' }]} rowKey={row => row.id} columns={[{ id: 'name', header: 'Name', render: row => row.name, sortable: true }]} sort={{ column: 'name', direction: 'asc' }} onSort={sort} />)
  expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending')
  await user.click(screen.getByRole('button', { name: /Name/ })); expect(sort).toHaveBeenCalledWith({ column: 'name', direction: 'desc' })
})
test('Toast dismissal is explicit and named', async () => {
  const close = vi.fn(), user = userEvent.setup()
  render(<C.Toast title="Saved" onDismiss={close} />)
  expect(screen.getByRole('status')).toHaveTextContent('Saved')
  await user.click(screen.getByRole('button', { name: 'Dismiss notification' })); expect(close).toHaveBeenCalledTimes(1)
})
