import { Search, Plus, Minus, Star, Clock, Check, X, ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Copy, Download, Upload, Trash2, Pencil, Settings, Menu, Ellipsis, Eye, Info, CircleAlert, LoaderCircle, Image, File, Folder, ExternalLink } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { tokens } from './tokens'
import { icons as lucideIcons, ArrowUp, ArrowDown, CalendarDays } from 'lucide-react'

export const icons = { ...lucideIcons, calendar: CalendarDays, arrowUp: ArrowUp, arrowDown: ArrowDown, search: Search, plus: Plus, minus: Minus, star: Star, clock: Clock, check: Check, close: X, arrowLeft: ArrowLeft, arrowRight: ArrowRight, chevronDown: ChevronDown, chevronRight: ChevronRight, copy: Copy, download: Download, upload: Upload, delete: Trash2, edit: Pencil, settings: Settings, menu: Menu, more: Ellipsis, eye: Eye, info: Info, alert: CircleAlert, loading: LoaderCircle, image: Image, file: File, folder: Folder, externalLink: ExternalLink } as const
export type IconName = keyof typeof icons
export type IconProps = { name: IconName; size?: keyof typeof tokens.icon; label?: string; className?: string }

/** Omit label inside already-labelled controls; supply it for standalone meaning. */
export function Icon({ name, size = 'medium', label, className = '' }: IconProps) {
  const Glyph = icons[name]
  return <Glyph className={`a-icon ${className}`.trim()} data-icon={name} style={{ '--icon-size': `var(--a-icon-${size})` } as CSSProperties} strokeWidth={1.5} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true} focusable="false" />
}
