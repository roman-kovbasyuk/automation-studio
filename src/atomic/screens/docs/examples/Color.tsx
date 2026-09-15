import { useState } from 'react'
import { AtomsRoot, Grid, Heading, Icon, Inline, Stack, Surface, Text, tokens } from '../../../atoms'

export default function Color() {
  const [copied, setCopied] = useState('')
  const groups = ['earthy', 'gray', 'blue', 'static'] as const
  return <AtomsRoot><Stack gap={0}>{groups.map((group, index) => <Stack gap={2} key={group} className={index ? 'docs-color-group docs-color-group--separated' : 'docs-color-group'}>
    <Heading level={3} variant="h6">{group}</Heading>
    <Grid minItemWidth="8rem" gap={4}>{Object.entries(tokens.color[group]).map(([shade, value]) => <Stack gap={2} key={shade}>
      <Surface role="button" tabIndex={0} aria-label={`Copy ${group} ${shade} color token`} padding={0} radius="small" className="docs-color-cell" onClick={() => { navigator.clipboard?.writeText(`--a-color-${group}-${shade}: ${value}`); setCopied(`${group}-${shade}`) }} style={{ background: value, height: 'var(--a-space-16)', border: '1px solid var(--a-color-ink)' }} />
      <Text variant="h7">{shade}</Text><Text variant="small" tone="secondary">{value}</Text>
    </Stack>)}</Grid>
  </Stack>)}{copied && <Text role="status" variant="small" tone="secondary">Copied {copied} token.</Text>}</Stack></AtomsRoot>
}

export function SemanticColor() {
  return <AtomsRoot><Stack gap={3}>
    <Surface padding={4} radius="small" style={{ background: 'var(--a-color-accent)' }}><Text>Primary action: ink on accent</Text></Surface>
    <Inline><Icon name="check" label="Success" /><Text>Saved successfully. Pair status color with a readable label.</Text></Inline>
    <Inline><Icon name="alert" label="Error" /><Text>Check the required fields. Color alone does not explain the problem.</Text></Inline>
  </Stack></AtomsRoot>
}
