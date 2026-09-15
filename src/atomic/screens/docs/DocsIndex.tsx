import { AtomsRoot, Container, Divider, Heading, Icon, Inline, Stack, Text } from '../../atoms'
import { NavigationList, Panel } from '../../components'
import { basicsPages } from './basicsContent'
import { componentGroups } from './docsNavigation'
import { blockPages } from './blockContent'
import './docs.css'

export function DocsIndex() {
  return <AtomsRoot className="docs-page">
    <a className="docs-skip" href="#docs-title">Skip to content</a>
    <header className="docs-header"><Inline gap={3}><Icon name="Layers" /><Text variant="h6">Design System</Text></Inline><Text variant="small" tone="secondary">Documentation v1</Text><div className="docs-catalog-link"><NavigationList label="Catalog" items={[{ id: 'catalog', label: 'Component catalog', href: '/atomic.html', icon: 'externalLink' }]} /></div></header>
    <main className="docs-article docs-index-main" id="docs-title" tabIndex={-1}><Container maxWidth="64rem"><Stack gap={12}><Stack gap={3}><Text variant="small" tone="secondary">Documentation / Version one</Text><Heading level={1} variant="h1">Every element, one system</Heading><Text tone="secondary">Explore the foundations, controls and UI blocks that make up the Brutalist Design System. Each entry uses the public API and the same Preview, Code, Installation and Reference structure.</Text></Stack><Panel title="Basics" description="Tokens and layout primitives used by every component." variant="split"><NavigationList label="Basics documentation" items={basicsPages.map(page => ({ id: page.id, label: page.title, href: `/page-20.html?basic=${page.id}` }))} /></Panel><Stack gap={6}><Heading level={2} variant="h3">Components</Heading>{componentGroups.map(group => <Panel key={group.title} title={group.title} variant="split"><NavigationList label={`${group.title} documentation`} items={group.items.map(([label, id]) => ({ id, label, href: `/page-21.html?component=${id}` }))} /></Panel>)}</Stack><Panel title="UI Blocks" description="Composed patterns built from Basics and Components." variant="split"><NavigationList label="UI block documentation" items={blockPages.map(page => ({ id: page.id, label: page.title, href: `/page-22.html?block=${page.id}` }))} /></Panel><Divider /><Text variant="small" tone="secondary">Documentation structure inspired by <a href="https://alignui.com/docs/v1.2/ui/button" target="_blank" rel="noreferrer">AlignUI</a>. The existing catalog remains available for side-by-side inspection.</Text></Stack></Container></main>
  </AtomsRoot>
}
