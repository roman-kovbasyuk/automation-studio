import type { ReactNode } from 'react'
import { Icon, Text } from '../atoms'
import './navigation.css'

export type BreadcrumbItem = { label: ReactNode; href?: string }
export type BreadcrumbsProps = { items: readonly BreadcrumbItem[]; label?: string; className?: string }
export function Breadcrumbs({ items, label = 'Breadcrumbs', className = '' }: BreadcrumbsProps) {
  return <nav aria-label={label} className={`c-breadcrumbs ${className}`.trim()}><ol>{items.map((item, index) => {
    const current = index === items.length - 1
    return <li key={index}>
      {index > 0 && <Icon name="chevronRight" size="small" />}
      {!current && item.href ? <a className="c-breadcrumbs__link" href={item.href}><Text as="span" variant="small">{item.label}</Text></a> : <Text as="span" variant={current ? 'h7' : 'small'} aria-current={current ? 'page' : undefined}>{item.label}</Text>}
    </li>
  })}</ol></nav>
}
