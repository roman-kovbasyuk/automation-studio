import { AtomsRoot, Inline, Stack, Surface, Text, tokens } from '../../../atoms'

export default function Spacing() {
  return <AtomsRoot><Stack gap={3}>
    {Object.entries(tokens.space).map(([step, value]) => <Inline key={step} gap={4}>
      <Text variant="small" style={{ width: '6rem' }}>space-{step}</Text>
      <div aria-hidden="true" style={{ width: value, height: 'var(--a-space-4)', background: 'var(--a-color-accent)' }} />
      <Text variant="small" tone="secondary">{value}</Text>
    </Inline>)}
  </Stack></AtomsRoot>
}

export function SpacingComposition() {
  return <AtomsRoot><Stack gap={6}>
    <Text variant="h6">Stack gap={6}: 24px between groups</Text>
    <Inline gap={2}>{['Brief', 'Review', 'Publish'].map(label => <Surface key={label} padding={3} radius="small"><Text>{label}</Text></Surface>)}</Inline>
    <Text variant="small" tone="secondary">Inline gap={2}: 8px between items, with wrapping.</Text>
  </Stack></AtomsRoot>
}
