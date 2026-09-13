import { useState } from 'react'
import { Stack } from '../atoms'
import { Select, MultiSelect, Combobox, Toggle, type SelectOption } from '../components'
import { CatalogSection } from './CatalogSection'
import { CatalogFilters } from './CatalogFilters'

const channels = [
  { value: 'social', label: 'Paid social', icon: 'Megaphone' },
  { value: 'display', label: 'Display', icon: 'image' },
  { value: 'email', label: 'Email', icon: 'Mail', disabled: true },
] satisfies SelectOption[]
const markets = [{ value: 'no', label: 'Norway' }, { value: 'se', label: 'Sweden' }, { value: 'dk', label: 'Denmark', disabled: true }]

export function DropdownsCatalog() {
  const [disabled, setDisabled] = useState(false), [error, setError] = useState(false)
  const [channel, setChannel] = useState(''), [iconChannel, setIconChannel] = useState('')
  const [custom, setCustom] = useState(''), [country, setCountry] = useState('')
  const [selected, setSelected] = useState<string[]>(['no'])
  return <CatalogSection id="component-dropdowns" title="Dropdowns" filters={<CatalogFilters label="Dropdowns">
    <Toggle label="Disable dropdowns" checked={disabled} onChange={e => setDisabled(e.target.checked)} />
    <Toggle label="Show dropdown error" checked={error} onChange={e => setError(e.target.checked)} />
  </CatalogFilters>}>
    <Stack id="component-select" gap={6}>
      <Select label="Primary channel" value={channel} onValueChange={setChannel} options={channels.map(({ icon, ...option }) => option)} placeholder="Choose a channel" disabled={disabled} error={error ? 'Choose an available channel.' : undefined} customOption={{ value: 'other', label: 'Other', text: custom, onTextChange: setCustom }} />
      <Select label="Channel with icons" value={iconChannel} onValueChange={setIconChannel} options={channels} placeholder="Choose a channel" disabled={disabled} />
      <Combobox label="Search countries" value={country} onChange={setCountry} options={markets} disabled={disabled} />
    </Stack>
    <Stack id="component-multi-select"><MultiSelect label="Markets" value={selected} onChange={setSelected} options={markets} disabled={disabled} /></Stack>
  </CatalogSection>
}
