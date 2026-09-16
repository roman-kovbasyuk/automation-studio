import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { PromptComposer } from './organisms/PromptComposer.jsx'
import { WorkflowModuleFrame } from './organisms/WorkflowModuleFrame.jsx'
import { SettingsRow } from './organisms/SettingsPanel.jsx'

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

test('workflow and settings panels use the external Surface while keeping accessible structure', () => {
  render(<><WorkflowModuleFrame id="example" title="Brief" busy><p>Draft</p></WorkflowModuleFrame><SettingsRow label="Profile">Fields</SettingsRow></>)
  expect(screen.getByRole('region', { name: 'Brief' })).toHaveClass('a-surface')
  expect(screen.getByRole('region', { name: 'Brief' })).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByText('Profile').closest('.a-surface')).toBeInTheDocument()
})
