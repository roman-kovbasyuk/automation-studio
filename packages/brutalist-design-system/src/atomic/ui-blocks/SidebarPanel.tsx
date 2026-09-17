import { useEffect, useRef, useState } from 'react'
import { Heading, Icon, Inline, Stack, Surface, Text, ScrollArea, type IconName } from '../atoms'
import { Button, Menu, NavigationList, SearchField, type MenuItem, type NavigationItem } from '../components'
import './sidebar-panel.css'
export type SidebarPanelProps = {
 brand:{label:string}; primaryAction:{label:string;icon?:IconName;onClick:()=>void}
 navigation:readonly NavigationItem[]
 projects:readonly {id:string;title:string;href:string;pinned?:boolean;current?:boolean;actions?:readonly MenuItem[]}[]
 account?:{label:string;actions:readonly MenuItem[];onAction:(id:string)=>void}
 onProjectAction?:(projectId:string,actionId:string)=>void
}
export function SidebarPanel({brand,primaryAction,navigation,projects,account,onProjectAction}:SidebarPanelProps){
 const [searching,setSearching]=useState(false),[query,setQuery]=useState(''),searchButton=useRef<HTMLButtonElement>(null),restore=useRef(false)
 useEffect(()=>{if(!searching&&restore.current){searchButton.current?.focus();restore.current=false}},[searching])
 const matches=projects.filter(p=>p.title.toLowerCase().includes(query.trim().toLowerCase()))
 const rows=(p:typeof projects)=>p.map(item=>({id:item.id,label:item.title,href:item.href,current:item.current,trailing:item.actions?.length?<Menu label={'Actions for '+item.title} iconOnly items={item.actions} onSelect={id=>onProjectAction?.(item.id,id)}/>:undefined}))
 return <Surface as="aside" tone="canvas" radius="none" padding={4} className="b-sidebar" aria-label="Sidebar"><Stack gap={6}>
 {searching?<SearchField label="Search projects" autoFocus value={query} onChange={setQuery} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();restore.current=true;setQuery('');setSearching(false)}}}/>:<Inline className="b-sidebar__header"><Heading level={2} variant="h4">{brand.label}</Heading><Button ref={searchButton} iconOnly size="compact" icon="search" aria-label="Search projects" onClick={()=>setSearching(true)}/></Inline>}
 {!searching&&<><Button variant="primary" icon={primaryAction.icon??'plus'} onClick={primaryAction.onClick}>{primaryAction.label}</Button><NavigationList label="Workspace navigation" items={navigation}/></>}
 <ScrollArea label="Projects" maxHeight="28rem"><Stack gap={6}>{(['Pinned','Recent projects'] as const).map(group=>{const items=matches.filter(p=>group==='Pinned'?p.pinned:!p.pinned);return items.length?<Stack gap={2} key={group}><Heading level={3} variant="h7">{group}</Heading><NavigationList label={group} items={rows(items)}/></Stack>:null})}{!matches.length&&<Text variant="small" tone="secondary">{query?'No matching projects.':'No projects yet.'}</Text>}</Stack></ScrollArea>
 </Stack>{account&&<Stack gap={2} className="b-sidebar__account"><Menu label={account.label} icon="UserRound" side="top" items={account.actions} onSelect={account.onAction}/></Stack>}</Surface>
}
