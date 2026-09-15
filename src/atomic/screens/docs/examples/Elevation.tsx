import { AtomsRoot, Grid, Stack, Surface, Text, tokens } from '../../../atoms'

export default function Elevation() {
  return <AtomsRoot><Grid minItemWidth="9rem" gap={6}>
    {(Object.keys(tokens.shadow) as (keyof typeof tokens.shadow)[]).map(elevation => <Surface key={elevation} elevation={elevation} radius="small" padding={4}><Text>{elevation}</Text></Surface>)}
  </Grid></AtomsRoot>
}

export function Layers() {
  return <AtomsRoot><Stack gap={3}>
    {Object.entries(tokens.layer).map(([name, value]) => <Surface key={name} padding={3} radius="small"><Text>{name} · layer {value}</Text></Surface>)}
    <Text variant="small" tone="secondary">Use layer tokens for stacking. A shadow changes appearance, not stacking order.</Text>
  </Stack></AtomsRoot>
}
