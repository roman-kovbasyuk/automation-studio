import { useState, type KeyboardEvent } from 'react'
import { AtomsRoot, Grid, Icon, Inline, Stack, Surface, Text, tokens } from '../../../atoms'
import { Panel } from '../../../components'

type ColorGroup = {
  id: string
  title: string
  description: string
  values: Record<string, string>
  tokenPrefix?: string
}

const colorGroups: readonly ColorGroup[] = [
  { id: 'static', title: 'Static', description: 'Fixed black and white values for contrast.', values: { ...tokens.color.static } },
  { id: 'earthy', title: 'Earthy', description: 'Warm neutrals for the brand foundation.', values: { ...tokens.color.earthy } },
  { id: 'gray', title: 'Gray', description: 'Balanced neutrals for surfaces, borders and text.', values: { ...tokens.color.gray } },
  { id: 'slate', title: 'Slate', description: 'Cool neutrals for quiet backgrounds and structure.', values: { ...tokens.color.slate } },
  { id: 'red', title: 'Red', description: 'High-signal destructive and critical states.', values: { ...tokens.color.red } },
  { id: 'orange', title: 'Orange', description: 'Warm attention and in-progress accents.', values: { ...tokens.color.orange } },
  { id: 'amber', title: 'Amber', description: 'Warnings and focused highlights.', values: { ...tokens.color.amber } },
  { id: 'yellow', title: 'Yellow', description: 'Bright emphasis and status accents.', values: { ...tokens.color.yellow } },
  { id: 'green', title: 'Green', description: 'Positive states and confirmation moments.', values: { ...tokens.color.green } },
  { id: 'teal', title: 'Teal', description: 'Calm success and supporting accents.', values: { ...tokens.color.teal } },
  { id: 'cyan', title: 'Cyan', description: 'Informational highlights and cool accents.', values: { ...tokens.color.cyan } },
  { id: 'blue', title: 'Blue', description: 'Primary interactive and link colors.', values: { ...tokens.color.blue } },
  { id: 'indigo', title: 'Indigo', description: 'Deep blue accents for emphasis and navigation.', values: { ...tokens.color.indigo } },
  { id: 'violet', title: 'Violet', description: 'Expressive accent colors for selected states.', values: { ...tokens.color.violet } },
  { id: 'purple', title: 'Purple', description: 'Creative accents and supporting highlights.', values: { ...tokens.color.purple } },
  { id: 'pink', title: 'Pink', description: 'Expressive accents for warmth and personality.', values: { ...tokens.color.pink } },
  { id: 'rose', title: 'Rose', description: 'Soft critical states and expressive emphasis.', values: { ...tokens.color.rose } },
]

export const colorGroupItems = colorGroups.map(group => ({ id: `color-group-${group.id}`, label: group.title }))

function tokenName(group: ColorGroup, shade: string) {
  const prefix = group.tokenPrefix ?? group.id
  return prefix ? `--a-color-${prefix}-${shade}` : `--a-color-${shade}`
}

function ColorCard({ group, shade, value, onCopied }: { group: ColorGroup; shade: string; value: string; onCopied: (token: string) => void }) {
  const token = tokenName(group, shade)
  const copy = () => {
    navigator.clipboard?.writeText(`${token}: ${value}`)
    onCopied(token)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      copy()
    }
  }
  return <Surface as="article" role="button" tabIndex={0} id={`color-${group.id}-${shade}`} aria-label={`Copy ${token}`} className="docs-color-card" padding={2} radius="small" onClick={copy} onKeyDown={handleKeyDown}>
    <Stack gap={2}>
      <div className="docs-color-card__swatch" style={{ background: value }} aria-hidden="true" />
      <Stack gap={1}>
        <Text variant="h7">{shade}</Text>
        <Text variant="small" className="docs-color-card__token">{token}</Text>
        <Text variant="small" tone="secondary" className="docs-color-card__value">{value}</Text>
      </Stack>
    </Stack>
  </Surface>
}

export default function Color() {
  const [copied, setCopied] = useState('')
  return <AtomsRoot><Stack gap={4} className="docs-color-groups">
    {colorGroups.map(group => <Panel key={group.id} id={`color-group-${group.id}`} title={group.title} description={group.description} headingLevel={3} variant="split" density="compact" className="docs-color-group-panel">
      <Grid minItemWidth="8rem" gap={3}>{Object.entries(group.values).map(([shade, value]) => <ColorCard key={shade} group={group} shade={shade} value={value} onCopied={setCopied} />)}</Grid>
    </Panel>)}
    {copied && <Inline gap={2} role="status" className="docs-color-copy-status"><Icon name="check" label="Copied" /><Text variant="small">Copied {copied}</Text></Inline>}
  </Stack></AtomsRoot>
}

export function SemanticColor() {
  return <AtomsRoot><Stack gap={3}>
    <Surface padding={4} radius="small" style={{ background: 'var(--a-color-accent)' }}><Text>Primary action: ink on accent</Text></Surface>
    <Inline><Icon name="check" label="Success" /><Text>Saved successfully. Pair status color with a readable label.</Text></Inline>
    <Inline><Icon name="alert" label="Error" /><Text>Check the required fields. Color alone does not explain the problem.</Text></Inline>
  </Stack></AtomsRoot>
}
