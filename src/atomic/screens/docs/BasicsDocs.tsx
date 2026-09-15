import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { AtomsRoot, Container, Divider, Heading, Icon, Inline, Stack, Text } from '../../atoms'
import { Button, Drawer, Menu, NavigationList, Panel, SearchField, Table, Tabs } from '../../components'
import { CodeExample } from '../../ui-blocks/CodeExample'
import { basicsPages, publicSource } from './basicsContent'
import { componentGroups } from './docsNavigation'
import './docs.css'

const pageFromUrl = () => basicsPages.find(page => page.id === new URLSearchParams(window.location.search).get('basic')) ?? basicsPages[0]

function Installation() {
  const [manager, setManager] = useState('npm')
  const install = { npm:'npm install', pnpm:'pnpm add', yarn:'yarn add' }[manager]
  return <Stack gap={6}>
    <CodeExample title="1. Build the local package" description="In the design-system repository, build and pack the library." filename="terminal · design-system repository" source={'npm run build:atomic-library\nnpm pack ./dist-atomic-library'} />
    <CodeExample title="2. Install in your application" description="Copy the generated tarball into your app’s vendor folder. Use the actual filename printed by npm pack; the command shows the current default build." filename="terminal · consuming application" source={`${install} ./vendor/brutalist-design-system-0.1.0-atomic.0.tgz`} controls={<Tabs label="Package manager" value={manager} onChange={setManager} options={[{value:'npm',label:'npm'},{value:'pnpm',label:'pnpm'},{value:'yarn',label:'yarn'}]} />} />
    <Text variant="small" tone="secondary">This is a local package workflow. The library is private; React 19 or newer and React DOM are required in the consuming application.</Text>
    <CodeExample title="3. Provide the shared foundation" description="Import the stylesheet once and wrap your application with AtomsRoot. All examples below use the public package exports." filename="App.tsx" source={"import { AtomsRoot } from 'brutalist-design-system'\nimport 'brutalist-design-system/styles.css'\n\nexport default function App() {\n  return <AtomsRoot>Your application</AtomsRoot>\n}"} />
  </Stack>
}

