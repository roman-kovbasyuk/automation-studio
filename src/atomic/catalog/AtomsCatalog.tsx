import { AtomsRoot, Heading, Text, Icon, icons, Stack, Inline, Grid, Container, Surface, Divider, ScrollArea, tokens, typography, type TypeRole, type HeadingRole, type TextRole, type IconName } from '../atoms'
import { CatalogSection as Section } from './CatalogSection'
import { ComponentsCatalog, componentSections } from './ComponentsCatalog'
import './catalog.css'
import { useState } from 'react'
import { Panel, Skeleton, Toggle, TextField } from '../components'
import { UIBlocksCatalog, uiBlockSections } from './UIBlocksCatalog'
import { IconExplorer } from './IconExplorer'
import { useCopyMode } from './useCopyMode'

const sections = [
  ['color', 'Color'], ['typography', 'Typography'], ['spacing', 'Spacing'], ['shape', 'Shape & sizing'],
  ['elevation', 'Elevation'], ['motion', 'Motion'], ['icons', 'Icons'], ['layout', 'Layout'],
] as const
const bodySample = 'We mitigate it by defining the strict design system documentation, design harness, reusable templates.'

function TypeSample({ role }: { role: TypeRole }) {
  return role.startsWith('h') ? <Heading level={3} variant={role as HeadingRole}>Avenir</Heading> : <Text variant={role as TextRole}>{bodySample}</Text>
}

