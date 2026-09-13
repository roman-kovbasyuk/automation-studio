import { useState } from 'react'
import { Heading, Inline, Stack, Text } from '../atoms'
import { Button, Panel, TextField, Checkbox, RadioGroup } from '../components'
import { CatalogSection } from './CatalogSection'
import { CatalogFilters } from './CatalogFilters'
import { ComponentsBatchTwo } from './ComponentsBatchTwo'
import { ComponentsBatchThree } from './ComponentsBatchThree'
import { ComponentsFinal } from './ComponentsFinal'
import { componentManifest } from './componentManifest'

export const componentSections = componentManifest.filter((item, index) => componentManifest.findIndex(other => other.id === item.id) === index).map(({ id, title }) => [id, title] as const)

export function ComponentsCatalog() {
  const [icons, setIcons] = useState(true), [busy, setBusy] = useState(false), [buttonsDisabled, setButtonsDisabled] = useState(false)
  const [action, setAction] = useState('Try an action to see its result.')
  const [description, setDescription] = useState(true), [content, setContent] = useState(false)
  const [fieldError,setFieldError]=useState(false), [customFormat,setCustomFormat]=useState('')
  const [title, setTitle] = useState('Nordic spring launch'), [error, setError] = useState(''), [saved, setSaved] = useState('')
  const [fieldsDisabled, setFieldsDisabled] = useState(false)
  const [animated, setAnimated] = useState(false), [mixed, setMixed] = useState(true), [checkboxDisabled, setCheckboxDisabled] = useState(false)
  const [format, setFormat] = useState('square'), [radioDisabled, setRadioDisabled] = useState(false), [radioError, setRadioError] = useState(false)
  return <>
    <Stack id="components" gap={3}><Heading level={2} variant="h2">Components</Heading><Text tone="secondary">Shared components, composed from Atoms. Explore their states and interactions.</Text></Stack>
    <CatalogSection id="component-button" title="Button" filters={<CatalogFilters label="Button">
        <Checkbox label="Button icons" checked={icons} onChange={e => setIcons(e.target.checked)} />
        <Checkbox label="Busy" checked={busy} onChange={e => setBusy(e.target.checked)} />
        <Checkbox label="Disable buttons" checked={buttonsDisabled} onChange={e => setButtonsDisabled(e.target.checked)} />
      </CatalogFilters>}>
      <Inline gap={4}>
        <Button variant="primary" icon={icons ? 'plus' : undefined} busy={busy} disabled={buttonsDisabled} onClick={() => setAction('Example campaign created.')}>Create campaign</Button>
        <Button icon={icons ? 'arrowRight' : undefined} iconPosition="end" disabled={buttonsDisabled} onClick={() => setAction('Changes ready for review.')}>Review changes</Button>
        <Button variant="danger" icon={icons ? 'delete' : undefined} disabled={buttonsDisabled} onClick={() => setAction('Example draft deleted.')}>Delete draft</Button>
        <Button variant="quiet" disabled={buttonsDisabled} onClick={() => setAction('Action cancelled.')}>Cancel</Button>
        <Button iconOnly icon="search" aria-label="Search campaigns" disabled={buttonsDisabled} onClick={() => setAction('')} />
        <Button size="compact" onClick={() => setAction('Compact action activated.')}>Compact</Button>
      </Inline>
    </CatalogSection>
    <CatalogSection id="component-panel" title="Panel" filters={<CatalogFilters label="Panel"><Checkbox label="Show subheader" checked={description} onChange={e => setDescription(e.target.checked)} /><Checkbox label="Show content" checked={content} onChange={e => setContent(e.target.checked)} /></CatalogFilters>}>
      <Panel title="Campaign brief" description={description ? 'Shared grouping structure for related controls and information.' : undefined}>
        {content ? <Text>We mitigate it by defining the strict design system documentation, design harness, reusable templates.</Text> : undefined}
      </Panel>
      <Panel variant="split" title="Campaign settings" description={description ? 'A gray header groups the title, subheader and filters.' : undefined} filters={<Checkbox label="Include archived campaigns" />}>
        {content ? <Text>Content remains on the white surface, separate from the header controls.</Text> : undefined}
      </Panel>
    </CatalogSection>
    <CatalogSection id="component-text-field" title="Text field" filters={<CatalogFilters label="Text field"><Checkbox label="Disable field" checked={fieldsDisabled} onChange={e => setFieldsDisabled(e.target.checked)} /><Checkbox label="Show field error" checked={fieldError} onChange={e=>setFieldError(e.target.checked)} /></CatalogFilters>}>
      <form noValidate onSubmit={event => { event.preventDefault(); const valid = title.trim(); setError(valid ? '' : 'Enter a campaign title.'); setSaved(valid ? `Saved: ${valid}` : '') }}>
        <Stack gap={4}>
          <TextField label="Campaign title" name="campaignTitle" value={title} onChange={e => { setTitle(e.target.value); setError(''); setSaved('') }} instructions="Keep the title short and descriptive." error={fieldError ? 'Enter a campaign title.' : error} required disabled={fieldsDisabled} />
          <Inline><Button type="submit" variant="primary" disabled={fieldsDisabled}>Save title</Button></Inline>
          <TextField label="Campaign ID" value="campaign-001" readOnly instructions="This identifier is read-only." />
          <TextField type="email" label="Contact email" placeholder="name@example.com" />
          <TextField type="number" label="Daily budget" min={0} defaultValue={240} />
          <TextField type="time" label="Publish time" defaultValue="09:30" />
          <TextField type="color" label="Campaign color" defaultValue="#79d9ff" />
          {saved && <Text role="status" variant="small">{saved}</Text>}
        </Stack>
      </form>
    </CatalogSection>
    <CatalogSection id="component-checkbox" title="Checkbox" filters={<CatalogFilters label="Checkbox"><Checkbox label="Disable checkbox" checked={checkboxDisabled} onChange={e => setCheckboxDisabled(e.target.checked)} /><Checkbox label="Mixed state" checked={mixed} onChange={e=>setMixed(e.target.checked)} /></CatalogFilters>}>
      <Checkbox label="Include animated formats" checked={animated} onChange={e => setAnimated(e.target.checked)} disabled={checkboxDisabled} instructions="Include motion in the exported campaign." />
      <Checkbox label="Select all formats" checked={animated && !mixed} indeterminate={mixed} onChange={e => { setMixed(false); setAnimated(e.target.checked) }} disabled={checkboxDisabled} />
    </CatalogSection>
    <CatalogSection id="component-radio-group" title="Radio group" filters={<CatalogFilters label="Radio group"><Checkbox label="Disable radio group" checked={radioDisabled} onChange={e => setRadioDisabled(e.target.checked)} /><Checkbox label="Show radio error" checked={radioError} onChange={e => setRadioError(e.target.checked)} /></CatalogFilters>}>
      <RadioGroup label="Export format" instructions="Select one output proportion." options={[{ value: 'square', label: 'Square' }, { value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape', disabled: true }]} value={format} onChange={setFormat} customOption={{value:'custom',label:'Custom',text:customFormat,onTextChange:setCustomFormat,placeholder:'Describe your format'}} disabled={radioDisabled} error={radioError ? 'Choose an available export format.' : undefined} />
    </CatalogSection>
    <ComponentsBatchTwo />
    <ComponentsBatchThree />
    <ComponentsFinal />
  </>
}