export function BasicsDocs() {
  const [page, setPage] = useState(pageFromUrl)
  const contents = [{id:'overview',label:'Overview'}, {id:'installation',label:'Installation'}, {id:'examples',label:'Examples'}, {id:'example-preview',label:page.example.title,icon:'arrowRight' as const}, {id:'usage',label:'Usage guidance'}, {id:'reference',label:'Reference'}]
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
    {title:'Getting Started', items:[{id:'intro',label:'Introduction',href:'#overview'},{id:'install',label:'Installation',href:'#installation'}]},
    {title:'Basics', items:basicsPages.map(item => ({id:item.id,label:item.title,href:`/page-20.html?basic=${item.id}`,current:item.id===page.id}))},
    ...componentGroups.map(group => ({title:group.title,items:group.items.map(([label,id]) => ({id,label,href:`/atomic.html#component-${id}`}))})),
    {title:'UI Blocks',items:[{id:'sidebar',label:'Sidebar panel',href:'/atomic.html#block-sidebar'},{id:'prompt',label:'AI prompt input',href:'/atomic.html#block-prompt-input'},{id:'example',label:'Code example',href:'/atomic.html#block-code-example'}]},
  ].map(group => ({...group, items:group.items.filter(item => item.label.toLowerCase().includes(normalized) || group.title.toLowerCase().includes(normalized))})).filter(group => group.items.length)
  const navigation = (mobile = false) => <Stack gap={6} onClick={navigate}>
    {mobile && <SearchField autoFocus label="Search documentation" value={query} onChange={setQuery} onKeyDown={event => { if(event.key==='Escape') setQuery('') }} />}
    {groups.map(group => <Stack gap={1} key={group.title}>
      <Button variant="quiet" icon={collapsed[group.title] && !normalized ? 'chevronRight':'chevronDown'} iconPosition="end" size="compact" aria-expanded={Boolean(normalized) || !collapsed[group.title]} onClick={() => setCollapsed(old => ({...old,[group.title]:!old[group.title]}))}>{group.title}</Button>
      {(!collapsed[group.title] || normalized) && <NavigationList label={`${mobile?'Mobile ':''}${group.title}`} items={group.items} />}
    </Stack>)}
    {!groups.length && <Text role="status" variant="small">No matching pages. Try another search.</Text>}
    <Divider /><Text variant="small" tone="secondary">Basics has the new documentation. Components and UI Blocks open in the existing catalog.</Text>
  </Stack>
  const indexItems = contents.map(item => ({...item,href:`#${item.id}`,current:activeSection===item.id}))

  return <AtomsRoot className="docs-page">
    <a className="docs-skip" href="#docs-title">Skip to content</a>
    <header className="docs-header">
      <Inline gap={3}><Icon name="Layers" /><Text variant="h6">Design System</Text></Inline>
      <div className="docs-search" ref={searchRef}><SearchField label="Quick search" value={query} onChange={value => { setQuery(value); if (value.trim() && window.matchMedia?.('(max-width: 800px)').matches) setMobileOpen(true) }} placeholder="Find a page… /" onKeyDown={event => { if(event.key==='Escape') setQuery('') }} /></div>
      <div className="docs-catalog-link"><NavigationList label="Catalog" items={[{id:'catalog',label:'Component catalog',href:'/atomic.html',icon:'externalLink'}]} /></div>
      <div className="docs-mobile"><Drawer title="Documentation" trigger="Browse documentation" open={mobileOpen} onOpenChange={setMobileOpen}>{navigation(true)}</Drawer></div>
    </header>
    <div className="docs-shell">
      <aside className="docs-sidebar" aria-label="Documentation">{navigation()}</aside>
      <main className="docs-article" key={page.id}>
        <Container maxWidth="52rem"><Stack gap={12}>
          <section id="overview"><Stack gap={6}>
            <Stack gap={3}><Text variant="small" tone="secondary">Basics / Foundations</Text><Heading level={1} variant="h1" id="docs-title" tabIndex={-1}>{page.title}</Heading><Text tone="secondary">{page.description}</Text></Stack>
            <div className="docs-inline-index"><Menu label="On this page" icon="chevronDown" items={contents} onSelect={id => { window.location.hash = id }} /></div>
            <CodeExample title={`${page.title} overview`} headingLevel={2} filename={`${page.sourceFile}.tsx`} source={publicSource(page.sourceFile)} preview={page.preview} />
          </Stack></section>
          <section id="installation"><Stack gap={6}><Heading level={2} variant="h3">Installation</Heading><Text tone="secondary">Use the shared library and its stylesheet in your application.</Text><Installation /></Stack></section>
          <section id="examples"><Stack gap={6}><Heading level={2} variant="h3">Examples</Heading><div id="example-preview"><CodeExample title={page.example.title} description={page.example.description} filename={`${page.sourceFile}.tsx · named example export`} source={publicSource(page.sourceFile)} preview={page.example.preview} /></div></Stack></section>
          <section id="usage"><Panel title="Usage guidance" headingLevel={2} variant="split"><Stack gap={3}>{page.notes.map(note => <Text key={note}>{note}</Text>)}</Stack></Panel></section>
          <section id="reference"><Stack gap={6}><Heading level={2} variant="h3">Reference</Heading><Panel title={`${page.title} tokens and props`} description="Values come from our shared library. CSS variables are available within AtomsRoot." variant="split"><Table label={`${page.title} reference`} rows={page.reference} rowKey={row=>row.name} columns={[{id:'name',header:'Token / prop',render:row=><code>{row.name}</code>},{id:'value',header:'Value / type',render:row=><Text variant="small">{row.value}</Text>},{id:'purpose',header:'Reference',render:row=><Text variant="small" tone="secondary">{row.purpose}</Text>}]} /></Panel></Stack></section>
          <Divider /><footer><Text variant="small" tone="secondary">Documentation structure inspired by <a href="https://alignui.com/docs/v1.2/ui/button" target="_blank" rel="noreferrer">AlignUI</a>.</Text></footer>
        </Stack></Container>
      </main>
      <aside className="docs-index" aria-label="On this page"><Stack gap={3}><Text variant="small" tone="secondary">ON THIS PAGE</Text><NavigationList label="Article sections" items={indexItems} /></Stack></aside>
    </div>
  </AtomsRoot>
}
