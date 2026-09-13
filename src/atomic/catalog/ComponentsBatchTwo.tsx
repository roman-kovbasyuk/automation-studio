import { useState } from 'react'
import { Inline, Stack, Text } from '../atoms'
import { Button, Tabs, Tag, TextArea, Toggle } from '../components'
import { DropdownsCatalog } from './DropdownsCatalog'
import { CatalogSection } from './CatalogSection'
import { CatalogFilters } from './CatalogFilters'

const brief = 'We mitigate it by defining the strict design system documentation, design harness, reusable templates.'

export function ComponentsBatchTwo() {
  const [autosave, setAutosave] = useState(true), [toggleDisabled, setToggleDisabled] = useState(false)
  const [copy, setCopy] = useState(brief), [textDisabled, setTextDisabled] = useState(false), [textError, setTextError] = useState(false)
  const [tagVisible, setTagVisible] = useState(true), [tagIcons, setTagIcons] = useState(true)
  const [density, setDensity] = useState('comfortable'), [segmentsDisabled, setSegmentsDisabled] = useState(false), [compactDisabled, setCompactDisabled] = useState(false)

  return <>
    <CatalogSection id="component-toggle" title="Toggle" filters={<CatalogFilters label="Toggle"><Toggle label="Disable autosave control" checked={toggleDisabled} onChange={e => setToggleDisabled(e.target.checked)} /></CatalogFilters>}>
      <Toggle label="Autosave changes" checked={autosave} onChange={e => setAutosave(e.target.checked)} disabled={toggleDisabled} instructions="Keep campaign edits saved as you work." />
    </CatalogSection>
    <CatalogSection id="component-textarea" title="Text area" filters={<CatalogFilters label="Text area">
        <Toggle label="Disable text area" checked={textDisabled} onChange={e => setTextDisabled(e.target.checked)} />
        <Toggle label="Show text area error" checked={textError} onChange={e => setTextError(e.target.checked)} />
      </CatalogFilters>}>
      <TextArea label="Campaign brief" value={copy} onChange={e => setCopy(e.target.value)} disabled={textDisabled} instructions="Grows with your text. No manual resizing needed." error={textError ? 'Add the campaign objective before continuing.' : undefined} />
      <Inline><Button size="compact" onClick={() => setCopy(Array(6).fill(brief).join('\n\n'))} disabled={textDisabled}>Use longer text</Button><Button size="compact" onClick={() => setCopy(brief)} disabled={textDisabled}>Reset brief</Button></Inline>
    </CatalogSection>
    <DropdownsCatalog />
    <CatalogSection id="component-tag" title="Tag" filters={<CatalogFilters label="Tag"><Toggle label="Tag icons" checked={tagIcons} onChange={e => setTagIcons(e.target.checked)} /></CatalogFilters>}>
      <Inline gap={3}>
        <Tag>Default</Tag><Tag tone="accent">Paid social</Tag>
        <Tag tone="success" icon={tagIcons ? 'check' : undefined}>Approved</Tag>
        <Tag tone="danger" icon={tagIcons ? 'alert' : undefined}>Needs attention</Tag>
        <Tag tone="accent" icon={tagIcons ? 'clock' : undefined}>Review due</Tag>
      </Inline>
      <Stack gap={2}>
        <Text variant="small" tone="secondary">Removable selection</Text>
        <Inline>{tagVisible ? <Tag tone="accent" removeLabel="Remove display channel" onRemove={() => setTagVisible(false)}>Display</Tag> : null}<Button size="compact" onClick={() => setTagVisible(true)} disabled={tagVisible}>Restore tag</Button></Inline>
      </Stack>
    </CatalogSection>
    <CatalogSection id="component-tabs" title="Tabs" filters={<CatalogFilters label="Tabs">
        <Toggle label="Disable density control" checked={segmentsDisabled} onChange={e => setSegmentsDisabled(e.target.checked)} />
        <Toggle label="Disable compact option" checked={compactDisabled} onChange={e => setCompactDisabled(e.target.checked)} />
      </CatalogFilters>}>
      <Tabs label="View density" value={density} onChange={setDensity} disabled={segmentsDisabled} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact', disabled: compactDisabled }, { value: 'spacious', label: 'Spacious' }]} />
    </CatalogSection>
  </>
}
