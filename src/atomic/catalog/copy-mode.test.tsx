import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { AtomsCatalog } from './AtomsCatalog'

test('copy mode captures component modifiers without activating the example', async () => {
  const user = userEvent.setup()
  render(<AtomsCatalog />)
  await user.click(screen.getByRole('switch', { name: 'Click to copy' }))
  const example = within(screen.getByRole('region', { name: 'Button' })).getByRole('button', { name: 'Create campaign' })
  await user.click(example)
  expect(await navigator.clipboard.readText()).toBe('use this element from design system: c-button[data-variant="primary"][data-size="default"]')
  const dropdown = screen.getByRole('combobox', { name: 'Primary channel' })
  await user.click(dropdown)
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(await navigator.clipboard.readText()).toContain('c-text-input c-select-trigger')
  dropdown.focus()
  await user.keyboard('{Enter}')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  await user.click(screen.getByRole('switch', { name: 'Click to copy' }))
  await user.click(dropdown)
  expect(screen.getByRole('listbox')).toBeInTheDocument()
})
