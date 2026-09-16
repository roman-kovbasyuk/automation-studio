import { selectOption } from "../../test/selectOption.js"
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { PromptComposer } from './PromptComposer.jsx'
import { SelectMenu } from './molecules/SelectMenu.jsx'
import { TemplateLibrary } from '../../studio/TemplateLibrary.jsx'

test('the status selector uses upstream popup selection and forwards its value', async () => {
  const user = userEvent.setup()
  function StatusSelectorFixture() {
    const [value, setValue] = useState('Draft')
    return <SelectMenu label="Campaign status options" triggerLabel="Open campaign status options"
      value={value} options={['Draft', 'In review', 'Ready', 'Published']} onChange={setValue} />
  }
  render(<StatusSelectorFixture />)
  const select = screen.getByRole('combobox', { name: 'Open campaign status options' })
  expect(select).toHaveTextContent('Draft')
  await selectOption(select, 'In review')
  expect(select).toHaveTextContent('In review')
  await waitFor(() => expect(select).toHaveFocus())
  await selectOption(select, 'Published')
  expect(select).toHaveTextContent('Published')
})

test('read-only campaign briefs remain selectable and focusable without submitting', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  render(<PromptComposer value="Approved campaign brief" readOnly canSubmit onSubmit={onSubmit} onChange={vi.fn()} />)
  const field = screen.getByRole('textbox', { name: 'Campaign description' })
  expect(field).toBeEnabled()
  expect(field).toHaveAttribute('readonly')
  await user.click(field)
  await user.keyboard('Cannot overwrite')
  expect(field).toHaveValue('Approved campaign brief')
  await user.keyboard('{Control>}{Enter}{/Control}')
  expect(onSubmit).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Send prompt' })).not.toBeInTheDocument()
})

test('the shared composer can describe a domain-specific mixed-file intake', () => {
  render(<PromptComposer value="" onChange={vi.fn()} onAttach={vi.fn()} files={[]}
    accept=".pdf,.svg,.woff2" formatLabel="PDF, SVG, WOFF2" attachmentsLabel="Brand materials" fileInputLabel="Brand files" attachLabel="Attach brand materials" />)
  expect(screen.getByLabelText('Brand files')).toHaveAttribute('accept', '.pdf,.svg,.woff2')
  expect(screen.getByRole('button', { name: 'Attach brand materials' })).toBeVisible()
  expect(screen.getByText('PDF, SVG, WOFF2')).toBeVisible()
})

test('every template category controls a labelled panel and keyboard focus follows the selection', async () => {
  const user = userEvent.setup()
  render(<TemplateLibrary templates={[]} onChoose={vi.fn()} />)
  expect(document.getElementById('template-categories')).toBeInTheDocument()
  const tabs = screen.getAllByRole('tab')
  expect(tabs.map(tab => tab.textContent)).toEqual(['Ads', 'Web', 'Presentations', 'Other'])
  for (const tab of tabs) {
    const panel = document.getElementById(tab.getAttribute('aria-controls'))
    expect(panel).not.toBeNull()
    expect(panel).toHaveAttribute('role', 'tabpanel')
    expect(panel).toHaveAttribute('aria-labelledby', tab.id)
  }
  await user.click(tabs[0])
  await user.keyboard('{ArrowRight}')
  expect(tabs[1]).toHaveFocus()
  expect(screen.getByRole('tabpanel', { name: 'Web' })).toBeVisible()
  expect(document.getElementById(tabs[0].getAttribute('aria-controls'))).not.toBeVisible()
  await user.tab()
  expect(screen.getByRole('tabpanel', { name: 'Web' })).toHaveFocus()
})