export function AtomsCatalog() {
  const copyMode = useCopyMode()
  const [animate,setAnimate]=useState(true)
  const [navigationQuery, setNavigationQuery] = useState('')
  const query = navigationQuery.trim().toLowerCase()
  const navigationGroups = [
    { title: 'Basics (Atoms)', label: 'Atoms sections', entries: sections },
    { title: 'Components (Molecules)', label: 'Component sections', entries: componentSections },
    { title: 'UI Blocks (Organisms)', label: 'UI block sections', entries: uiBlockSections },
  ].map(group => ({ ...group, entries: group.entries.filter(([, title]) => title.toLowerCase().includes(query)) }))
  return <AtomsRoot className="atoms-page">
    <a className="skip-link" href="#atoms-main">Skip to Atoms</a>
    <aside className="atoms-nav">
      <div className="atoms-nav__inner">
        <Stack gap={8}>
          <Inline><Icon name="settings" size="small" /><Heading level={1} variant="h4">Design System</Heading></Inline>
          <TextField id="catalog-quick-search" type="search" label="Quick search" placeholder="Find a section…" value={navigationQuery} onChange={event => setNavigationQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setNavigationQuery('') } }} />
        </Stack>
        <div className="atoms-nav__scroll">
          <Stack gap={8}>
            {navigationGroups.filter(group => group.entries.length).map(group => <Stack key={group.label} gap={2}>
              <Text variant="small" tone="secondary">{group.title}</Text>
              <nav aria-label={group.label}><Stack gap={1}>{group.entries.map(([id, title]) => <a href={`#${id}`} key={id}>{title}</a>)}</Stack></nav>
            </Stack>)}
            {!navigationGroups.some(group => group.entries.length) && <Text role="status" variant="small">No matching sections. Try another search.</Text>}
          </Stack>
        </div>
        <div className="atoms-nav__footer">
          <Toggle id="catalog-copy-mode" label="Click to copy" checked={copyMode.enabled} onChange={event => copyMode.setEnabled(event.target.checked)} />
          {copyMode.message && <Text role="status" variant="small" className="catalog-copy-status">{copyMode.message}</Text>}
        </div>
      </div>
    </aside>
    <main id="atoms-main" className="atoms-main" tabIndex={-1}>
      <Container maxWidth="64rem"><Stack gap={12}>
        <Stack gap={3}><Heading level={2} variant="h2">Atoms</Heading><Text tone="secondary">One foundation for every component. Same visual language, rebuilt from the ground up.</Text></Stack>
        <Section id="color" title="Color">
          <Grid minItemWidth="10rem">{Object.entries(tokens.color).map(([name, value]) => <Stack gap={2} key={name}>
            <div className="color-swatch" style={{ background: `var(--a-color-${name})` }} />
            <Heading level={3} variant="h7">{name}</Heading><Text variant="small" tone="secondary">{value}</Text>
          </Stack>)}</Grid>
          <Text variant="small" tone="secondary">Ink on cyan for actions. Secondary text remains readable. Success and danger always need a text label or icon.</Text>
        </Section>
        <Section id="typography" title="Typography">
          <div className="type-list">{(Object.keys(typography) as TypeRole[]).map(role => <div className="type-row" key={role}>
            <Text variant="small">{role}</Text><TypeSample role={role} /><Text variant="small" tone="secondary">{typography[role].size} / {typography[role].line} · {typography[role].weight}</Text>
          </div>)}</div>
          <Text variant="small" tone="secondary">Avenir Next / Avenir when installed; system fallback otherwise. Visual roles are independent of semantic heading levels.</Text>
        </Section>
        <Section id="spacing" title="Spacing">
          <Stack gap={3}>{Object.entries(tokens.space).map(([step, value]) => <div className="spacing-row" key={step}>
            <Text variant="small">space-{step}</Text><div className="spacing-bar" style={{ width: `var(--a-space-${step})` }} /><Text variant="small" tone="secondary">{value}</Text>
          </div>)}</Stack>
        </Section>
        <Section id="shape" title="Shape & sizing">
          <Grid minItemWidth="9rem">{(Object.keys(tokens.radius) as (keyof typeof tokens.radius)[]).map(radius => <Surface key={radius} radius={radius} padding={4}><Stack gap={2}><Text>{radius}</Text><Text variant="small" tone="secondary">{tokens.radius[radius]}</Text></Stack></Surface>)}</Grid>
          <Divider /><Inline gap={8}>{(['control', 'compact', 'small'] as const).map(name => <Stack gap={2} key={name}><Text variant="small">{name} · {tokens.size[name]}</Text><div className="size-sample" style={{ height: `var(--a-size-${name})` }} /></Stack>)}</Inline>
          <Text variant="small" tone="secondary">1px structural rule. 44px minimum for ordinary control targets; 32px is a compact visual size, not a universal touch target.</Text>
        </Section>
        <Section id="elevation" title="Elevation">
          <Grid minItemWidth="10rem">{(Object.keys(tokens.shadow) as (keyof typeof tokens.shadow)[]).map(elevation => <Surface key={elevation} elevation={elevation} padding={4} radius="small"><Text>{elevation}</Text></Surface>)}</Grid>
          <Inline gap={6}>{Object.entries(tokens.layer).map(([name, value]) => <Text key={name} variant="small" tone="secondary">{name}: {value}</Text>)}</Inline>
        </Section>
        <Section id="motion" title="Motion" filters={<Toggle label="Play motion previews" checked={animate} onChange={e=>setAnimate(e.target.checked)} />}>
          <Grid minItemWidth="12rem">{['Feedback','Disclosure','Ease out'].map((label,index)=><Stack gap={3} key={label}><Text variant="h6">{label}</Text><div className="motion-demo" data-playing={animate} data-kind={index}><span /></div><Text variant="small" tone="secondary">{index===0?tokens.motion.fast:tokens.motion.disclosure} · {index===2?'ease out':'gentle transition'}</Text></Stack>)}</Grid>
        </Section>
        <IconExplorer />
        <Section id="layout" title="Layout">
          <Stack gap={6}>
            <Stack gap={2}><Heading level={3} variant="h6">Stack & Inline</Heading><Inline gap={2}>{['Short label', 'A longer content block that wraps at narrow widths', 'Another item', 'Final item'].map(label => <Surface key={label} padding={3} radius="small"><Text>{label}</Text></Surface>)}</Inline></Stack>
            <Stack gap={2}><Heading level={3} variant="h6">Grid</Heading><Grid minItemWidth="12rem">{['Brief', 'Review', 'Delivery'].map(label => <Surface key={label} padding={4} radius="small"><Text>{label}</Text></Surface>)}</Grid></Stack>
            <Panel title="Loading content" description="Skeleton preserves the content layout while data loads."><Skeleton label="Loading panel content" /></Panel>
            <Divider />
            <Stack gap={2}><Heading level={3} variant="h6">Container & Surface</Heading><Container maxWidth="32rem"><Surface padding={4} radius="small" tone="canvas"><Text>A constrained surface, centered inside its parent. No header or interaction is built in.</Text></Surface></Container></Stack>
            <Stack gap={2}><Heading level={3} variant="h6">ScrollArea</Heading><ScrollArea label="Layout example" maxHeight="7rem"><Stack gap={3}>{Array.from({ length: 6 }, (_, i) => <Text key={i}>Example row {i + 1} — focus this region to scroll with the keyboard.</Text>)}</Stack></ScrollArea></Stack>
          </Stack>
        </Section>
        <ComponentsCatalog />
        <UIBlocksCatalog />
      </Stack></Container>
    </main>
  </AtomsRoot>
}
