import { AtomsRoot, Grid, Stack, Surface, Text, tokens } from '../../../atoms'
import { Button } from '../../../components'

export default function Shape() {
  return <AtomsRoot><Grid minItemWidth="8rem">
    {(Object.keys(tokens.radius) as (keyof typeof tokens.radius)[]).map(radius => <Surface key={radius} padding={4} radius={radius}><Stack gap={2}><Text variant="h7">{radius}</Text><Text variant="small">{tokens.radius[radius]}</Text></Stack></Surface>)}
  </Grid></AtomsRoot>
}

export function ControlSizing() {
  return <AtomsRoot><Stack gap={4}>
    <Button>Default · 48px</Button><Button size="compact">Compact · 44px</Button><Button disabled>Disabled state</Button>
    <Text variant="small" tone="secondary">Tab to an enabled button to inspect its shared focus ring.</Text>
  </Stack></AtomsRoot>
}
