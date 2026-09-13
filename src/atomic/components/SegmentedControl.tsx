import { useRef, useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent } from 'react'
import { ScrollArea, Text } from '../atoms'
import './segmented-control.css'

export type SegmentOption = { value: string; label: string; disabled?: boolean }
export type SegmentedControlProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> & {
  label: string
  options: readonly SegmentOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  name?: string
  disabled?: boolean
}

export function SegmentedControl({ label, options, value, defaultValue, onChange, name, disabled = false, className = '', style, ...props }: SegmentedControlProps) {
  const [internal, setInternal] = useState(defaultValue ?? options.find(option => !option.disabled)?.value)
  const selected = value === undefined ? internal : value
  const index = options.findIndex(option => option.value === selected)
  const enabled = options.map((option, i) => !option.disabled ? i : -1).filter(i => i >= 0)
  const entry = enabled.includes(index) ? index : enabled[0]
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  function choose(i: number) {
    const option = options[i]
    if (disabled || !option || option.disabled) return
    if (value === undefined) setInternal(option.value)
    onChange?.(option.value)
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(event.key) || disabled || !enabled.length) return
    event.preventDefault()
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    const forward = event.key === 'ArrowDown' || event.key === (rtl ? 'ArrowLeft' : 'ArrowRight')
    const position = enabled.indexOf(current)
    const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled[enabled.length - 1] : enabled[(position + (forward ? 1 : -1) + enabled.length) % enabled.length]
    choose(next)
    buttons.current[next]?.focus()
    buttons.current[next]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }
  return <ScrollArea label={`${label} options`} maxHeight="none" className="c-segmented-scroll"><div {...props} role="radiogroup" aria-label={label} aria-disabled={disabled || undefined} className={`c-segmented ${className}`.trim()} style={{ '--segment-count': Math.max(1, options.length), '--segment-index': index, ...style } as CSSProperties}>
    {index >= 0 && <span className="c-segmented__indicator" aria-hidden="true" />}
    {options.map((option, i) => <button key={option.value} ref={element => { buttons.current[i] = element }} type="button" role="radio" aria-checked={i === index} disabled={disabled || option.disabled} tabIndex={!disabled && i === entry ? 0 : -1} className="c-segmented__option" onClick={() => choose(i)} onKeyDown={event => navigate(event, i)}>
      <Text as="span" variant="h6" tone="inherit">{option.label}</Text>
    </button>)}
    {name && index >= 0 && <input type="hidden" name={name} value={selected} disabled={disabled || options[index].disabled} />}
  </div></ScrollArea>
}
