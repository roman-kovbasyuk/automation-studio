import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { AnalysisProgress } from './AnalysisProgress.jsx'
import { BriefStep } from './BriefStep.jsx'

test('an open step shows its content with no toggle, before a brief is confirmed', () => {
  render(<BriefStep id="settings" title="Settings" icon="Settings" open summary="25–44 · Women">
    <p>Choose the audience</p>
  </BriefStep>)
  const step = screen.getByRole('region', { name: 'Settings' })
  expect(step).toHaveAttribute('id', 'brief-step-settings')
  expect(step).toHaveAttribute('tabindex', '-1')
  expect(within(step).getByText('Choose the audience')).toBeVisible()
  expect(within(step).queryByRole('button')).not.toBeInTheDocument()
  expect(within(step).queryByText('25–44 · Women')).not.toBeInTheDocument()
})

test('a big colored icon appears on a step that names one, and not otherwise', () => {
  render(<><BriefStep id="settings" title="Settings" icon="Settings" open><p>content</p></BriefStep>
    <BriefStep id="copy" title="Copy found" open><p>content</p></BriefStep></>)
  expect(document.querySelector('#brief-step-settings')?.closest('.bs-brief-step')?.querySelector('.bs-step-icon')).toBeTruthy()
  expect(document.querySelector('#brief-step-copy')?.closest('.bs-brief-step')?.querySelector('.bs-step-icon')).toBeNull()
})

test('a collapsed step shows its summary and an Edit button named after the step', () => {
  const edit = vi.fn()
  const { rerender } = render(<BriefStep id="settings" title="Settings" open={false} summary="25–44 · Women · Sign-ups · National" onEdit={edit}><p>Hidden content</p></BriefStep>)
  const step = screen.getByRole('region', { name: 'Settings' })
  expect(within(step).getByText('25–44 · Women · Sign-ups · National')).toBeVisible()
  expect(within(step).queryByText('Hidden content')).not.toBeInTheDocument()
  fireEvent.click(within(step).getByRole('button', { name: 'Edit settings' }))
  expect(edit).toHaveBeenCalledTimes(1)
  rerender(<BriefStep id="settings" title="Settings" open={false} summary="25–44" />)
  expect(within(screen.getByRole('region', { name: 'Settings' })).queryByRole('button')).not.toBeInTheDocument()
})

test('an already-confirmed step toggles open and closed by the same button, revealing with a state marker', () => {
  const edit = vi.fn()
  const { rerender } = render(<BriefStep id="settings" title="Settings" open={false} summary="25–44" onEdit={edit}><p>content</p></BriefStep>)
  fireEvent.click(screen.getByRole('button', { name: 'Edit settings' }))
  expect(edit).toHaveBeenCalledTimes(1)
  rerender(<BriefStep id="settings" title="Settings" open onEdit={edit}><p>content</p></BriefStep>)
  const step = screen.getByRole('region', { name: 'Settings' })
  expect(step.closest('.bs-brief-step')).toHaveAttribute('data-state', 'revealed')
  fireEvent.click(screen.getByRole('button', { name: 'Collapse settings' }))
  expect(edit).toHaveBeenCalledTimes(2)
})

test('analysis progress names the work in one status panel', () => {
  render(<AnalysisProgress />)
  const panel = screen.getByRole('region', { name: 'Analyzing your materials' })
  expect(panel).toHaveAttribute('aria-busy', 'true')
  expect(within(panel).getByRole('status', { name: 'Analyzing' })).toBeInTheDocument()
  expect(panel).toHaveTextContent('understanding your request, structuring the brief, finding existing copy, and suggesting settings and visual keywords')
})
