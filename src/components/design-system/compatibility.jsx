import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react'
import { AtomsRoot, Alert as PublicAlert, Button, Checkbox, Grid, Heading, Inline, Menu as PublicMenu, Panel, Select, SidebarPanel as PublicSidebarPanel, Spinner, Stack, StatusBadge as PublicStatusBadge, Surface, Tag, Text, TextAction, Toggle, FileDropzone as PublicFileDropzone, icons } from 'brutalist-design-system'

// Temporary consumer API translations. No CSS or visual overrides belong here.
export { AtomsRoot as DesignSystemRoot, Checkbox as CheckboxField }
function iconName(icon) {
  if (typeof icon === 'string') return icons[icon] ? icon : undefined
  const name = icon?.type?.displayName ?? icon?.type?.name
  return icons[name] ? name : undefined
}
export function AppButton({ as, href, children, variant = 'secondary', iconOnly, icon, size, className, style, disabled, busy, ...props }) {
  const parts = Children.toArray(children)
  const glyph = iconName(icon) ?? parts.filter(isValidElement).map(iconName).find(Boolean)
  const content = parts.filter(child => !isValidElement(child) || !iconName(child))
  if (as === 'a' || href) return <TextAction {...props} href={href} disabled={disabled || busy}>{content}</TextAction>
  return <Button {...props} variant={variant === 'icon' ? 'quiet' : variant} size={size === 'compact' ? 'compact' : 'default'} icon={glyph} iconOnly={Boolean(iconOnly || variant === 'icon')} disabled={disabled} busy={busy}>{content}</Button>
}
export function SelectField({ label, options = [], placeholder, className, style, value, onChange, onValueChange, ...props }) {
  const empty = options.find(option => option.value === '')
  const clearable = empty && !empty.disabled
  const emptyValue = '__application_empty_option__'
  const choices = options.filter(option => option.value !== '' || clearable).map(option => option.value === '' ? { ...option, value: emptyValue } : option)
  return <Select {...props} label={props['aria-label'] || label} value={value === '' && clearable ? emptyValue : value} placeholder={placeholder ?? empty?.label} options={choices} onValueChange={next => {
    const selected = next === emptyValue ? '' : next
    onValueChange?.(selected)
    const target = { value: selected, name: props.name }
    onChange?.({ target, currentTarget: target, type: 'change' })
  }} />
}
export function SwitchField({ onCheckedChange, onChange, className, style, ...props }) {
  return <Toggle {...props} onChange={event => { onChange?.(event); onCheckedChange?.(event.target.checked) }} />
}
export function FileDropzone({ onFilesChange, onFiles, description, chooseLabel, className, style, ...props }) {
  return <PublicFileDropzone {...props} onFiles={onFiles ?? onFilesChange} />
}
export function ActionCard({ label, children, actions, persistentAction, status, highlighted, exiting, dismissing, className, style, ...props }) {
  return <Surface {...props} as="article" padding={6} data-highlighted={highlighted || undefined} data-exiting={exiting || undefined} data-dismissing={dismissing || undefined}>
    <Stack gap={4}><Inline gap={4}><Text as="span" variant="h7">{label}</Text>{status}{actions}</Inline>{children}{persistentAction}</Stack>
  </Surface>
}
export function FactGrid({ label = 'Details', items }) {
  return <Grid role="group" aria-label={label} minItemWidth="12rem">{items.map(item => <Stack gap={1} key={item.id ?? item.label}><Text variant="small" tone="secondary">{item.label}</Text><Text as="div" variant={item.emphasis ? 'h4' : 'body'}>{item.value ?? item.content}</Text></Stack>)}</Grid>
}
export function FormSection({ title, description, children }) { return <Panel role="group" title={title} description={description}>{children}</Panel> }
export function TagButton({ children, dismissible, disabled, onClick }) {
  return dismissible ? <Tag onRemove={disabled ? undefined : onClick} removeLabel={disabled ? undefined : 'Remove ' + children}>{children}</Tag> : <Button disabled={disabled} onClick={onClick}>{children}</Button>
}
export function SelectionTile({ label, selected, disabled, onChange, caption, children }) {
  return <Surface padding={4} radius="small"><Stack gap={3}>{children}{caption}<Button aria-label={(selected ? 'Deselect ' : 'Select ') + label} aria-pressed={selected} variant={selected ? 'primary' : 'secondary'} icon={selected ? 'check' : 'plus'} disabled={disabled} onClick={() => onChange(!selected)}>{label}</Button></Stack></Surface>
}
export function StatusBadge({ tone, status, children, showIcon }) {
  const value = status ?? (tone === 'info' || tone === 'warning' ? 'pending' : tone) ?? 'neutral'
  return <PublicStatusBadge status={value} showIcon={showIcon}>{children}</PublicStatusBadge>
}
export function Alert({ children, title, description, tone, announce = true, action }) {
  return <Stack gap={3} role={announce ? tone === 'danger' ? 'alert' : 'status' : undefined}><PublicAlert title={title} description={description} tone={tone === 'warning' || tone === 'info' ? 'neutral' : tone} action={action} />{children}</Stack>
}
export function AITaskStatus({ status, label }) {
  return status === 'running' ? <Spinner label={label} /> : <PublicAlert title={label} tone={status === 'error' ? 'danger' : status === 'success' ? 'success' : 'neutral'} announce />
}
export function SidebarPanel({ navigation = [], primaryAction, search, ...props }) {
  return <PublicSidebarPanel {...props} primaryAction={primaryAction && { ...primaryAction, icon: iconName(primaryAction.icon) }} navigation={navigation.map(item => ({ ...item, icon: iconName(item.icon) }))} />
}
export function Menu({ icon, items, ...props }) { return <PublicMenu {...props} icon={iconName(icon)} items={items.map(item => ({ ...item, icon: iconName(item.icon) }))} /> }

// The public modal only supports its own string trigger. Externally opened and
// custom-trigger dialogs retain native browser modal behavior until upstream
// exposes that contract. No backdrop, positioning or modal skin is recreated.
export function Dialog({ title, description, trigger, open: controlled, onOpenChange, children, closeLabel = 'Close dialog' }) {
  const [internal, setInternal] = useState(false)
  const open = controlled ?? internal
  const dialog = useRef(null), opener = useRef(null), titleId = useId()
  const change = next => { setInternal(next); onOpenChange?.(next) }
  useEffect(() => {
    const element = dialog.current
    if (open && !element.open) { opener.current = document.activeElement; element.showModal() }
    if (!open && element.open) element.close()
    return () => { if (element.open) element.close(); if (opener.current?.isConnected) opener.current.focus() }
  }, [open])
  const launch = isValidElement(trigger) ? cloneElement(trigger, { onClick: event => { trigger.props.onClick?.(event); if (!event.defaultPrevented) change(true) } }) : trigger ? <Button onClick={() => change(true)}>{trigger}</Button> : null
  return <>{launch}<dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); change(false) }} onClick={event => { if (event.target === event.currentTarget) change(false) }}>
    {open && <AtomsRoot><Stack gap={4}><Inline><Heading level={2} variant="h4" id={titleId}>{title}</Heading><Button iconOnly icon="close" aria-label={closeLabel} onClick={() => change(false)} /></Inline>{description && <Text>{description}</Text>}{children}</Stack></AtomsRoot>}
  </dialog></>
}
export const Drawer = Dialog
