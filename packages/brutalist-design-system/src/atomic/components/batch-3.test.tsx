import { useState } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import * as C from './index'

test('third batch exports ten actual components', () => {
  for (const name of ['Breadcrumbs', 'Pagination', 'NumberStepper', 'Slider', 'RangeSlider', 'Rating', 'ProgressBar', 'ProgressRing', 'StatusBadge', 'Alert']) expect(C).toHaveProperty(name, expect.any(Function))
})

test('Breadcrumbs exposes a named navigation and an unlinked current page', () => {
  render(<C.Breadcrumbs items={[{ label: 'Workspace', href: '/workspace' }, { label: 'Projects', href: '/projects' }, { label: 'Nordic launch' }]} />)
  expect(screen.getByRole('navigation', { name: 'Breadcrumbs' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Workspace' })).toHaveAttribute('href', '/workspace')
  expect(screen.getByText('Nordic launch')).toHaveAttribute('aria-current', 'page')
  expect(screen.queryByRole('link', { name: 'Nordic launch' })).not.toBeInTheDocument()
})

test('Breadcrumb links use a one pixel underline with an animated hover line', () => {
  render(<C.Breadcrumbs items={[{ label: 'Workspace', href: '/workspace' }, { label: 'Current' }]} />)
  const link = screen.getByRole('link', { name: 'Workspace' })
  expect(link).toHaveClass('c-breadcrumbs__link')
  const css = readFileSync(resolve(process.cwd(), 'src/atomic/components/navigation.css'), 'utf8')
  expect(css).toMatch(/\.c-breadcrumbs__link\s*\{[^}]*text-decoration-thickness:\s*var\(--a-border-width\)/)
  expect(css).toMatch(/\.c-breadcrumbs__link::after\s*\{[^}]*transition:/)
})

test('Pagination bounds actions and uses a small window for large collections', async () => {
  const user = userEvent.setup()
  function Example() { const [page, setPage] = useState(1); return <C.Pagination page={page} pageCount={1000} onPageChange={setPage} /> }
  render(<Example />)
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Next page' }))
  expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getAllByRole('button').length).toBeLessThanOrEqual(9)
  await user.click(screen.getByRole('button', { name: 'Page 1000' }))
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
})

test('Pagination with no results has no page buttons or enabled actions', () => {
  render(<C.Pagination page={1} pageCount={0} onPageChange={() => {}} />)
  expect(screen.queryByRole('button', { name: 'Page 1' })).not.toBeInTheDocument()
  expect(screen.getAllByRole('button').every(button => button.hasAttribute('disabled'))).toBe(true)
})

test('NumberStepper supports editing, decimal steps, bounds and native form values', async () => {
  const user = userEvent.setup()
  function Example() { const [value, setValue] = useState(0.2); return <form aria-label="Values"><C.NumberStepper label="Count" name="count" min={0} max={1} step={0.1} value={value} onChange={setValue} /></form> }
  render(<Example />)
  const input = screen.getByRole('spinbutton', { name: 'Count' })
  await user.click(screen.getByRole('button', { name: 'Increase Count' }))
  expect(input).toHaveValue(0.3)
  await user.clear(input); await user.type(input, '4'); await user.tab()
  expect(input).toHaveValue(1)
  expect(screen.getByRole('button', { name: 'Increase Count' })).toBeDisabled()
  expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('count')).toBe('1')
  await user.clear(input); await user.tab()
  expect(input).toHaveValue(1)
})

test('NumberStepper disabled state prevents all value changes', async () => {
  const change = vi.fn(), user = userEvent.setup()
  render(<C.NumberStepper label="Count" value={3} onChange={change} disabled />)
  expect(screen.getByRole('spinbutton')).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Increase Count' }))
  expect(change).not.toHaveBeenCalled()
})

test('Slider exposes native bounds, label, value text and submission', () => {
  const change = vi.fn()
  render(<form aria-label="Values"><C.Slider label="Intensity" name="intensity" value={60} onChange={change} min={0} max={100} formatValue={value => `${value}%`} /></form>)
  const slider = screen.getByRole('slider', { name: 'Intensity' })
  expect(slider).toHaveAttribute('aria-valuetext', '60%')
  expect(slider).toHaveAttribute('max', '100')
  expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('intensity')).toBe('60')
  fireEvent.change(slider, { target: { value: '70' } }); expect(change).toHaveBeenCalledWith(70)
})

