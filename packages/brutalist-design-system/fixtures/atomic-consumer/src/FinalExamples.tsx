import { useState } from 'react'
import * as C from 'brutalist-design-system'

export const finalCoverage = { InlineText: C.InlineText, TextAction: C.TextAction, Form: C.Form, FormActions: C.FormActions, SearchField: C.SearchField, PasswordField: C.PasswordField, DatePicker: C.DatePicker, Menu: C.Menu, Dialog: C.Dialog, Drawer: C.Drawer, Popover: C.Popover, Tooltip: C.Tooltip, Toast: C.Toast, Tabs: C.Tabs, WorkflowSteps: C.WorkflowSteps, Table: C.Table, Combobox: C.Combobox, MultiSelect: C.MultiSelect, InlineConfirmation: C.InlineConfirmation, FileDropzone: C.FileDropzone, FileList: C.FileList, EmptyState: C.EmptyState, Spinner: C.Spinner, Skeleton: C.Skeleton, FeedbackButton: C.FeedbackButton, ButtonGroup: C.ButtonGroup, CompactButton: C.CompactButton, FancyButton: C.FancyButton, Avatar: C.Avatar, AvatarGroup: C.AvatarGroup, AvatarGroupCompact: C.AvatarGroupCompact, Badge: C.Badge, Banner: C.Banner, Kbd: C.Kbd, Notification: C.Notification, ColorPicker: C.ColorPicker, DigitInput: C.DigitInput, Hint: C.Hint, Label: C.Label, Accordion: C.Accordion, TabMenuVertical: C.TabMenuVertical, DotStepper: C.DotStepper, VerticalStepper: C.VerticalStepper, CommandMenu: C.CommandMenu }
export function FinalExamples() {
  const [copy, setCopy] = useState('We mitigate it by defining the strict design system documentation, design harness, reusable templates.'), [search, setSearch] = useState(''), [market, setMarket] = useState('no'), [selected, setSelected] = useState<string[]>(['no']), [step, setStep] = useState('copy'), [toast, setToast] = useState(true), [message, setMessage] = useState('')
  const [files, setFiles] = useState([{ id: 'brief', name: 'brief.pdf', size: 1024 }]), [color, setColor] = useState('#72b8ff'), [code, setCode] = useState('1234'), [dot, setDot] = useState(1), [vertical, setVertical] = useState('review'), [tab, setTab] = useState('general')
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
    <C.FeedbackButton label="Copy invite" successLabel="Copied" onAction={() => Promise.resolve()} />
    <C.ButtonGroup><C.CompactButton>Compact</C.CompactButton><C.FancyButton subtitle="Opens the workspace">Continue</C.FancyButton></C.ButtonGroup>
    <C.Avatar name="Mira Chen" status="online" /><C.AvatarGroup label="Project members" items={[{ name: 'Mira Chen' }, { name: 'Jonas Weber' }, { name: 'Alex Kim' }]} max={2} /><C.AvatarGroupCompact label="Reviewers" items={[{ name: 'Mira Chen' }, { name: 'Jonas Weber' }]} />
    <C.Badge tone="accent">In review</C.Badge><C.Banner title="Scheduled maintenance" description="The workspace will be read-only briefly." tone="warning" /><C.Notification title="Export complete" description="Your files are ready." tone="success" /><C.Kbd>⌘K</C.Kbd>
    <C.ColorPicker label="Accent color" value={color} onChange={setColor} /><C.DigitInput label="Verification code" value={code} onChange={setCode} /><C.Label required hint="Optional help text">Project name</C.Label><C.Hint>Use lowercase letters and hyphens.</C.Hint>
    <C.Accordion label="FAQ" items={[{ id: 'one', title: 'What is shared?', content: <C.Text>Tokens and primitives are shared.</C.Text>, defaultOpen: true }]} />
    <C.TabMenuVertical label="Settings" value={tab} onChange={setTab} items={[{ id: 'general', label: 'General', content: <C.Text>General settings</C.Text> }, { id: 'members', label: 'Members', content: <C.Text>Members settings</C.Text> }]} />
    <C.DotStepper label="Checkout progress" steps={['Cart', 'Details', 'Payment']} current={dot} onChange={setDot} /><C.VerticalStepper label="Onboarding" current={vertical} onChange={setVertical} steps={[{ id: 'account', label: 'Create account', complete: true }, { id: 'review', label: 'Review details' }, { id: 'finish', label: 'Finish setup' }]} />
    <C.CommandMenu label="Open commands" items={[{ id: 'new', label: 'New project' }]} onSelect={setMessage} />
  </C.Stack>
}
