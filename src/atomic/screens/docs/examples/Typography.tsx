import { AtomsRoot, Heading, Stack, Text, typography, type HeadingRole, type TypeRole } from '../../../atoms'

export default function Typography() {
  return <AtomsRoot><Stack gap={6}>
    {(Object.keys(typography) as TypeRole[]).map(role => <Stack key={role} gap={2}>
      <Text variant="small" tone="secondary">{role} · {typography[role].size} / {typography[role].line}</Text>
      {role.startsWith('h') ? <Heading level={3} variant={role as HeadingRole}>Design with intention.</Heading> : <Text variant={role}>Clear language helps people understand what comes next.</Text>}
    </Stack>)}
  </Stack></AtomsRoot>
}

export function SemanticTypography() {
  return <AtomsRoot><Stack gap={3}>
    <Heading level={2} variant="h4">Account settings</Heading>
    <Text>Heading level describes document structure. Variant sets its visual size.</Text>
    <Text variant="small" tone="secondary">Use a short supporting sentence where it helps.</Text>
  </Stack></AtomsRoot>
}
