import { useId, useState, useRef, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from 'react'
import { Select as R } from 'radix-ui'
import { AtomsRoot, Icon, Inline, Stack, Text, type IconName } from '../atoms'
import { TextField } from './TextField'
import { FieldSupport, hasContent, supportIds } from './FieldSupport'
import './forms.css'
import './select.css'
import './overlays.css'
export type SelectOption = { value: string; label: string; disabled?: boolean; icon?: IconName }
export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'multiple' | 'size' | 'value' | 'defaultValue'> & {
  label: ReactNode; options: readonly SelectOption[]; placeholder?: string; value?: string; defaultValue?: string
  instructions?: ReactNode; error?: ReactNode; onValueChange?: (value: string) => void
  customOption?: { value: string; label: string; text: string; onTextChange: (text: string) => void }
}
export function Select({ label, options, placeholder, value, defaultValue, instructions, error, id, className = '', disabled, name, required, onChange, onValueChange, customOption, 'aria-describedby': external, 'aria-invalid': invalid }: SelectProps) {
  const generated = useId(), fieldId = id ?? generated, native = useRef<HTMLSelectElement>(null)
  const [internal,setInternal]=useState(defaultValue ?? (placeholder ? '' : options.find(o=>!o.disabled)?.value ?? ''))
  const selected=value ?? internal, choices=customOption ? [...options,customOption] : options
  const change=(next:string)=>{setInternal(next);onValueChange?.(next)
    if(native.current && onChange){native.current.value=next;const event=new Event('change',{bubbles:true});onChange({target:native.current,currentTarget:native.current,nativeEvent:event,type:'change',bubbles:true,cancelable:false,defaultPrevented:false,eventPhase:3,isTrusted:false,timeStamp:event.timeStamp,persist(){},isDefaultPrevented:()=>false,isPropagationStopped:()=>false,preventDefault:()=>event.preventDefault(),stopPropagation:()=>event.stopPropagation()} as ChangeEvent<HTMLSelectElement>)}
  }
  return <Stack gap={2} className="c-field">
    <label id={`${fieldId}-label`} htmlFor={fieldId}><Text as="span" variant="h7">{label}</Text></label>
    <R.Root value={selected} onValueChange={change} disabled={disabled}>
      <R.Trigger id={fieldId} className={`c-text-input c-select-trigger ${className}`} aria-labelledby={`${fieldId}-label`} aria-describedby={supportIds(fieldId,instructions,error,external)} aria-invalid={hasContent(error)||invalid||undefined} aria-required={required}><R.Value placeholder={placeholder} /><R.Icon asChild><Icon name="chevronDown" size="small" /></R.Icon></R.Trigger>
      <R.Portal><AtomsRoot className="c-overlay-root"><R.Content className="c-dropdown-popup" position="popper" sideOffset={8} collisionPadding={16}><R.Viewport>{choices.map(option=><R.Item key={option.value} value={option.value} disabled={'disabled' in option && option.disabled} className="c-dropdown-option"><Inline gap={2}>{'icon' in option && option.icon && <Icon name={option.icon} size="small" />}<R.ItemText>{option.label}</R.ItemText></Inline><R.ItemIndicator><Icon name="check" size="small" /></R.ItemIndicator></R.Item>)}</R.Viewport></R.Content></AtomsRoot></R.Portal>
    </R.Root>
    <select ref={native} name={name} value={selected} onChange={e=>change(e.target.value)} disabled={disabled} required={required} tabIndex={-1} aria-hidden="true" className="c-select-native" onInvalid={e=>{e.preventDefault();document.getElementById(fieldId)?.focus()}}><option value="" />{choices.map(o=><option key={o.value} value={o.value} disabled={'disabled' in o && o.disabled}>{o.label}</option>)}</select>
    {customOption && selected===customOption.value && <TextField label={`${customOption.label} answer`} value={customOption.text} onChange={e=>customOption.onTextChange(e.target.value)} disabled={disabled} required={required} name={name ? `${name}Custom` : undefined} />}
    <FieldSupport id={fieldId} instructions={instructions} error={error} />
  </Stack>
}
