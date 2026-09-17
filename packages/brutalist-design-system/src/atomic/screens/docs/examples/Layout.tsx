import { AtomsRoot, Container, Divider, Grid, Inline, ScrollArea, Stack, Surface, Text } from '../../../atoms'

export default function Layout() {
  return <AtomsRoot><Stack gap={6}>
    <Stack gap={2}><Text variant="h6">Stack & Inline</Text><Inline gap={2}>{['Brief', 'A longer item that wraps', 'Review'].map(label => <Surface key={label} padding={3} radius="small"><Text>{label}</Text></Surface>)}</Inline></Stack>
    <Divider />
    <Stack gap={2}><Text variant="h6">Responsive Grid</Text><Grid minItemWidth="9rem">{['Draft', 'Review', 'Ready'].map(label => <Surface key={label} padding={4} radius="small"><Text>{label}</Text></Surface>)}</Grid></Stack>
  </Stack></AtomsRoot>
}

export function ContainedLayout() {
  return <AtomsRoot><Stack gap={6}>
    <Container maxWidth="24rem"><Surface radius="small" padding={4}><Text>Container limits width; Surface owns the background, border, padding and radius.</Text></Surface></Container>
    <Divider />
    <ScrollArea label="Example activity" maxHeight="8rem"><Stack gap={3}>{['Draft created', 'Copy reviewed', 'Image selected', 'Layout approved', 'Export queued', 'Export complete'].map(label => <Text key={label}>{label}</Text>)}</Stack></ScrollArea>
  </Stack></AtomsRoot>
}
