import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { AnalysisProgress } from './AnalysisProgress.jsx'
import { BriefStep } from './BriefStep.jsx'

test('an open step shows its position, content and actions', () => {
  render(<BriefStep id="settings" number={2} total={3} title="Settings" open summary="25–44 · Women" actions={<button type="button">Proceed to visual context →</button>}>
    <p>Choose the audience</p>
  </BriefStep>)
  const step = screen.getByRole('region', { name: '2. Settings' })
  expect(step).toHaveAttribute('id', 'brief-step-settings')
  expect(step).toHaveAttribute('tabindex', '-1')
  expect(within(step).getByText('Step 2 of 3')).toBeVisible()
  expect(within(step).getByText('Choose the audience')).toBeVisible()
  expect(within(step).getByRole('button', { name: 'Proceed to visual context →' })).toBeVisible()
  expect(within(step).queryByText('25–44 · Women')).not.toBeInTheDocument()
})

test('a collapsed step shows its summary and an Edit button named after the step', () => {
  const edit = vi.fn()
  const { rerender } = render(<BriefStep id="settings" number={2} total={3} title="Settings" open={false} summary="25–44 · Women · Sign-ups · National" onEdit={edit}><p>Hidden content</p></BriefStep>)
  const step = screen.getByRole('region', { name: '2. Settings' })
  expect(within(step).getByText('25–44 · Women · Sign-ups · National')).toBeVisible()
  expect(within(step).queryByText('Hidden content')).not.toBeInTheDocument()
  fireEvent.click(within(step).getByRole('button', { name: 'Edit settings' }))
  expect(edit).toHaveBeenCalledTimes(1)
  rerender(<BriefStep id="settings" number={2} total={3} title="Settings" open={false} summary="25–44" />)
  expect(within(screen.getByRole('region', { name: '2. Settings' })).queryByRole('button')).not.toBeInTheDocument()
})

test('analysis progress names the work in one status panel', () => {
  render(<AnalysisProgress />)
  const panel = screen.getByRole('region', { name: 'Analyzing your materials' })
  expect(panel).toHaveAttribute('aria-busy', 'true')
  expect(within(panel).getByRole('status', { name: 'Analyzing' })).toBeInTheDocument()
  expect(panel).toHaveTextContent('understanding your request, structuring the brief, finding existing copy, and suggesting settings and visual keywords')
})
