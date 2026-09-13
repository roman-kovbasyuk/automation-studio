import { useState } from 'react'
import * as C from 'brutalist-design-system'

export const finalCoverage = { InlineText: C.InlineText, TextAction: C.TextAction, Form: C.Form, FormActions: C.FormActions, SearchField: C.SearchField, PasswordField: C.PasswordField, DatePicker: C.DatePicker, Menu: C.Menu, Dialog: C.Dialog, Drawer: C.Drawer, Popover: C.Popover, Tooltip: C.Tooltip, Toast: C.Toast, Tabs: C.Tabs, WorkflowSteps: C.WorkflowSteps, Table: C.Table, Combobox: C.Combobox, MultiSelect: C.MultiSelect, InlineConfirmation: C.InlineConfirmation, FileDropzone: C.FileDropzone, FileList: C.FileList, EmptyState: C.EmptyState, Spinner: C.Spinner, Skeleton: C.Skeleton }
export function FinalExamples() {
  const [copy, setCopy] = useState('We mitigate it by defining the strict design system documentation, design harness, reusable templates.'), [search, setSearch] = useState(''), [market, setMarket] = useState('no'), [selected, setSelected] = useState<string[]>(['no']), [step, setStep] = useState('copy'), [toast, setToast] = useState(true), [message, setMessage] = useState('')
  const [files, setFiles] = useState([{ id: 'brief', name: 'brief.pdf', size: 1024 }])
  const options = [{ value: 'no', label: 'Norway' }, { value: 'se', label: 'Sweden' }]
  return <C.Stack gap={8}>
    <C.Heading level={2}>Complete component inventory</C.Heading>
    <C.InlineText label="Editable copy" value={copy} onSave={setCopy} />
    <C.TextAction href="#">Back to preview start</C.TextAction>
    <C.Form label="Settings form" onSubmit={event => { event.preventDefault(); setMessage('Saved') }}><C.TextField label="Workspace" defaultValue="Studio" /><C.FormActions onCancel={() => setMessage('Cancelled')} message={message} /></C.Form>
    <C.SearchField label="Campaign search" value={search} onChange={setSearch} />
    <C.PasswordField label="Example password" defaultValue="not-a-secret" />
    <C.DatePicker label="Start date" defaultValue="2026-09-14" />
    <C.Menu label="Asset actions" items={[{ id: 'duplicate', label: 'Duplicate' }, { id: 'delete', label: 'Delete', danger: true }]} onSelect={setMessage} />
    <C.Dialog title="Export campaign" trigger="Open dialog" description="Review formats before export."><C.Button onClick={() => setMessage('Export selected')}>Export</C.Button></C.Dialog>
    <C.Drawer title="Campaign details" trigger="Open drawer"><C.TextField label="Campaign name" defaultValue="Nordic launch" /></C.Drawer>
    <C.Popover label="View options"><C.Checkbox label="Show labels" /></C.Popover>
    <C.Tooltip label="Export help" content="Exports include all selected formats." />
    {toast && <C.Toast title="Saved changes" onDismiss={() => setToast(false)} />}
    <C.Tabs label="Campaign views" items={[{ id: 'brief', label: 'Brief', content: <C.Text>Brief content</C.Text> }, { id: 'copy', label: 'Copy', content: <C.Text>Copy content</C.Text> }]} />
    <C.WorkflowSteps label="Workflow" current={step} onChange={setStep} steps={[{ id: 'brief', label: 'Brief', complete: true }, { id: 'copy', label: 'Copy' }]} />
    <C.Table label="Campaign table" rows={[{ id: 'a', name: 'Nordic launch' }]} rowKey={row => row.id} columns={[{ id: 'name', header: 'Name', render: row => row.name }]} />
    <C.Combobox label="Primary market" value={market} onChange={setMarket} options={options} />
    <C.MultiSelect label="Markets" value={selected} onChange={setSelected} options={options} />
    <C.InlineConfirmation label="Delete draft" question="Delete this draft?" onConfirm={() => setMessage('Deleted')} />
    <C.FileDropzone label="Upload files" multiple onFiles={items => setFiles(items.map((file, i) => ({ id: String(i), name: file.name, size: file.size })))} />
    <C.FileList files={files} onRemove={id => setFiles(current => current.filter(file => file.id !== id))} />
    <C.EmptyState title="No more campaigns" description="Create a campaign to get started." />
    <C.Spinner label="Loading example" /><C.Skeleton label="Loading details" />
  </C.Stack>
}
