import { AtomsRoot, Container, Heading, Stack, Text } from '../../atoms'
import { NavigationList, Panel } from '../../components'
import { DocumentationInstallation } from './componentContent'
import { DocsBrand } from './DocsBrand'
import './docs.css'

export function DocsIndex() {
  return <AtomsRoot className="docs-page">
    <a className="docs-skip" href="#docs-title">Skip to content</a>
    <header className="docs-header"><DocsBrand /><div className="docs-catalog-link"><NavigationList label="Documentation" items={[{ id: 'basics', label: 'Basics', href: '/page-20.html?basic=color' }, { id: 'components', label: 'Components', href: '/page-21.html?component=button' }, { id: 'blocks', label: 'UI Blocks', href: '/page-22.html?block=sidebar' }]} /></div></header>
    <main className="docs-article docs-index-main" id="docs-title" tabIndex={-1}><Container maxWidth="64rem"><Stack gap={12}><Stack gap={3}><Text variant="small" tone="secondary">Documentation / Version one</Text><Heading level={1} variant="h1">Every element, one system</Heading><Text tone="secondary">Install the shared foundation once, then browse the grouped foundations, components and UI blocks from the documentation pages.</Text></Stack><section id="sections"><Stack gap={6}><Heading level={2} variant="h3">Browse the system</Heading><div className="docs-index-cards"><Panel title="Basics" description="Tokens, typography, icons and layout primitives." actions={<NavigationList label="Basics" items={[{ id: 'open-basics', label: 'Open Basics', href: '/page-20.html?basic=color' }]} />} /><Panel title="Components" description="Reusable controls and interaction patterns." actions={<NavigationList label="Components" items={[{ id: 'open-components', label: 'Open Components', href: '/page-21.html?component=button' }]} />} /><Panel title="UI Blocks" description="Composed application patterns built from shared components." actions={<NavigationList label="UI Blocks" items={[{ id: 'open-blocks', label: 'Open UI Blocks', href: '/page-22.html?block=sidebar' }]} />} /></div></Stack></section><section id="installation"><Stack gap={6}><Heading level={2} variant="h3">Installation</Heading><Text tone="secondary">Build and install the private package once, then provide the shared foundation to your application.</Text><DocumentationInstallation /></Stack></section></Stack></Container></main>
  </AtomsRoot>
}
