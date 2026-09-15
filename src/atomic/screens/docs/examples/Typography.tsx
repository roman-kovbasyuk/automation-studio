import { AtomsRoot, Heading, Inline, Stack, Text, typography, type HeadingRole, type TypeRole } from '../../../atoms'

export default function Typography() {
  return <AtomsRoot style={{ background: 'transparent' }}><Stack gap={0} className="docs-typography-preview">
    {(Object.keys(typography) as TypeRole[]).map(role => <Stack key={role} gap={2} className="docs-typography-preview__sample">
      <Text variant="h6">{role.startsWith('h') ? `Title / ${role.toUpperCase()} Title` : role}</Text>
      {role.startsWith('h') ? <Heading level={3} variant={role as HeadingRole}>The quick brown fox jumps over the lazy dog.</Heading> : <Text variant={role}>The quick brown fox jumps over the lazy dog.</Text>}
      <Inline gap={2} className="docs-typography-preview__meta">
        <span>Weight: <strong>{typography[role].weight === 500 ? 'Medium' : typography[role].weight} / {typography[role].weight}</strong></span>
        <span>Font Size: <strong>{typography[role].size}</strong></span>
        <span>Line Height: <strong>{typography[role].line}</strong></span>
        <span>Letter Spacing: <strong>-1%</strong></span>
      </Inline>
    </Stack>)}
  </Stack></AtomsRoot>
}

export function SemanticTypography() {
  return <AtomsRoot style={{ background: 'transparent' }}><Stack gap={3}>
    <Heading level={2} variant="h4">Account settings</Heading>
    <Text>Heading level describes document structure. Variant sets its visual size.</Text>
    <Text variant="small" tone="secondary">Use a short supporting sentence where it helps.</Text>
  </Stack></AtomsRoot>
}