test('Slider uses the wider 16rem control width', () => {
  const css = readFileSync(resolve(__dirname, 'value-controls.css'), 'utf8')
  expect(css).toContain('.c-slider { width: min(100%, 16rem); }')
})

test('RangeSlider composes labelled non-crossing native sliders', () => {
  function Example() { const [value, setValue] = useState<[number, number]>([25, 55]); return <C.RangeSlider label="Age range" value={value} onChange={setValue} min={18} max={80} /> }
  render(<Example />)
  const lower = screen.getByRole('slider', { name: 'Minimum' }), upper = screen.getByRole('slider', { name: 'Maximum' })
  expect(screen.getByRole('group', { name: 'Age range' })).toBeInTheDocument()
  expect(lower).toHaveAttribute('max', '55'); expect(upper).toHaveAttribute('min', '25')
  fireEvent.change(lower, { target: { value: '40' } })
  expect(upper).toHaveAttribute('min', '40')
})

test('Rating supports native keyboard selection and disabled submission semantics', async () => {
  const user = userEvent.setup()
  function Example() { const [value, setValue] = useState(3); return <form aria-label="Rating"><C.Rating label="Quality" name="quality" value={value} onChange={setValue} /></form> }
  const view = render(<Example />)
  const selected = screen.getByRole('radio', { name: '3 of 5' })
  selected.focus(); await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('radio', { name: '4 of 5' })).toBeChecked()
  expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('quality')).toBe('4')
  view.rerender(<C.Rating label="Quality" value={3} onChange={() => {}} disabled />)
  for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
})

test('ProgressBar distinguishes bounded progress from indeterminate work', () => {
  const view = render(<C.ProgressBar label="Export" value={120} />)
  expect(screen.getByRole('progressbar', { name: 'Export' })).toHaveAttribute('aria-valuenow', '100')
  view.rerender(<C.ProgressBar label="Export" />)
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  expect(screen.getByText('Working…')).toBeInTheDocument()
})

test('ProgressRing handles invalid totals without NaN or invalid ARIA values', () => {
  render(<C.ProgressRing label="Readiness" value={Number.NaN} max={0} />)
  const ring = screen.getByRole('progressbar', { name: 'Readiness' })
  expect(ring).toHaveAttribute('aria-valuemax', '100')
  expect(ring).toHaveAttribute('aria-valuenow', '0')
  expect(screen.getByText('0%')).toBeInTheDocument()
})

test('StatusBadge owns default icon and tone, not the caller', () => {
  const { container } = render(<C.StatusBadge status="success">Ready</C.StatusBadge>)
  expect(screen.getByText('Ready')).toBeInTheDocument()
  expect(container.querySelector('[data-icon="check"]')).toBeInTheDocument()
  expect(container.querySelector('[data-tone="success"]')).toBeInTheDocument()
})

test('Alert has a canonical header and description with opt-in announcements', () => {
  const view = render(<C.Alert title="Brief needs attention" description="Add a CTA before export." tone="danger" />)
  expect(screen.getByRole('heading', { name: 'Brief needs attention' })).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  view.rerender(<C.Alert title="Brief needs attention" description="Add a CTA before export." tone="danger" announce />)
  expect(screen.getByRole('alert')).toHaveTextContent('Add a CTA before export.')
})

test('Alert supports reference surface variants and a prominent danger icon', () => {
  const { container } = render(<C.Alert title="Brief needs attention" description="Add a CTA before export." tone="danger" variant="filled" size="large" />)
  const alert = container.querySelector('.c-alert')
  expect(alert).toHaveAttribute('data-variant', 'filled')
  expect(alert).toHaveAttribute('data-size', 'large')
  expect(container.querySelector('[data-icon="TriangleAlert"]')).toBeInTheDocument()
})
