import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from 'react'
import { AtomsRoot, Container, Divider, Heading, Icon, Stack, Text } from '../../atoms'
import { Drawer, Menu, NavigationList, Panel, SearchField, Table, Tag } from '../../components'
import { CodeExample } from '../../ui-blocks/CodeExample'
import { basicsPages, publicSource } from './basicsContent'
import Color, { colorGroupItems } from './examples/Color'
import { componentGroups } from './docsNavigation'
import { DocsBrand } from './DocsBrand'
import { DocsNavGroup } from './DocsNavGroup'
import './docs.css'

const pageFromUrl = () => basicsPages.find(page => page.id === new URLSearchParams(window.location.search).get('basic')) ?? basicsPages[0]

function CopyableToken({ value }: { value: string }) {
  const copy = () => { navigator.clipboard?.writeText(value) }
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); copy() }
  }
  return <Tag tone="accent" role="button" tabIndex={0} aria-label={`Copy ${value}`} className="docs-reference-token" onClick={copy} onKeyDown={handleKeyDown}>{value}</Tag>
}

function ReferenceName({ value }: { value: string }) {
  return value.startsWith('--') ? <CopyableToken value={value} /> : <code>{value}</code>
}

export function BasicsDocs() {
  const [page, setPage] = useState(pageFromUrl)
  const contents = page.id === 'color'
    ? [{ id: 'overview', label: 'Overview' }, ...colorGroupItems]
    : [{id:'overview',label:'Overview'}, ...((page.id === 'typography') ? [] : [{id:'examples',label:'Examples'}, {id:'example-preview',label:page.example.title,icon:'arrowRight' as const}, {id:'usage',label:'Usage guidance'}, {id:'reference',label:'Reference'}])]
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const searchRef = useRef<HTMLDivElement>(null)
  const normalized = query.trim().toLowerCase()
  useEffect(() => {
    const sync = () => setPage(pageFromUrl())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  useEffect(() => {
    document.title = `${page.title} · Brutalist Design System`
    let scrollFrame = 0
    const restoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    const scrollToHash = () => {
      const id = window.location.hash.slice(1)
      if (contents.some(item => item.id === id)) {
        cancelAnimationFrame(scrollFrame)
        // Wait for layout and the shared menu/drawer to finish restoring focus.
        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = requestAnimationFrame(() => {
            const section = document.getElementById(id)
            const title = section?.querySelector<HTMLElement>('h1, h2, h3')
            if (title) { title.tabIndex = -1; title.focus({preventScroll:true}) }
            section?.scrollIntoView()
            setActiveSection(id)
          })
        })
      }
    }
    scrollToHash()
    window.addEventListener('hashchange', scrollToHash)
    window.addEventListener('load', scrollToHash)
    const cleanup = () => { cancelAnimationFrame(scrollFrame); window.removeEventListener('hashchange', scrollToHash); window.removeEventListener('load', scrollToHash); window.history.scrollRestoration = restoration }
    if (!('IntersectionObserver' in window)) return cleanup
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) setActiveSection(visible[0].target.id)
    }, { rootMargin:'-80px 0px -55% 0px', threshold:0 })
    contents.forEach(item => { const element = document.getElementById(item.id); if (element) observer.observe(element) })
    return () => { observer.disconnect(); cleanup() }
  }, [page.id])
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.target instanceof HTMLElement && (event.target.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)))) {
        event.preventDefault(); searchRef.current?.querySelector('input')?.focus()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])

  function navigate(event: MouseEvent) {
    const link = (event.target as HTMLElement).closest('a')
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
    if (link.getAttribute('href')?.startsWith('#')) { setMobileOpen(false); return }
    const url = new URL(link.href)
    const selected = basicsPages.find(item => item.id === url.searchParams.get('basic'))
    if (!selected || url.pathname !== window.location.pathname) return
    event.preventDefault()
    window.history.pushState({}, '', `${url.pathname}${url.search}#overview`)
    setPage(selected); setMobileOpen(false); setActiveSection('overview')
    window.setTimeout(() => { document.getElementById('docs-title')?.focus(); document.getElementById('overview')?.scrollIntoView() }, 0)
  }
  const groups = [
    {title:'Getting Started', items:[{id:'intro',label:'Introduction',href:'/page-23.html'},{id:'install',label:'Installation',href:'/page-23.html#installation'}]},
    {title:'Basics', items:basicsPages.map(item => ({id:item.id,label:item.title,href:`/page-20.html?basic=${item.id}`,current:item.id===page.id}))},
    ...componentGroups.map(group => ({title:group.title,items:group.items.map(item => ({id:item.id,label:item.label,href:item.href,status:item.availability === 'missing' ? 'Missing component' : item.availability === 'partial' ? 'Partial' : undefined}))})),
    {title:'UI Blocks',items:[{id:'sidebar',label:'Sidebar panel',href:'/page-22.html?block=sidebar'},{id:'prompt',label:'AI prompt input',href:'/page-22.html?block=prompt-input'},{id:'example',label:'Code example',href:'/page-22.html?block=code-example'}]},
  ].map(group => ({...group, items:group.items.filter(item => item.label.toLowerCase().includes(normalized) || group.title.toLowerCase().includes(normalized))})).filter(group => group.items.length)
  const navigation = (mobile = false) => <Stack gap={8} onClick={navigate}>
    {mobile && <SearchField autoFocus label="Search documentation" value={query} onChange={setQuery} onKeyDown={event => { if(event.key==='Escape') setQuery('') }} />}
      {groups.map(group => <Stack gap={1} key={group.title}>
      <DocsNavGroup title={group.title} label={`${mobile?'Mobile ':''}${group.title}`} items={group.items} collapsed={Boolean(collapsed[group.title])} forceOpen={Boolean(normalized)} onToggle={() => setCollapsed(old => ({...old,[group.title]:!old[group.title]}))} />
    </Stack>)}
    {!groups.length && <Text role="status" variant="small">No matching pages. Try another search.</Text>}
    <Divider /><Text variant="small" tone="secondary">Use the documentation navigation to move between Basics, Components and UI Blocks.</Text>
  </Stack>
  const indexItems = contents.map(item => ({...item,href:`#${item.id}`,current:activeSection===item.id}))

  const isColor = page.id === 'color'
  return <AtomsRoot className="docs-page">
    <a className="docs-skip" href="#docs-title">Skip to content</a>
    <header className="docs-header">
      <DocsBrand />
      <div className="docs-search" ref={searchRef}><SearchField label="Quick search" value={query} onChange={value => { setQuery(value); if (value.trim() && window.matchMedia?.('(max-width: 800px)').matches) setMobileOpen(true) }} placeholder="Find a page… /" onKeyDown={event => { if(event.key==='Escape') setQuery('') }} /></div>
      <div className="docs-catalog-link"><NavigationList label="Documentation" items={[{id:'components',label:'Components',href:'/page-21.html?component=button'},{id:'blocks',label:'UI Blocks',href:'/page-22.html?block=sidebar'}]} /></div>
      <div className="docs-mobile"><Drawer title="Documentation" trigger="Browse documentation" open={mobileOpen} onOpenChange={setMobileOpen}>{navigation(true)}</Drawer></div>
    </header>
    <div className="docs-shell">
      <aside className="docs-sidebar" aria-label="Documentation">{navigation()}</aside>
      <main className="docs-article" key={page.id}>
        <Container maxWidth="52rem"><Stack gap={12}>
          <section id="overview"><Stack gap={6}>
            <Stack gap={3}><Text variant="small" tone="secondary">Basics / Foundations</Text><Heading level={1} variant="h1" id="docs-title" tabIndex={-1}>{page.title}</Heading><Text tone="secondary">{page.description}</Text></Stack>
            <div className="docs-inline-index"><Menu label="On this page" icon="chevronDown" items={contents} onSelect={id => { window.location.hash = id }} /></div>
            {isColor ? <Color /> : <CodeExample copyable={false} title={`${page.title} overview`} headingLevel={2} filename={`${page.sourceFile}.tsx`} source={publicSource(page.sourceFile)} preview={page.preview} />}
          </Stack></section>
          {!isColor && <section id="examples"><Stack gap={6}><Heading level={2} variant="h3">Examples</Heading><div id="example-preview"><CodeExample copyable={false} title={page.example.title} description={page.example.description} filename={`${page.sourceFile}.tsx · named example export`} source={publicSource(page.sourceFile)} preview={page.example.preview} /></div></Stack></section>}
          {!isColor && <section id="usage"><Panel title="Usage guidance" headingLevel={2} variant="split"><Stack gap={3}>{page.notes.map(note => <Text key={note}>{note}</Text>)}</Stack></Panel></section>}
          {!isColor && <section id="reference"><Stack gap={6}><Heading level={2} variant="h3">Reference</Heading><Panel title={`${page.title} tokens and props`} description="Values come from our shared library. CSS variables are available within AtomsRoot." variant="split"><Table label={`${page.title} reference`} rows={page.reference} rowKey={row=>row.name} columns={[{id:'name',header:'Token / prop',render:row=><ReferenceName value={row.name} />},{id:'value',header:'Value / type',render:row=><Text variant="small">{row.value}</Text>},{id:'purpose',header:'Reference',render:row=><Text variant="small" tone="secondary">{row.purpose}</Text>}]} /></Panel></Stack></section>}
          <Divider /><footer><Text variant="small" tone="secondary">Documentation structure inspired by <a href="https://alignui.com/docs/v1.2/ui/button" target="_blank" rel="noreferrer">AlignUI</a>.</Text></footer>
        </Stack></Container>
      </main>
      <aside className="docs-index" aria-label="On this page"><Stack gap={3}><Text className="docs-index__title" variant="small" tone="secondary">ON THIS PAGE</Text><NavigationList label="Article sections" items={indexItems} /></Stack></aside>
    </div>
  </AtomsRoot>
}
