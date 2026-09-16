import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import ApplicationDesignSystemPage, { installedTokens } from './ApplicationDesignSystemPage.jsx'
import provenance from '../../vendor/brutalist-design-system.json'

test('identifies the installed revision and reads tokens from the external package', () => {
  render(<ApplicationDesignSystemPage />)
  expect(screen.getByRole('link', { name: provenance.commit.slice(0, 12) })).toHaveAttribute('href', `${provenance.repository.replace(/\.git$/, '')}/commit/${provenance.commit}`)
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

// Vitest disables CSS modules by default. Supply Vite's raw-import result from
// the actual installed package, rather than a synthetic palette fixture.
vi.mock('brutalist-design-system/styles.css?raw', async () => ({
  default: (await import('node:fs')).readFileSync('node_modules/brutalist-design-system/styles.css', 'utf8'),
}))
