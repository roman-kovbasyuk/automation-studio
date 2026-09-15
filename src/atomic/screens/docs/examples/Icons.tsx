import { useState } from 'react'
import { AtomsRoot, Grid, Icon, Inline, Stack, Text, icons, tokens, type IconName } from '../../../atoms'
import { Button, SearchField } from '../../../components'

export default function Icons() {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(24)
  const matches = (Object.keys(icons) as IconName[]).filter(name => name.toLowerCase().includes(query.trim().toLowerCase()))
  return <AtomsRoot><Stack gap={4}>
    <SearchField label="Search icons" value={query} onChange={value => { setQuery(value); setLimit(24) }} placeholder="Try arrow, calendar, or check" />
    <Text role="status" variant="small" tone="secondary">{matches.length} matching icons</Text>
    <Grid minItemWidth="7rem">{matches.slice(0, limit).map(name => <Stack key={name} gap={2}><Icon name={name} size="large" /><Text variant="small">{name}</Text></Stack>)}</Grid>
    {matches.length > limit && <Button onClick={() => setLimit(value => value + 24)}>Show more icons</Button>}
  </Stack></AtomsRoot>
}

export function IconSizes() {
  return <AtomsRoot><Stack gap={4}><Inline gap={6}>
    {(Object.keys(tokens.icon) as (keyof typeof tokens.icon)[]).map(size => <Stack key={size} gap={2}><Icon name="star" size={size} label={`${size} star`} /><Text variant="small">{size} · {tokens.icon[size]}</Text></Stack>)}
  </Inline><Text variant="small" tone="secondary">Give standalone meaningful icons a label. Omit it inside an already labeled control.</Text></Stack></AtomsRoot>
}
