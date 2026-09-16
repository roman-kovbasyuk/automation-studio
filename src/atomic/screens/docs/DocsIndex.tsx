import { AtomsRoot, Container, Heading, Stack, Text } from '../../atoms'
import { NavigationList } from '../../components'
import { DocumentationInstallation } from './componentContent'
import { DocsBrand } from './DocsBrand'
import './docs.css'

export function DocsIndex() {
  return <AtomsRoot className="docs-page">
    <a className="docs-skip" href="#docs-title">Skip to content</a>
    <header className="docs-header docs-index-header">
      <DocsBrand />
      <NavigationList label="Documentation" items={[
        { id: 'basics', label: 'Basics', href: '/page-20.html?basic=color' },
        { id: 'components', label: 'Components', href: '/page-21.html?component=button' },
        { id: 'blocks', label: 'UI Blocks', href: '/page-22.html?block=sidebar' },
      ]} />
    </header>
    <main className="docs-article docs-index-main" id="docs-title" tabIndex={-1}>
      <Container maxWidth="64rem">
        <Stack gap={12}>
          <Heading level={1} variant="h1">Every element, one system</Heading>
          <section id="installation">
            <Stack gap={6}>
              <Heading level={2} variant="h3">Installation</Heading>
              <Text tone="secondary">Build and install the private package once, then provide the shared foundation to your application.</Text>
              <DocumentationInstallation />
            </Stack>
          </section>
        </Stack>
      </Container>
    </main>
  </AtomsRoot>
}
