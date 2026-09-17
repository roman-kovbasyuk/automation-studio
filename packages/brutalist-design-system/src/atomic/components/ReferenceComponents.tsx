import { useEffect, useId, useState, type HTMLAttributes, type LabelHTMLAttributes, type ReactNode } from 'react'
import { Icon, Inline, Stack, Text, type IconName } from '../atoms'
import { Button, type ButtonProps } from './Button'
import { Menu, type MenuItem } from './Overlays'
import './reference-components.css'

export type ButtonGroupProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode; attached?: boolean }
export function ButtonGroup({ children, attached = true, className = '', ...props }: ButtonGroupProps) {
  return <div {...props} className={`c-button-group${attached ? ' c-button-group--attached' : ''} ${className}`.trim()} role="group">{children}</div>
}

export type CompactButtonProps = ButtonProps
export function CompactButton(props: CompactButtonProps) { return <Button {...props as any} size="compact" /> }

export type FancyButtonProps = ButtonProps & { subtitle?: string }
export function FancyButton({ children, subtitle, className = '', ...props }: FancyButtonProps) {
  return <Button {...props as any} className={`c-fancy-button ${className}`.trim()}><span className="c-fancy-button__copy"><Text as="span" variant="h6" tone="inherit">{children}</Text>{subtitle && <Text as="span" variant="small" tone="inherit">{subtitle}</Text>}</span></Button>
}

export type AvatarProps = HTMLAttributes<HTMLSpanElement> & { name: string; src?: string; size?: 'small' | 'medium' | 'large'; status?: 'online' | 'offline' | 'busy' }
export function Avatar({ name, src, size = 'medium', status, className = '', ...props }: AvatarProps) {
  const initials = name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
  return <span {...props} className={`c-avatar ${className}`.trim()} data-size={size} data-status={status} role="img" aria-label={name}>{src ? <img src={src} alt="" /> : <Text as="span" variant="h6" tone="inherit" style={size === 'small' ? { fontSize: 12 } : undefined}>{initials}</Text>}{status && <span className="c-avatar__status" aria-label={status} />}</span>
}
export type AvatarGroupProps = { label: string; items: readonly Pick<AvatarProps, 'name' | 'src' | 'status'>[]; max?: number; size?: AvatarProps['size'] }
export function AvatarGroup({ label, items, max = 5, size = 'medium' }: AvatarGroupProps) { const visible = items.slice(0, max); const remaining = items.length - visible.length; return <div className="c-avatar-group" data-size={size} role="group" aria-label={label}>{visible.map(item => <Avatar key={item.name} {...item} size={size} />)}{remaining > 0 && <span className="c-avatar c-avatar--more" data-size={size}>+{remaining}</span>}</div> }
export function AvatarGroupCompact(props: AvatarGroupProps) { return <AvatarGroup {...props} size="small" /> }

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & { children: ReactNode; tone?: 'neutral' | 'accent' | 'success' | 'danger' | 'warning'; icon?: IconName }
export function Badge({ children, tone = 'neutral', icon, className = '', ...props }: BadgeProps) { return <span {...props} className={`c-badge ${className}`.trim()} data-tone={tone}>{icon && <Icon name={icon} size="small" />}<Text as="span" variant="h7" tone="inherit">{children}</Text></span> }

export type BannerProps = HTMLAttributes<HTMLElement> & { title: string; description?: string; tone?: 'neutral' | 'accent' | 'success' | 'danger' | 'warning'; action?: ReactNode; onDismiss?: () => void }
export function Banner({ title, description, tone = 'neutral', action, onDismiss, className = '', ...props }: BannerProps) { return <aside {...props} className={`c-banner ${className}`.trim()} data-tone={tone} role="status"><Icon name={tone === 'danger' || tone === 'warning' ? 'alert' : tone === 'success' ? 'check' : 'info'} /><Stack gap={1} className="c-banner__copy"><Text as="span" variant="h6" tone="inherit">{title}</Text>{description && <Text variant="small" tone="inherit">{description}</Text>}</Stack>{action}{onDismiss && <button type="button" className="c-banner__dismiss" aria-label="Dismiss" onClick={onDismiss}><Icon name="close" size="small" /></button>}</aside> }

