import { useState } from 'react'
import { Grid, Icon, icons, Stack, Text, tokens, type IconName } from '../atoms'
import { Button, Tabs, SearchField } from '../components'
import { CatalogSection } from './CatalogSection'
export function IconExplorer(){
 const [query,setQuery]=useState(''),[size,setSize]=useState<keyof typeof tokens.icon>('medium'),[copied,setCopied]=useState(''),[limit,setLimit]=useState(60)
 const matches=(Object.keys(icons) as IconName[]).filter(name=>name.toLowerCase().includes(query.toLowerCase()))
 return <CatalogSection id="icons" title="Icons" filters={<Stack gap={4}><SearchField label="Search icons" value={query} onChange={v=>{setQuery(v);setLimit(60)}}/><Tabs label="Icon size" value={size} onChange={v=>setSize(v as keyof typeof tokens.icon)} options={Object.entries(tokens.icon).map(([value,label])=>({value,label}))}/></Stack>}>
 <Grid minItemWidth="9rem">{matches.slice(0,limit).map(name=><Button key={name} aria-label={`Copy ${name}`} variant="quiet" onClick={async()=>{try{await navigator.clipboard.writeText(`<Icon name="${name}" size="${size}" />`);setCopied(`Copied ${name}`)}catch{setCopied(`Clipboard unavailable. Icon: ${name}, size: ${size}.`)}}}><Icon name={name} size={size}/></Button>)}</Grid>
 {!matches.length&&<Text>No icons match this search.</Text>}{matches.length>limit&&<Button onClick={()=>setLimit(v=>v+60)}>Show more icons</Button>}{copied&&<Text role="status" variant="small">{copied}</Text>}
 </CatalogSection>
}
