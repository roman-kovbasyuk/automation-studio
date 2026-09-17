import { useState } from 'react'
import { AtomsRoot, Grid, Icon, Inline, Stack, Text, icons, tokens, type IconName } from '../../../atoms'
import { Button, Menu, SearchField } from '../../../components'

const iconSizeOptions = [
  { id: 'small', label: '16 px', value: '16px' },
  { id: 'large', label: '24 px', value: '24px' },
  { id: 'xlarge', label: '32 px', value: '32px' },
  { id: 'display', label: '48 px', value: '48px' },
] as const

type IconSizeId = typeof iconSizeOptions[number]['id']

export default function Icons() {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(24)
  const [copied, setCopied] = useState('')
  const matches = (Object.keys(icons) as IconName[]).filter(name => name.toLowerCase().includes(query.trim().toLowerCase()))
  async function copyIcon(name: IconName, size: IconSizeId) {
    const source = `<Icon name="${name}" size="${size}" />`
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(source)
      const selected = iconSizeOptions.find(option => option.id === size)
      setCopied(`Copied ${name} at ${selected?.value ?? size}`)
    } catch {
      setCopied(`Clipboard unavailable. Icon: ${name}.`)
    }
  }
  async function copySvg(name: IconName) {
    const trigger = Array.from(document.querySelectorAll<HTMLButtonElement>('.c-menu-trigger')).find(element => element.getAttribute('aria-label') === name)
    const source = trigger?.querySelector('svg')?.outerHTML
    try {
      if (!source || !navigator.clipboard) throw new Error('SVG unavailable')
      await navigator.clipboard.writeText(source)
      setCopied(`Copied ${name} SVG`)
    } catch {
      setCopied(`SVG unavailable for ${name}.`)
    }
  }
  function iconMenuItems() {
    return [...iconSizeOptions.map(option => ({ id: option.id, label: option.label })), { id: 'copy-svg', label: 'Copy SVG', icon: 'copy' as const }]
  }
  return <AtomsRoot><Stack gap={4}>
    <SearchField label="Search icons" value={query} onChange={value => { setQuery(value); setLimit(24); setCopied('') }} placeholder="Try arrow, calendar, or check" />
    <Text role="status" variant="small" tone="secondary">{matches.length} matching icons</Text>
    <Grid minItemWidth="4rem" gap={3} className="docs-icons-grid">{matches.slice(0, limit).map(name => <Menu key={name} className="docs-icon-button" label={name} iconOnly icon={name} items={iconMenuItems()} onSelect={id => id === 'copy-svg' ? copySvg(name) : copyIcon(name, id as IconSizeId)} />)}</Grid>
    {copied && <Text role="status" variant="small" tone="secondary">{copied}</Text>}
    {matches.length > limit && <Button onClick={() => setLimit(value => value + 24)}>Show more icons</Button>}
  </Stack></AtomsRoot>
}

export function IconSizes() {
  return <AtomsRoot><Stack gap={4}><Inline gap={6}>
    {(Object.keys(tokens.icon) as (keyof typeof tokens.icon)[]).map(size => <Stack key={size} gap={2}><Icon name="star" size={size} label={`${size} star`} /><Text variant="small">{size} · {tokens.icon[size]}</Text></Stack>)}
  </Inline></Stack></AtomsRoot>
}