export type KbdProps = HTMLAttributes<HTMLElement> & { children: ReactNode }
export function Kbd({ children, className = '', ...props }: KbdProps) { return <kbd {...props} className={`c-kbd ${className}`.trim()}>{children}</kbd> }

export type NotificationProps = BannerProps & { actions?: ReactNode }
export function Notification({ actions, action, className = '', ...props }: NotificationProps) { return <Banner {...props} className={`c-notification ${className}`.trim()} action={actions ?? action} /> }

export type ColorPickerProps = { label: string; value?: string; onChange?: (value: string) => void; presets?: readonly string[] }
export function ColorPicker({ label, value = '#72b8ff', onChange, presets = ['#72b8ff', '#23a094', '#dc341e', '#000000', '#ffffff'] }: ColorPickerProps) {
  const id = useId()
  const [current, setCurrent] = useState(value)
  const [draft, setDraft] = useState(value)
  useEffect(() => { setCurrent(value); setDraft(value) }, [value])
  const update = (next: string) => {
    const normalized = next.trim().toLowerCase()
    if (!/^#[0-9a-f]{6}$/i.test(normalized)) return false
    if (normalized === current) { setDraft(normalized); return true }
    setCurrent(normalized)
    setDraft(normalized)
    onChange?.(normalized)
    return true
  }
  const commitDraft = () => { if (!update(draft)) setDraft(current) }
  return <div className="c-color-picker">
    <div className="c-color-picker__heading"><Text as="span" variant="small" className="c-color-picker__label">{label}</Text><span className="c-color-picker__current-swatch" style={{ background: current }} aria-hidden="true" /><code>{current}</code></div>
    <div className="c-color-picker__row">
      <input id={`${id}-native`} className="c-color-picker__native" aria-label={label} type="color" value={current} onChange={event => update(event.target.value)} />
      <label className="c-color-picker__hex-label" htmlFor={`${id}-hex`}><Text as="span" variant="small" tone="secondary">Hex value</Text><input id={`${id}-hex`} aria-label={`${label} hex value`} aria-invalid={draft !== current && !/^#[0-9a-f]{6}$/i.test(draft)} className="c-color-picker__hex" type="text" inputMode="text" spellCheck={false} value={draft} onChange={event => setDraft(event.target.value)} onBlur={commitDraft} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commitDraft() } }} /></label>
    </div>
    <div className="c-color-picker__presets" role="group" aria-label={`${label} presets`}>{presets.map(color => <button key={color} type="button" aria-label={`Use ${color}`} aria-pressed={current.toLowerCase() === color.toLowerCase()} title={color} style={{ background: color }} onClick={() => update(color)} />)}</div>
  </div>
}

export type DigitInputProps = { label: string; length?: number; value?: string; onChange?: (value: string) => void; disabled?: boolean; error?: string }
export function DigitInput({ label, length = 4, value = '', onChange, disabled, error }: DigitInputProps) { const id = useId(); const digits = Array.from({ length }, (_, index) => value[index] ?? ''); return <fieldset className="c-digit-input" disabled={disabled}><legend><Text as="span" variant="small">{label}</Text></legend><div className="c-digit-input__row">{digits.map((digit, index) => <input key={`${id}-${index}`} aria-label={`${label} ${index + 1}`} inputMode="numeric" maxLength={1} value={digit} onChange={event => { const next = digits.slice(); next[index] = event.target.value.replace(/\D/g, ''); onChange?.(next.join('')) }} />)}</div>{error && <Text variant="small" className="c-field-support--error">{error}</Text>}</fieldset> }

export type HintProps = HTMLAttributes<HTMLParagraphElement> & { children: ReactNode; tone?: 'secondary' | 'danger' }
export function Hint({ children, tone = 'secondary', className = '', ...props }: HintProps) { return <Text {...props} variant="small" tone={tone === 'danger' ? 'ink' : 'secondary'} className={`c-hint${tone === 'danger' ? ' c-hint--error' : ''} ${className}`.trim()}>{children}</Text> }
export type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & { children: ReactNode; required?: boolean; hint?: ReactNode }
export function Label({ children, required, hint, className = '', ...props }: LabelProps) { return <label {...props} className={`c-label ${className}`.trim()}><Text as="span" variant="small" tone="inherit">{children}{required && <span aria-hidden="true"> *</span>}</Text>{hint && <Text as="span" variant="small" tone="secondary">{hint}</Text>}</label> }

export type AccordionItem = { id: string; title: string; content: ReactNode; defaultOpen?: boolean }
export type AccordionProps = { label: string; items: readonly AccordionItem[]; multiple?: boolean; className?: string }
export function Accordion({ label, items, multiple = false, className = '' }: AccordionProps) { return <section className={`c-accordion ${className}`.trim()} aria-label={label}>{items.map(item => <details key={item.id} open={item.defaultOpen} className="c-accordion__item" name={multiple ? undefined : label}><summary><Text as="span" variant="h6">{item.title}</Text><Icon name="chevronDown" size="small" /></summary><div className="c-accordion__content"><div className="c-accordion__content-inner">{item.content}</div></div></details>)}</section> }

export type TabMenuVerticalItem = { id: string; label: string; content: ReactNode }
export type TabMenuVerticalProps = { label: string; items: readonly TabMenuVerticalItem[]; value?: string; onChange?: (value: string) => void }
export function TabMenuVertical({ label, items, value, onChange }: TabMenuVerticalProps) { const [internal, setInternal] = useState(items[0]?.id ?? ''); const selected = value ?? internal; return <div className="c-tab-menu-vertical"><nav aria-label={label}>{items.map(item => <button type="button" key={item.id} aria-current={selected === item.id ? 'page' : undefined} onClick={() => { setInternal(item.id); onChange?.(item.id) }}>{item.label}</button>)}</nav><div className="c-tab-menu-vertical__content">{items.find(item => item.id === selected)?.content}</div></div> }

export type DotStepperProps = { label: string; steps: readonly string[]; current?: number; onChange?: (index: number) => void }
export function DotStepper({ label, steps, current = 0, onChange }: DotStepperProps) { return <nav className="c-dot-stepper" aria-label={label}>{steps.map((step, index) => <button key={step} type="button" aria-label={step} aria-current={index === current ? 'step' : undefined} data-complete={index < current || undefined} onClick={() => onChange?.(index)}><span /></button>)}</nav> }
export type VerticalStepperProps = { label: string; steps: readonly { id: string; label: string; description?: string; complete?: boolean }[]; current?: string; onChange?: (id: string) => void }
export function VerticalStepper({ label, steps, current, onChange }: VerticalStepperProps) { return <nav className="c-vertical-stepper" aria-label={label}><ol>{steps.map((step, index) => <li key={step.id} data-current={step.id === current || undefined} data-complete={step.complete || undefined}><button type="button" onClick={() => onChange?.(step.id)}><span className="c-vertical-stepper__marker">{step.complete ? <Icon name="check" size="small" /> : index + 1}</span><Stack gap={1}><Text as="span" variant="h6">{step.label}</Text>{step.description && <Text as="span" variant="small" tone="secondary">{step.description}</Text>}</Stack></button></li>)}</ol></nav> }

export type CommandMenuProps = { label: string; items: readonly MenuItem[]; onSelect: (id: string) => void; placeholder?: string }
export function CommandMenu({ label, items, onSelect, placeholder = 'Search commands' }: CommandMenuProps) { const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const filtered = items.filter(item => item.label.toLowerCase().includes(query.toLowerCase())); return <div className="c-command-menu"><Button icon="search" onClick={() => setOpen(true)}>{label}</Button>{open && <div className="c-command-menu__backdrop" role="presentation" onClick={() => setOpen(false)}><div className="c-command-menu__dialog" role="dialog" aria-label={label} onClick={event => event.stopPropagation()}><input autoFocus aria-label={placeholder} placeholder={placeholder} value={query} onChange={event => setQuery(event.target.value)} />{filtered.map(item => <button key={item.id} type="button" disabled={item.disabled} onClick={() => { onSelect(item.id); setOpen(false) }}><Text as="span" variant="small">{item.label}</Text><Kbd>↵</Kbd></button>)}<Text variant="small" tone="secondary">Esc to close</Text></div></div>}</div> }
