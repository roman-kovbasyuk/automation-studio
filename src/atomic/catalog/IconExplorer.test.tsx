import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { IconExplorer } from './IconExplorer'

test('icon-only results preserve search and copy the selected size', async () => {
  const user = userEvent.setup()
  render(<IconExplorer />)
  await user.type(screen.getByRole('searchbox', { name: 'Search icons' }), 'AArrowDown')
  const icon = screen.getByRole('button', { name: 'Copy AArrowDown' })
  expect(icon).toHaveTextContent('')
  await user.click(screen.getByRole('radio', { name: '32px' }))
  expect(icon.querySelector('svg')).toHaveStyle('--icon-size: var(--a-icon-xlarge)')
  await user.click(icon)
  expect(await navigator.clipboard.readText()).toBe('<Icon name="AArrowDown" size="xlarge" />')
  expect(screen.getByRole('status')).toHaveTextContent('Copied AArrowDown')
})
