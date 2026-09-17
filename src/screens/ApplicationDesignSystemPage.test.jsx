import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import ApplicationDesignSystemPage, { installedTokens } from './ApplicationDesignSystemPage.jsx'

test('identifies the workspace package and reads tokens from it', () => {
  render(<ApplicationDesignSystemPage />)
  expect(screen.getByText('packages/brutalist-design-system')).toBeVisible()
  const table = screen.getByRole('table', { name: 'Installed design-system tokens' })
  expect(within(table).getAllByRole('row')).toHaveLength(installedTokens.length + 1)
  expect(installedTokens.some(token => token.name === '--a-color-accent')).toBe(true)
})

test('filters and copies installed token names without maintaining a second palette', async () => {
  const user = userEvent.setup()
  render(<ApplicationDesignSystemPage />)
  await user.type(screen.getByRole('searchbox', { name: 'Find a token' }), '--a-color-accent')
  await user.click(screen.getByRole('button', { name: 'Copy --a-color-accent', exact: true }))
  expect(await navigator.clipboard.readText()).toBe('--a-color-accent')
  expect(screen.getByRole('status')).toHaveTextContent('Copied --a-color-accent')
})
