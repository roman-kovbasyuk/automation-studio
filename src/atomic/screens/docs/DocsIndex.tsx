import { AtomsRoot, Container, Heading, Stack, Text } from '../../atoms'
import { NavigationList } from '../../components'
import { DocumentationInstallation } from './componentContent'
import { DocsBrand } from './DocsBrand'
import './docs.css'

export function DocsIndex() {
  return <AtomsRoot className="docs-page">
    <a className="docs-skip" href="#docs-title">Skip to content</a>
    <header className="docs-header"><DocsBrand /><div className="docs-catalog-link"><NavigationList label="Catalog" items={[{ id: 'catalog', label: 'Component catalog', href: '/atomic.html', icon: 'externalLink' }]} /></div></header>
    <main className="docs-article docs-index-main" id="docs-title" tabIndex={-1}><Container maxWidth="64rem"><Stack gap={12}><Stack gap={3}><Text variant="small" tone="secondary">Documentation / Version one</Text><Heading level={1} variant="h1">Every element, one system</Heading><Text tone="secondary">Install the shared foundation once, then browse the grouped foundations, components and UI blocks from the documentation pages.</Text></Stack><section id="installation"><Stack gap={6}><Heading level={2} variant="h3">Installation</Heading><Text tone="secondary">Build and install the private package once, then provide the shared foundation to your application.</Text><DocumentationInstallation /></Stack></section></Stack></Container></main>
  </AtomsRoot>
}
