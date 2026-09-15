import { AtomsRoot, Grid, Icon, Inline, Stack, Surface, Text, tokens } from '../../../atoms'

export default function Color() {
  return <AtomsRoot><Grid minItemWidth="8rem" gap={4}>
    {Object.entries(tokens.color).map(([name, value]) => <Stack gap={2} key={name}>
      <Surface padding={0} radius="small" style={{ background: value, height: 'var(--a-space-16)' }} />
      <Text variant="h7">{name}</Text><Text variant="small" tone="secondary">{value}</Text>
    </Stack>)}
  </Grid></AtomsRoot>
}

export function SemanticColor() {
  return <AtomsRoot><Stack gap={3}>
    <Surface padding={4} radius="small" style={{ background: 'var(--a-color-accent)' }}><Text>Primary action: ink on accent</Text></Surface>
    <Inline><Icon name="check" label="Success" /><Text>Saved successfully. Pair status color with a readable label.</Text></Inline>
    <Inline><Icon name="alert" label="Error" /><Text>Check the required fields. Color alone does not explain the problem.</Text></Inline>
  </Stack></AtomsRoot>
}
