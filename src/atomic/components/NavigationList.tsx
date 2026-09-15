import type { ReactNode } from 'react'
import { Icon, Stack, Text, type IconName } from '../atoms'
import './navigation-list.css'
export type NavigationItem = { id:string; label:string; href?:string; icon?:IconName; current?:boolean; trailing?:ReactNode; onClick?:()=>void; status?:string }
export type NavigationListProps = { label:string; items:readonly NavigationItem[] }
export function NavigationList({label,items}:NavigationListProps){
 return <nav aria-label={label}><Stack gap={1}>{items.map(item=><div className={`c-navigation-row${item.status ? ' c-navigation-row--missing' : ''}`} key={item.id}>{item.href ? <a href={item.href} aria-label={item.label} aria-current={item.current?'page':undefined} onClick={item.onClick} title={item.label}>{item.icon&&<Icon name={item.icon} size="small"/>}<Text as="span" variant="small" tone="inherit">{item.label}</Text>{item.status&&<Text as="span" variant="small" tone="secondary" aria-hidden="true">{item.status}</Text>}</a> : <div className="c-navigation-row__static" aria-label={`${item.label}: ${item.status ?? ''}`} title={item.label}>{item.icon&&<Icon name={item.icon} size="small"/>}<Text as="span" variant="small" tone="inherit">{item.label}</Text>{item.status&&<Text as="span" variant="small" tone="secondary">{item.status}</Text>}</div>}{item.trailing}</div>)}</Stack></nav>
}
