import { useId, type ReactNode } from 'react'
import { Dialog as D, DropdownMenu as M, Popover as P, Tooltip as T } from 'radix-ui'
import { AtomsRoot, Heading, Icon, Stack, Text, type IconName } from '../atoms'
import { Button } from './Button'
import './overlays.css'

export type DialogProps = { tone?: 'neutral' | 'warning' | 'confirmation'; title: string; description?: string; trigger: string; children: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }
function Modal({ title, description, trigger, children, open, onOpenChange, drawer = false, tone = 'neutral' }: DialogProps & { drawer?: boolean }) {
  const descriptionId = useId()
  return <D.Root open={open} onOpenChange={onOpenChange}><D.Trigger asChild><Button className={drawer ? 'c-drawer-trigger' : 'c-dialog-trigger'}>{trigger}</Button></D.Trigger><D.Portal><AtomsRoot className="c-overlay-root"><D.Overlay className="c-backdrop" /><D.Content className={drawer ? 'c-modal c-drawer' : 'c-modal'} aria-describedby={description ? descriptionId : undefined}>
    <Stack gap={4}><div className="c-modal__header"><D.Title asChild><Heading level={2} variant="h4">{tone !== 'neutral' && <Icon name={tone === 'warning' ? 'alert' : 'check'} size="small" />} {title}</Heading></D.Title><D.Close asChild><Button iconOnly icon="close" size="compact" aria-label="Close dialog" /></D.Close></div>{description && <D.Description asChild id={descriptionId}><Text tone="secondary">{description}</Text></D.Description>}{children}</Stack>
  </D.Content></AtomsRoot></D.Portal></D.Root>
}
export function Dialog(props: DialogProps) { return <Modal {...props} /> }
export type DrawerProps = DialogProps
export function Drawer(props: DrawerProps) { return <Modal {...props} drawer /> }

export type PopoverProps = { label: string; children: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; disabled?: boolean; variant?: 'default' | 'field' }
export function Popover({ label, children, open, onOpenChange, disabled, variant = 'default' }: PopoverProps) { return <P.Root open={open} onOpenChange={onOpenChange}><P.Trigger asChild>{variant === 'field' ? <button type="button" className="c-text-input c-select-trigger" disabled={disabled}>{label}<Icon name="chevronDown" size="small" /></button> : <Button className="c-popover-trigger" icon="chevronDown" iconPosition="end" disabled={disabled}>{label}</Button>}</P.Trigger><P.Portal><AtomsRoot className="c-overlay-root"><P.Content className={variant === 'field' ? 'c-popup c-dropdown-popup' : 'c-popup'} sideOffset={8} collisionPadding={16} aria-label={label}>{children}</P.Content></AtomsRoot></P.Portal></P.Root> }

export type MenuItem = { id: string; label: string; icon?: IconName; disabled?: boolean; danger?: boolean }
export type MenuProps = { iconOnly?: boolean; icon?: IconName; side?: 'top' | 'bottom'; label: string; items: readonly MenuItem[]; onSelect: (id: string) => void; disabled?: boolean }
const menuIcons: Record<string, IconName> = { copy: 'copy', duplicate: 'copy', delete: 'delete', download: 'download', edit: 'edit', settings: 'settings' }
export function Menu({ label, items, onSelect, disabled, iconOnly, icon='more', side='bottom' }: MenuProps) { return <M.Root><M.Trigger asChild>{iconOnly ? <Button className="c-menu-trigger" variant="quiet" iconOnly aria-label={label} icon={icon} disabled={disabled}/> : <Button className="c-menu-trigger" icon={icon} disabled={disabled}>{label}</Button>}</M.Trigger><M.Portal><AtomsRoot className="c-overlay-root"><M.Content side={side} className="c-popup c-menu" sideOffset={8} collisionPadding={16} aria-label={label}>{items.map(item => <M.Item className="c-menu__item" key={item.id} disabled={item.disabled} data-danger={item.danger || undefined} onSelect={() => onSelect(item.id)}><Icon name={item.icon ?? menuIcons[item.id] ?? 'more'} size="small" /><Text as="span" variant="small" tone="inherit">{item.label}</Text></M.Item>)}</M.Content></AtomsRoot></M.Portal></M.Root> }

export type TooltipProps = { label: string; content: string }
export function Tooltip({ label, content }: TooltipProps) { return <T.Provider delayDuration={150}><T.Root><T.Trigger asChild><Button className="c-tooltip-trigger" icon="info" size="compact">{label}</Button></T.Trigger><T.Portal><AtomsRoot className="c-overlay-root"><T.Content className="c-tooltip" sideOffset={8} collisionPadding={16}><Text variant="small" tone="inherit">{content}</Text></T.Content></AtomsRoot></T.Portal></T.Root></T.Provider> }
