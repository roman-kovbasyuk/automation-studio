import { useState, type ReactNode, type CSSProperties } from 'react'
import { Tabs as R } from 'radix-ui'
import { Text } from '../atoms'
import { SegmentedControl, type SegmentedControlProps } from './SegmentedControl'
import './tabs.css'
import './segmented-control.css'
export type TabItem = { id: string; label: string; content: ReactNode; disabled?: boolean }
export type TabsProps = { label: string; items: readonly TabItem[]; value?: string; onChange?: (value: string) => void } | SegmentedControlProps
export function Tabs(props:TabsProps) { const [internal,setInternal]=useState('items' in props ? props.items.find(i=>!i.disabled)?.id : undefined)
 if(!('items' in props))return <SegmentedControl {...props}/>
 const {label,items,value,onChange}=props,selected=value??internal,index=items.findIndex(i=>i.id===selected)
 return <R.Root className="c-tabs" value={selected} onValueChange={v=>{setInternal(v);onChange?.(v)}}><div className="c-segmented-scroll"><R.List className="c-segmented" aria-label={label} style={{'--segment-count':Math.max(1,items.length),'--segment-index':index} as CSSProperties}>{index>=0&&<span className="c-segmented__indicator" aria-hidden="true"/>}{items.map(item=><R.Trigger key={item.id} value={item.id} disabled={item.disabled} className="c-segmented__option"><Text as="span" variant="h6" tone="inherit">{item.label}</Text></R.Trigger>)}</R.List></div>{items.map(item=><R.Content className="c-tabs__content" key={item.id} value={item.id}>{item.content}</R.Content>)}</R.Root>
}
