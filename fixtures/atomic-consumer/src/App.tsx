import { useState } from 'react'
import {
  NavigationList, AttachmentArea, SidebarPanel, PromptInput,
  AtomsRoot, Container, Stack, Heading, Text,
  Button, Panel, TextField, Checkbox, RadioGroup, Toggle, TextArea, Select, Tag, SegmentedControl,
  Breadcrumbs, Pagination, NumberStepper, Slider, RangeSlider, Rating, ProgressBar, ProgressRing, StatusBadge, Alert,
} from 'brutalist-design-system'
import 'brutalist-design-system/styles.css'
import { FinalExamples, finalCoverage } from './FinalExamples'

// Coverage is verified against the catalog inventory, not a second hand-maintained expected count.
export const coveredBlocks = { SidebarPanel, PromptInput }
export const coveredComponents = { NavigationList, AttachmentArea, Button, Panel, TextField, Checkbox, RadioGroup, Toggle, TextArea, Select, Tag, SegmentedControl, Breadcrumbs, Pagination, NumberStepper, Slider, RangeSlider, Rating, ProgressBar, ProgressRing, StatusBadge, Alert, ...finalCoverage }

export default function App() {
  const [count, setCount] = useState(0), [tag, setTag] = useState(true)
  const [density, setDensity] = useState('comfortable')
  const [page, setPage] = useState(2), [variations, setVariations] = useState(3), [intensity, setIntensity] = useState(60), [range, setRange] = useState<[number, number]>([25, 55]), [rating, setRating] = useState(3)
  return <AtomsRoot><Container maxWidth="64rem"><Stack gap={8} style={{ padding: 'var(--a-space-8)' }}>
    <Heading level={1} variant="h2">Installed atomic package</Heading>
    <Text>All controls below come from the installed package, with no application styles or source aliases.</Text>
    <Button variant="primary" icon="plus" onClick={() => setCount(value => value + 1)}>Create campaign</Button>
    <Text role="status">Created: {count}</Text>
    <Panel title="Campaign brief" description="Shared grouping structure for related controls and information." />
    <Panel variant="split" title="Campaign settings" description="Header, subheader and filters share one gray surface." filters={<Checkbox label="Include archived campaigns" />}>
      <Text>Panel content stays on the white surface.</Text>
    </Panel>
    <TextField label="Campaign title" defaultValue="Nordic spring launch" instructions="Keep the title short and descriptive." />
    <Checkbox label="Include animated formats" instructions="Include motion in the exported campaign." />
    <RadioGroup label="Export format" defaultValue="square" instructions="Select one output proportion." options={[{ value: 'square', label: 'Square' }, { value: 'portrait', label: 'Portrait' }]} />
    <Toggle label="Autosave changes" defaultChecked instructions="Keep campaign edits saved as you work." />
    <TextArea label="Campaign brief" defaultValue="We mitigate it by defining the strict design system documentation, design harness, reusable templates." />
    <Select label="Primary channel" placeholder="Choose a channel" options={[{ value: 'social', label: 'Paid social' }, { value: 'display', label: 'Display' }]} />
    {tag && <Tag tone="accent" onRemove={() => setTag(false)} removeLabel="Remove display channel">Display</Tag>}
    <SegmentedControl label="View density" value={density} onChange={setDensity} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }, { value: 'spacious', label: 'Spacious' }]} />
    <Text role="status">Density: {density}</Text>
    <Heading level={2}>Next ten components</Heading>
    <Breadcrumbs items={[{ label: 'Package preview', href: '#' }, { label: 'Components' }]} />
    <Pagination page={page} pageCount={12} onPageChange={setPage} />
    <NumberStepper label="Variation count" value={variations} onChange={setVariations} min={1} max={12} />
    <Slider label="Campaign intensity" value={intensity} onChange={setIntensity} formatValue={value => `${value}%`} />
    <RangeSlider label="Audience age range" min={18} max={80} value={range} onChange={setRange} />
    <Rating label="Creative quality" value={rating} onChange={setRating} />
    <ProgressBar label="Generating assets" value={68} />
    <ProgressRing label="Review readiness" value={82} description="Some checks remain." />
    <StatusBadge status="success">Ready</StatusBadge>
    <Alert title="Campaign saved" description="Nordic spring launch · just now" tone="success" />
    <FinalExamples />
    <NavigationList label="Preview navigation" items={[{id:'home',label:'Home',href:'#',current:true}]}/>
    <AttachmentArea label="Preview attachments"><Text>Attachment composition</Text></AttachmentArea>
    <SidebarPanel brand={{label:'Studio'}} primaryAction={{label:'New campaign',onClick:()=>{}}} navigation={[{id:'home',label:'Home',href:'#',current:true}]} projects={[{id:'oslo',title:'Oslo launch',href:'#',actions:[{id:'duplicate',label:'Duplicate'},{id:'delete',label:'Delete',danger:true}]}]}/>
    <PromptInput value="Create a campaign for Oslo" onChange={()=>{}} onSubmit={()=>{}} onAttach={()=>{}}/>

  </Stack></Container></AtomsRoot>
}
