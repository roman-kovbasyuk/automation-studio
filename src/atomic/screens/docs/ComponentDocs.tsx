import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { AtomsRoot, Container, Divider, Heading, Stack, Text } from '../../atoms'
import { Drawer, Menu, NavigationList, Panel, SearchField, Table } from '../../components'
import { CodeExample } from '../../ui-blocks/CodeExample'
import { basicsPages, publicSource } from './basicsContent'
import { componentGroups } from './docsNavigation'
import { DocumentationInstallation, componentPageMap } from './componentContent'
import { DocsBrand } from './DocsBrand'
import { DocsNavGroup } from './DocsNavGroup'
import { getUsageGuidance } from './usageGuidance'
import './docs.css'

const pageFromUrl = () => componentPageMap.get(new URLSearchParams(window.location.search).get('component') ?? '') ?? componentPageMap.get('button')!

function UsageGuidance({ pageId, notes }: { pageId: string; notes: readonly string[] }) {
  const paragraphs = getUsageGuidance(pageId, notes)
  return <section id="usage"><Panel title="Usage guidance" headingLevel={2} variant="split"><Stack gap={3}><Text variant="small" tone="secondary">Check this guidance before choosing the component in a new context.</Text>{paragraphs.map(paragraph => <Text key={`${paragraph.label}-${paragraph.text}`}><strong>{paragraph.label}:</strong> {paragraph.text}</Text>)}</Stack></Panel></section>
}

