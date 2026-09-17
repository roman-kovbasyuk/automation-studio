import { useId, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react'
import { Popover as P } from 'radix-ui'
import { AtomsRoot, Icon, Inline, Stack, Text } from '../atoms'
import { Button } from './Button'
import { FieldSupport, supportIds } from './FieldSupport'
import type { TextFieldProps } from './TextField'
import './date-picker.css'
import './forms.css'
import './overlays.css'
export type DatePickerProps = Omit<TextFieldProps,'type'|'value'|'defaultValue'|'min'|'max'|'onChange'> & { value?:string;defaultValue?:string;min?:string;max?:string;onChange?:(event:ChangeEvent<HTMLInputElement>)=>void;onValueChange?:(value:string)=>void }
const iso=(date:Date)=>date.toISOString().slice(0,10)
const parse=(value:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const date=new Date(value+'T12:00:00Z');return !Number.isNaN(date.getTime())&&iso(date)===value?date:null}
export function DatePicker({label,value,defaultValue='',min,max,onChange,onValueChange,disabled,readOnly,required,name,id,instructions,error,className=''}:DatePickerProps){
 const generated=useId(),fieldId=id??generated,input=useRef<HTMLInputElement>(null),days=useRef<Record<string,HTMLButtonElement|null>>({})
 const [internal,setInternal]=useState(defaultValue),[open,setOpen]=useState(false)
 const selected=value??internal, initial=parse(selected)||parse(min??'')||new Date()
 const [month,setMonth]=useState(new Date(Date.UTC(initial.getUTCFullYear(),initial.getUTCMonth(),1,12)))
 const [focus,setFocus]=useState(selected||iso(initial))
 useLayoutEffect(()=>{if(open)days.current[focus]?.focus()},[open,focus])
 const year=month.getUTCFullYear(),m=month.getUTCMonth(),count=new Date(Date.UTC(year,m+1,0)).getUTCDate(),offset=(month.getUTCDay()+6)%7
 const blocked=(date:string)=>(!!min&&date<min)||(!!max&&date>max)
 const labelText=typeof label==='string'?label:'Date'
 const choose=(date:string)=>{if(blocked(date))return;setInternal(date);onValueChange?.(date);if(input.current&&onChange){input.current.value=date;onChange({target:input.current,currentTarget:input.current} as ChangeEvent<HTMLInputElement>)}setOpen(false)}
 const move=(delta:number)=>{const next=new Date(Date.UTC(year,m+delta,1,12));setMonth(next);const day=iso(next);setFocus(min&&day<min?min:max&&day>max?max:day)}
 const keys=(event:React.KeyboardEvent<HTMLButtonElement>,date:string)=>{const current=parse(date)!;let delta=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:event.key==='ArrowDown'?7:event.key==='ArrowUp'?-7:0
   if(event.key==='Home')delta=-((current.getUTCDay()+6)%7);if(event.key==='End')delta=6-((current.getUTCDay()+6)%7)
   if(event.key==='PageDown'||event.key==='PageUp'){event.preventDefault();move(event.key==='PageDown'?1:-1);return}
   if(!delta&&event.key!=='Home')return;event.preventDefault();current.setUTCDate(current.getUTCDate()+delta);const next=iso(current);if(blocked(next))return;setFocus(next);if(current.getUTCMonth()!==m)setMonth(new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth(),1,12)));else days.current[next]?.focus()
 }
 return <Stack gap={2} className={`c-date-picker c-field ${className}`}><label htmlFor={fieldId}><Text as="span" variant="h7">{label}</Text></label><P.Root open={open} onOpenChange={next=>{setOpen(next);if(next){const d=parse(selected)||initial;setMonth(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1,12)));setFocus(iso(d))}}}><P.Anchor asChild><div className="c-date-picker__field"><input ref={input} id={fieldId} name={name} className="c-text-input" value={selected} placeholder="YYYY-MM-DD" readOnly disabled={disabled} required={required} aria-describedby={supportIds(fieldId,instructions,error)} aria-invalid={!!error||undefined} /><P.Trigger asChild><button className="c-date-picker__trigger" type="button" disabled={disabled||readOnly} aria-label={`Open ${labelText} calendar`}><Icon name="calendar" size="small" /></button></P.Trigger></div></P.Anchor>
 <P.Portal><AtomsRoot className="c-overlay-root"><P.Content className="c-popup c-calendar" sideOffset={8} collisionPadding={16} aria-label={`${labelText} calendar`} onOpenAutoFocus={e=>{e.preventDefault();days.current[focus]?.focus()}}><Stack gap={3}><Inline className="c-calendar__heading"><Button iconOnly size="compact" variant="quiet" icon="arrowLeft" aria-label="Previous month" disabled={!!min&&iso(new Date(Date.UTC(year,m,0,12)))<min} onClick={()=>move(-1)}/><Text variant="h6" role="status">{month.toLocaleDateString('en',{month:'long',year:'numeric',timeZone:'UTC'})}</Text><Button iconOnly size="compact" variant="quiet" icon="arrowRight" aria-label="Next month" disabled={!!max&&iso(new Date(Date.UTC(year,m+1,1,12)))>max} onClick={()=>move(1)}/></Inline><div className="c-calendar__grid" role="group" aria-label="Choose date">{['Mo','Tu','We','Th','Fr','Sa','Su'].map(d=><Text key={d} as="span" variant="small">{d}</Text>)}{Array.from({length:offset},(_,i)=><span key={`blank-${i}`} />)}{Array.from({length:count},(_,i)=>{const date=iso(new Date(Date.UTC(year,m,i+1,12)));return <Button key={date} ref={el=>{days.current[date]=el;if(el&&date===focus&&document.activeElement?.closest('.c-calendar'))el.focus()}} size="compact" variant={date===selected?'primary':'quiet'} aria-label={date} aria-pressed={date===selected} tabIndex={date===focus?0:-1} disabled={blocked(date)} onKeyDown={e=>keys(e,date)} onClick={()=>choose(date)}>{i+1}</Button>})}</div></Stack></P.Content></AtomsRoot></P.Portal></P.Root><FieldSupport id={fieldId} instructions={instructions} error={error}/></Stack>
}
