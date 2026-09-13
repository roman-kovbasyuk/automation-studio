import { Text } from '../atoms'
import { Button } from './Button'
import './navigation.css'

export type PaginationProps = { page: number; pageCount: number; onPageChange: (page: number) => void; disabled?: boolean; label?: string; className?: string }
export function Pagination({ page, pageCount, onPageChange, disabled = false, label = 'Pagination', className = '' }: PaginationProps) {
  const count = Number.isFinite(pageCount) ? Math.max(0, Math.floor(pageCount)) : 0
  const current = Math.min(Math.max(1, Math.floor(page) || 1), Math.max(1, count))
  const pages = count <= 7 ? Array.from({ length: count }, (_, i) => i + 1) : [...new Set([1, ...Array.from({ length: 3 }, (_, i) => Math.min(count - 3, Math.max(2, current - 1)) + i), count])].sort((a, b) => a - b)
  return <nav aria-label={label} className={`c-pagination ${className}`.trim()}>
    <ol><li><Button iconOnly icon="arrowLeft" size="compact" aria-label="Previous page" disabled={disabled || current <= 1 || !count} onClick={() => onPageChange(current - 1)} /></li>
    {pages.map((number, index) => <li key={number}>
      {index > 0 && number - pages[index - 1] > 1 && <Text as="span" aria-hidden="true">…</Text>}
      <Button size="compact" aria-label={`Page ${number}`} aria-current={number === current ? 'page' : undefined} variant={number === current ? 'primary' : 'secondary'} disabled={disabled} onClick={() => { if (number !== current) onPageChange(number) }}>{number}</Button>
    </li>)}
    <li><Button iconOnly icon="arrowRight" size="compact" aria-label="Next page" disabled={disabled || current >= count} onClick={() => onPageChange(current + 1)} /></li></ol>
  </nav>
}
