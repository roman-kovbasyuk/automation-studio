import { useState } from 'react'
import { Inline, Stack, Surface, Text } from '../atoms'
import * as C from '../components'
import { CatalogSection as Section } from './CatalogSection'
import { CatalogFilters } from './CatalogFilters'
import { UploadExample } from './UploadExample'

const initialCopy = 'We mitigate it by defining the strict design system documentation, design harness, reusable templates.'
export function ComponentsFinal() {
  const [confirmationOpen,setConfirmationOpen]=useState(false),[warningOpen,setWarningOpen]=useState(false)
  const cities=['Amsterdam','Berlin','Copenhagen','Geneva','London','Oslo','Paris','Stockholm','Vienna','Zurich']
  const [copy, setCopy] = useState(initialCopy), [title, setTitle] = useState('Campaign brief'), [readOnly, setReadOnly] = useState(false), [failSave, setFailSave] = useState(false)
  const [message, setMessage] = useState(''), [search, setSearch] = useState('')
  const [workflow, setWorkflow] = useState('copy'), [vertical, setVertical] = useState(false), [toast, setToast] = useState(true)
  const [files, setFiles] = useState([{ id: 'brief', name: 'Campaign brief.pdf', size: 24576 }])
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'name', direction: 'asc' })
  const rows = [{ id: '1', name: 'Nordic launch', status: 'Ready' }, { id: '2', name: 'Oslo stories', status: 'Review due' }].sort((a, b) => a.name.localeCompare(b.name) * (sort.direction === 'asc' ? 1 : -1))
  return <>
    <Section id="component-inline-text" title="Text with inline editing" filters={<CatalogFilters label="Inline editing"><C.Toggle label="Read only" checked={readOnly} onChange={e => setReadOnly(e.target.checked)} /><C.Toggle label="Simulate save failure" checked={failSave} onChange={e => setFailSave(e.target.checked)} /></CatalogFilters>}>
      <C.InlineText label="Campaign heading" variant="h4" value={title} readOnly={readOnly} required onSave={value => { if (failSave) return { ok: false, message: 'Save failed. Your draft is preserved.' }; setTitle(value) }} />
      <C.InlineText label="Body copy" value={copy} readOnly={readOnly} onSave={value => { if (failSave) return { ok: false, message: 'Save failed. Your draft is preserved.' }; setCopy(value) }} />
      <Surface tone="canvas" radius="small" padding={4}><C.InlineText label="Copy on canvas" value={copy} readOnly={readOnly} onSave={setCopy} /></Surface>
      <Text variant="small" tone="secondary">Click text to edit. Black at 3% opacity highlights the underlying surface. Enter or leaving the field saves; Shift+Enter adds a line; Escape reverts.</Text>
    </Section>
    <Section id="component-text-action" title="Text action"><Inline><C.TextAction href="#component-inline-text">See inline editing</C.TextAction><C.TextAction onClick={() => setMessage('Text action activated.')}>Review campaign</C.TextAction><C.TextAction disabled>Unavailable</C.TextAction></Inline></Section>
    <Section id="component-form" title="Form"><C.Form label="Workspace example" onSubmit={event => { event.preventDefault(); setMessage('Workspace saved.') }}><C.TextField label="Workspace name" defaultValue="Studio workspace" required /><C.FormActions onCancel={() => setMessage('Changes cancelled.')} message={message} /></C.Form></Section>
    <Section id="component-form-actions" title="Form actions"><C.Form label="Action example" onSubmit={event => { event.preventDefault(); setMessage('Settings saved.') }}><C.FormActions submitLabel="Save settings" onCancel={() => setMessage('Cancelled.')} message={message} /></C.Form></Section>
    <Section id="component-search-field" title="Search field"><C.SearchField label="Find city" value={search} onChange={setSearch} /><Stack gap={2}>{cities.filter(city=>city.toLowerCase().includes(search.toLowerCase())).map(city=><Text key={city}>{city}</Text>)}{!cities.some(city=>city.toLowerCase().includes(search.toLowerCase()))&&<Text>No cities found. Try another search.</Text>}</Stack></Section>
    <Section id="component-password-field" title="Password field"><C.PasswordField label="API key" defaultValue="example-key-not-a-secret" instructions="Example only. Never prefill stored credentials." /></Section>
    <Section id="component-date-picker" title="Date picker"><C.DatePicker label="Campaign start" defaultValue="2026-09-14" min="2026-01-01" max="2027-12-31" /></Section>
    <Section id="component-menu" title="Menu"><C.Menu label="Campaign actions" items={[{ id: 'duplicate', label: 'Duplicate' }, { id: 'download', label: 'Download' }, { id: 'delete', label: 'Delete', danger: true }, { id: 'edit', label: 'Edit archived campaign', disabled: true }]} onSelect={id => setMessage(`Selected action: ${id}`)} /></Section>
    <Section id="component-dialog" title="Dialog"><C.Dialog title="Export campaign" description="Review the selected formats before exporting." trigger="Open export dialog"><C.Checkbox label="Include animated formats" /><C.Button variant="primary" onClick={() => setMessage('Export queued.')}>Export formats</C.Button><Text role="status">{message}</Text></C.Dialog><Inline><C.Dialog tone="confirmation" title="Confirm export" description="Export the selected campaign formats?" trigger="Confirmation dialog" open={confirmationOpen} onOpenChange={setConfirmationOpen}><Inline><C.Button onClick={()=>setConfirmationOpen(false)}>Cancel</C.Button><C.Button variant="primary" onClick={()=>setConfirmationOpen(false)}>Export</C.Button></Inline></C.Dialog><C.Dialog tone="warning" title="Delete campaign?" description="This removes the campaign and cannot be undone." trigger="Warning dialog" open={warningOpen} onOpenChange={setWarningOpen}><Inline><C.Button onClick={()=>setWarningOpen(false)}>Cancel</C.Button><C.Button variant="danger" onClick={()=>setWarningOpen(false)}>Delete campaign</C.Button></Inline></C.Dialog></Inline></Section>
    <Section id="component-drawer" title="Drawer"><C.Drawer title="Campaign details" description="Edit the campaign without losing your place." trigger="Open details drawer"><C.TextField label="Campaign name" defaultValue="Nordic launch" /><C.Toggle label="Include motion" defaultChecked /></C.Drawer></Section>
    <Section id="component-popover" title="Popover"><C.Popover label="Display settings"><Stack gap={2}><C.Toggle label="Show descriptions" defaultChecked /><C.Checkbox label="Highlight changes" /></Stack></C.Popover></Section>
    <Section id="component-tooltip" title="Tooltip"><C.Tooltip label="About exports" content="Exports include all selected formats. Keyboard focus also reveals this help." /></Section>
    <Section id="component-toast" title="Toast">{toast && <C.Toast title="Campaign saved" description="Your changes are up to date." tone="success" onDismiss={() => setToast(false)} />}<Inline><C.Button disabled={toast} onClick={() => setToast(true)}>Show notification</C.Button></Inline></Section>

    <Section id="component-workflow-steps" title="Workflow steps" filters={<CatalogFilters label="Workflow"><C.Toggle label="Vertical workflow" checked={vertical} onChange={e => setVertical(e.target.checked)} /></CatalogFilters>}><C.WorkflowSteps label="Campaign workflow" orientation={vertical ? 'vertical' : 'horizontal'} current={workflow} onChange={setWorkflow} steps={[{ id: 'brief', label: 'Brief', description: 'Complete', complete: true }, { id: 'copy', label: 'Copy', description: 'In progress' }, { id: 'assets', label: 'Assets', description: 'Upcoming' }, { id: 'export', label: 'Export', disabled: true }]} /></Section>
    <Section id="component-table" title="Table"><C.Table label="Campaigns" rows={rows} rowKey={row => row.id} sort={sort} onSort={setSort} columns={[{ id: 'name', header: 'Campaign', sortable: true, render: row => row.name }, { id: 'status', header: 'Status', render: row => <C.StatusBadge status={row.status === 'Ready' ? 'success' : 'pending'}>{row.status}</C.StatusBadge> }]} /></Section>

    <Section id="component-inline-confirmation" title="Inline confirmation"><C.InlineConfirmation label="Delete example draft" question="Delete this example draft?" description="This action removes the draft from this example." onConfirm={() => setMessage('Example draft deleted.')} /></Section>
    <UploadExample />
    <Section id="component-file-list" title="File list"><C.FileList files={files} onRemove={id => setFiles(current => current.filter(file => file.id !== id))} /></Section>
    <Section id="component-empty-state" title="Empty state"><C.EmptyState title="No campaigns yet" description="Your campaigns will appear here." action={<Inline><C.Button variant="primary" icon="plus" onClick={() => setMessage('Create campaign selected.')}>Create campaign</C.Button></Inline>} /></Section>
    <Section id="component-spinner" title="Spinner"><C.Spinner label="Generating campaign assets" /></Section>
    <Section id="component-skeleton" title="Skeleton"><C.Panel title="Campaign details"><C.Skeleton label="Loading campaign details" /></C.Panel></Section>
  </>
}
