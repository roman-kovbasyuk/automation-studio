import type { ReactNode } from 'react'
import { Icon, Stack, Text, type IconName } from '../atoms'
import './navigation-list.css'
export type NavigationItem = { id:string; label:string; href:string; icon?:IconName; current?:boolean; trailing?:ReactNode; onClick?:()=>void }
export type NavigationListProps = { label:string; items:readonly NavigationItem[] }
export function NavigationList({label,items}:NavigationListProps){
 return <nav aria-label={label}><Stack gap={1}>{items.map(item=><div className="c-navigation-row" key={item.id}><a href={item.href} aria-current={item.current?'page':undefined} onClick={item.onClick} title={item.label}>{item.icon&&<Icon name={item.icon} size="small"/>}<Text as="span" variant="small" tone="inherit">{item.label}</Text></a>{item.trailing}</div>)}</Stack></nav>
}
