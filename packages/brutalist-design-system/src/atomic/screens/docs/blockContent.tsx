import { useState, type ComponentType } from 'react'
import { Inline, Stack, Text } from '../../atoms'
import { Button, NavigationList, Tag, TextArea, Toggle, type FileItem } from '../../components'
import { CodeExample } from '../../ui-blocks/CodeExample'
import { PromptInput } from '../../ui-blocks/PromptInput'
import { SidebarPanel } from '../../ui-blocks/SidebarPanel'
import type { ComponentReferenceRow } from './componentContent'

export type BlockSpec = { id: string; title: string; category: string; description: string; source: string; preview: ComponentType; reference: ComponentReferenceRow[]; notes: string[] }
const rows = (...items: [string, string, string][]): ComponentReferenceRow[] => items.map(([name, value, purpose]) => ({ name, value, purpose }))
const snippet = (imports: string, body: string) => `import { ${imports} } from 'brutalist-design-system'\n\nexport function Example() {\n  return ${body}\n}`

function SidebarPreview() {
  const [projects, setProjects] = useState([{ id: 'oslo', title: 'Oslo launch', href: '#', pinned: true }, { id: 'nordic', title: 'Nordic spring', href: '#', pinned: false }])
  return <SidebarPanel brand={{ label: 'Studio' }} primaryAction={{ label: 'New campaign', onClick: () => setProjects(current => [...current, { id: `project-${current.length}`, title: 'Untitled campaign', href: '#', pinned: false }]) }} navigation={[{ id: 'campaigns', label: 'Campaigns', href: '#', icon: 'folder', current: true }, { id: 'settings', label: 'Settings', href: '#', icon: 'settings' }]} projects={projects.map(project => ({ ...project, actions: [{ id: 'pin', label: project.pinned ? 'Unpin' : 'Pin', icon: 'Pin' as const }, { id: 'delete', label: 'Delete', icon: 'delete' as const, danger: true }] }))} onProjectAction={(id, action) => { if (action === 'delete') setProjects(current => current.filter(project => project.id !== id)); if (action === 'pin') setProjects(current => current.map(project => project.id === id ? { ...project, pinned: !project.pinned } : project)) }} account={{ label: 'Demo workspace', actions: [{ id: 'settings', label: 'Settings' }], onAction: () => undefined }} />
}
function PromptPreview() {
  const [value, setValue] = useState('Summarize the latest campaign brief')
  const [sent, setSent] = useState('')
  const files: FileItem[] = [{ id: 'brief', name: 'campaign-brief.pdf', size: 24000 }]
  return <Stack gap={3}><PromptInput value={value} onChange={setValue} onSubmit={() => setSent(value)} files={files} onRemove={() => undefined} onAttach={() => undefined} /><Toggle label="Simulate response" defaultChecked />{sent && <Text role="status" variant="small">Sent: {sent}</Text>}</Stack>
}
function CodePreview() { return <CodeExample title="Nested example" filename="Example.tsx" source={'<Button variant="primary">Create campaign</Button>'} preview={<Inline gap={3}><Button variant="primary">Create campaign</Button><Tag tone="success">Ready</Tag></Inline>} /> }

export const blockPages: BlockSpec[] = [
  { id: 'sidebar', title: 'Sidebar panel', category: 'UI Blocks', description: 'A workspace sidebar that combines brand, primary action, navigation, projects and account controls.', source: snippet('SidebarPanel', '<SidebarPanel brand={{ label: \'Studio\' }} primaryAction={{ label: \'New campaign\', onClick }} navigation={navigation} projects={projects} />'), preview: SidebarPreview, reference: rows(['brand', '{ label: string }', 'Brand heading.'], ['primaryAction', '{ label, icon?, onClick }', 'Primary action configuration.'], ['navigation', 'readonly NavigationItem[]', 'Workspace links.'], ['projects', 'readonly project[]', 'Pinned and recent project rows.'], ['account / onProjectAction', 'optional account / callback', 'Account menu and project commands.']), notes: ['Keep primary navigation above project lists so it remains discoverable.', 'Use project actions for reversible organization tasks and mark destructive commands as danger.'] },
  { id: 'prompt-input', title: 'AI prompt input', category: 'UI Blocks', description: 'A composed prompt surface with attachments, a multiline editor, send action and error feedback.', source: snippet('PromptInput', '<PromptInput value={value} onChange={setValue} onSubmit={submit} files={files} />'), preview: PromptPreview, reference: rows(['value / onChange', 'string / callback', 'Controlled prompt text.'], ['onSubmit', '() => void', 'Runs when the prompt is sent.'], ['files / onAttach / onRemove', 'readonly FileItem[] / callbacks?', 'Attachment list and actions.'], ['busy / disabled / readOnly', 'boolean?', 'Locks input during work or review.'], ['error / accept', 'string? / string?', 'Error message and file filter.']), notes: ['Keep draft text when a send fails so users can recover without retyping.', 'Ctrl/Cmd+Enter submits the prompt; the visible send button remains available.'] },
  { id: 'code-example', title: 'Code example', category: 'UI Blocks', description: 'A documentation block that pairs a live preview with selectable source, tabs and a copy action.', source: snippet('CodeExample, Button', '<CodeExample title="Create campaign" filename="Example.tsx" source={source} preview={<Button>Create campaign</Button>} />'), preview: CodePreview, reference: rows(['title / filename / source', 'string / string / string', 'Panel heading, source label and exact code.'], ['preview', 'ReactNode?', 'Live preview; omitted for code-only blocks.'], ['controls', 'ReactNode?', 'Optional package or example controls.'], ['headingLevel', 'Heading level?', 'Semantic heading level for the Panel.']), notes: ['Keep the displayed source executable by importing from the public package.', 'Use a named source filename and preserve the same example in the preview and code tab.'] },
]
export const blockPageMap = new Map(blockPages.map(page => [page.id, page]))
