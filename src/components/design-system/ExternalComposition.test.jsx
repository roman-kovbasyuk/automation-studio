import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { PromptComposer } from './organisms/PromptComposer.jsx'
import { WorkflowModuleFrame } from './organisms/WorkflowModuleFrame.jsx'

test('prompt uses external controls and preserves keyboard submit, attachments, and busy lock', () => {
  const onSubmit = vi.fn(), onAttach = vi.fn(), onRemove = vi.fn()
  const props = { value: 'A launch', onChange: vi.fn(), onSubmit, onAttach, onRemove, canSubmit: true, files: [{ id: 'a', name: 'brief.txt' }] }
  const view = render(<PromptComposer {...props} />)
  expect(screen.getByRole('textbox')).toHaveClass('c-text-input')
  expect(screen.getByRole('textbox').closest('.a-surface')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Attach brief files' })).toHaveClass('c-button')
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', ctrlKey: true })
  expect(onSubmit).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Remove brief.txt' }))
  expect(onRemove).toHaveBeenCalledWith('a')
  view.rerender(<PromptComposer {...props} busy />)
  expect(screen.getByRole('textbox')).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Attach brief files' })).toBeDisabled()
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', ctrlKey: true })
  expect(onSubmit).toHaveBeenCalledOnce()
})

test('workflow panels use the external Surface while keeping accessible structure', () => {
  render(<WorkflowModuleFrame id="example" title="Brief" busy><p>Draft</p></WorkflowModuleFrame>)
  expect(screen.getByRole('region', { name: 'Brief' })).toHaveClass('a-surface')
  expect(screen.getByRole('region', { name: 'Brief' })).toHaveAttribute('aria-busy', 'true')
})

test('a bare workflow panel keeps the labelled region and heading without the card treatment', () => {
  render(<WorkflowModuleFrame id="example" title="Brief" bare><p>Draft</p></WorkflowModuleFrame>)
  const region = screen.getByRole('region', { name: 'Brief' })
  expect(region).not.toHaveClass('a-surface')
  expect(screen.getByRole('heading', { name: 'Brief' })).toBeVisible()
  expect(screen.getByText('Draft')).toBeVisible()
})