export function ComponentDocs() {
  const [page, setPage] = useState(pageFromUrl)
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const searchRef = useRef<HTMLDivElement>(null)
  const normalized = query.trim().toLowerCase()
  const contents = page.examples ? [
    { id: 'overview', label: 'Overview' },
    { id: 'installation', label: 'Installation' },
    { id: 'examples', label: 'Examples' },
    ...page.examples.map(example => ({ id: `example-${example.id}`, label: example.title, icon: 'arrowRight' as const })),
    { id: 'composition', label: 'Composition' },
    { id: 'usage', label: 'Usage guidance' },
    { id: 'reference', label: 'API Reference' },
    { id: 'reference-props', label: `${page.title} props`, icon: 'arrowRight' as const },
  ] : [{ id: 'overview', label: 'Overview' }, { id: 'installation', label: 'Installation' }, { id: 'examples', label: 'Examples' }, { id: 'usage', label: 'Usage guidance' }, { id: 'reference', label: 'Reference' }]
  useEffect(() => { const sync = () => setPage(pageFromUrl()); window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync) }, [])
  useEffect(() => {
    document.title = `${page.title} · Brutalist Design System`
    let frame = 0
    const restoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    const scrollToHash = () => {
      const id = window.location.hash.slice(1)
      if (!contents.some(item => item.id === id)) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => { const section = document.getElementById(id); const heading = section?.querySelector<HTMLElement>('h1, h2, h3'); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }) }; section?.scrollIntoView(); setActiveSection(id) }) })
    }
    scrollToHash(); window.addEventListener('hashchange', scrollToHash); window.addEventListener('load', scrollToHash)
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => { const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top); if (visible[0]) setActiveSection(visible[0].target.id) }, { rootMargin: '-80px 0px -55% 0px' }) : undefined
    contents.forEach(item => { const element = document.getElementById(item.id); if (element) observer?.observe(element) })
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('hashchange', scrollToHash); window.removeEventListener('load', scrollToHash); window.history.scrollRestoration = restoration }
  }, [page.id])
  useEffect(() => { const shortcut = (event: KeyboardEvent) => { if (event.key === '/' && !(event.target instanceof HTMLElement && (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)))) { event.preventDefault(); searchRef.current?.querySelector('input')?.focus() } }; window.addEventListener('keydown', shortcut); return () => window.removeEventListener('keydown', shortcut) }, [])
  function navigate(event: MouseEvent) {
    const link = (event.target as HTMLElement).closest('a')
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
    if (link.getAttribute('href')?.startsWith('#')) { setMobileOpen(false); return }
    const url = new URL(link.href)
    if (url.pathname !== window.location.pathname) return
    const selected = componentPageMap.get(url.searchParams.get('component') ?? '')
    if (!selected) return
    event.preventDefault(); window.history.pushState({}, '', `${url.pathname}${url.search}#overview`); setPage(selected); setMobileOpen(false); setActiveSection('overview'); window.setTimeout(() => { document.getElementById('docs-title')?.focus(); document.getElementById('overview')?.scrollIntoView() }, 0)
  }
  const groups = [
    { title: 'Getting Started', items: [{ id: 'intro', label: 'Introduction', href: '/page-23.html' }, { id: 'install', label: 'Installation', href: '/page-23.html#installation' }] },
    { title: 'Basics', items: basicsPages.map(item => ({ id: item.id, label: item.title, href: `/page-20.html?basic=${item.id}` })) },
    ...componentGroups.map(group => ({ title: group.title, items: group.items.map(item => ({ id: item.id, label: item.label, href: item.href, current: item.id === page.id, status: item.availability === 'missing' ? 'Missing component' : item.availability === 'partial' ? 'Partial' : undefined })) })),
    { title: 'UI Blocks', items: [{ id: 'sidebar', label: 'Sidebar panel', href: '/page-22.html?block=sidebar' }, { id: 'prompt', label: 'AI prompt input', href: '/page-22.html?block=prompt-input' }, { id: 'example', label: 'Code example', href: '/page-22.html?block=code-example' }] },
  ].map(group => ({ ...group, items: group.items.filter(item => item.label.toLowerCase().includes(normalized) || group.title.toLowerCase().includes(normalized)) })).filter(group => group.items.length)
  const navigation = (mobile = false) => <Stack gap={8} onClick={navigate}>
    {mobile && <SearchField autoFocus label="Search documentation" value={query} onChange={setQuery} onKeyDown={event => { if (event.key === 'Escape') setQuery('') }} />}
    {groups.map(group => <DocsNavGroup key={group.title} title={group.title} label={`${mobile ? 'Mobile ' : ''}${group.title}`} items={group.items} collapsed={Boolean(collapsed[group.title])} forceOpen={Boolean(normalized)} onToggle={() => setCollapsed(old => ({ ...old, [group.title]: !old[group.title] }))} />)}
    {!groups.length && <Text role="status" variant="small">No matching pages. Try another search.</Text>}
    <Divider /><Text variant="small" tone="secondary">Basics and Components use the new documentation. UI Blocks use the same template.</Text>
  </Stack>
  const indexItems = contents.map(item => ({ ...item, href: `#${item.id}`, current: activeSection === item.id }))
  const Preview = page.preview
  const Example = page.example?.preview ?? page.preview
  const componentExampleClass = 'docs-component-example'
  return <AtomsRoot className="docs-page">
    <a className="docs-skip" href="#docs-title">Skip to content</a>
    <header className="docs-header"><DocsBrand /><div className="docs-search" ref={searchRef}><SearchField label="Quick search" value={query} onChange={value => { setQuery(value); if (value.trim() && window.matchMedia?.('(max-width: 800px)').matches) setMobileOpen(true) }} placeholder="Find a page… /" onKeyDown={event => { if (event.key === 'Escape') setQuery('') }} /></div><div className="docs-catalog-link"><NavigationList label="Catalog" items={[{ id: 'catalog', label: 'Component catalog', href: '/atomic.html', icon: 'externalLink' }]} /></div><div className="docs-mobile"><Drawer title="Documentation" trigger="Browse documentation" open={mobileOpen} onOpenChange={setMobileOpen}>{navigation(true)}</Drawer></div></header>
    <div className="docs-shell"><aside className="docs-sidebar" aria-label="Documentation">{navigation()}</aside><main className="docs-article" key={page.id}><Container maxWidth="52rem"><Stack gap={12}>
      <section id="overview"><Stack gap={6}><Stack gap={3}><Text variant="small" tone="secondary">{page.category} / Components</Text><Heading level={1} variant="h1" id="docs-title" tabIndex={-1}>{page.displayTitle ?? page.title}</Heading><Text tone="secondary">{page.description}</Text></Stack><div className="docs-inline-index"><Menu label="On this page" icon="chevronDown" items={contents} onSelect={id => { window.location.hash = id }} /></div><CodeExample className={componentExampleClass} title={page.overviewTitle ?? `${page.title} overview`} headingLevel={2} filename={`${page.id}.tsx`} source={page.source} preview={<Preview />} /></Stack></section>
      <section id="installation"><Stack gap={6}><Heading level={2} variant="h3">Installation</Heading><Text tone="secondary">Install the library once from Getting Started, then copy the usage for this component.</Text><DocumentationInstallation page={page} /></Stack></section>
      {page.examples ? <section id="examples"><Stack gap={6}><Heading level={2} variant="h3">Examples</Heading><Stack gap={6}>{page.examples.map(example => <section id={`example-${example.id}`} key={example.id}><CodeExample className={componentExampleClass} title={example.title} description={example.description} headingLevel={3} filename={`${page.id}.tsx · ${example.title}`} source={example.source} preview={<example.preview />} /></section>)}</Stack></Stack></section> : <section id="examples"><Stack gap={6}><Heading level={2} variant="h3">Examples</Heading><CodeExample className={componentExampleClass} title={page.example?.title ?? `${page.title} states`} description={page.example?.description ?? 'Use the same component with its supported states and props.'} filename={`${page.id}.tsx · variant example`} source={page.source} preview={<Example />} /></Stack></section>}
      {page.examples && <section id="composition"><Stack gap={6}><Heading level={2} variant="h3">Composition</Heading><Text>Build a small product-specific wrapper while keeping Button as the shared primitive.</Text>{page.composition && <CodeExample className={componentExampleClass} title={page.composition.title} description={page.composition.description} filename={`${page.id}.tsx · composition`} source={page.composition.source} preview={<page.composition.preview />} />}</Stack></section>}
      <UsageGuidance pageId={page.id} notes={page.notes} />
      <section id="reference"><Stack gap={6}><Heading level={2} variant="h3">{page.examples ? 'API Reference' : 'Reference'}</Heading><Panel title={`${page.title} props`} description="These rows reflect the public component signature and supported values." variant="split"><div id="reference-props"><Table label={`${page.title} reference`} rows={page.reference} rowKey={row => row.name} columns={[{ id: 'name', header: 'Prop', render: row => <code className="docs-reference-code" style={{ color: '#517ee6', fontSize: 14 }}>{row.name}</code> }, { id: 'value', header: 'Value / type', render: row => <Text variant="small">{row.value}</Text> }, { id: 'purpose', header: 'Description', render: row => <Text variant="small" tone="secondary">{row.purpose}</Text> }]} /></div></Panel></Stack></section>
      <Divider /><footer><Text variant="small" tone="secondary">Documentation structure inspired by <a href="https://alignui.com/docs/v1.2/ui/button" target="_blank" rel="noreferrer">AlignUI</a>.</Text></footer>
    </Stack></Container></main><aside className="docs-index" aria-label="On this page"><Stack gap={3}><Text className="docs-index__title" variant="small" tone="secondary">ON THIS PAGE</Text><NavigationList label="Article sections" items={indexItems} /></Stack></aside></div>
  </AtomsRoot>
}
