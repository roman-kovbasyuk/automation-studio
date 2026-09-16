import { render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import App from './App.jsx'

vi.mock('./studio/StudioApp.jsx', () => ({StudioApp: () => <main>Connected campaign workspace</main>}))
vi.mock('./launcher/LauncherPage.jsx', () => ({LauncherPage: () => <main>Local launchpad</main>}))
beforeEach(() => history.replaceState({}, '', '/mvp'))
test.each(['/design-system', '/design-system/'])('opens the standalone component reference at %s', async path => {
  history.replaceState({}, '', path)
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Brutalist Design System' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Installed tokens' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Back to Banner Studio' })).toHaveAttribute('href', '/')
  expect(screen.queryByText('Connected campaign workspace')).not.toBeInTheDocument()
})
test('application entry renders the connected studio', () => {
  history.replaceState({}, '', '/')
  render(<App/> )
  expect(screen.getByRole('main')).toHaveTextContent('Connected campaign workspace')
})
test.each(['/mvp', '/mvp/'])('legacy home %s preserves query and section at root', path => {
  history.replaceState({ marker: true }, '', `${path}?demoRole=admin#home-prompt`)
  render(<App />)
  expect(location.pathname + location.search + location.hash).toBe('/?demoRole=admin#home-prompt')
  expect(history.state).toEqual({ marker: true })
  expect(screen.getByRole('main')).toHaveTextContent('Connected campaign workspace')
})
test('local launcher remains available at its own URL', () => {
  history.replaceState({}, '', '/launcher')
  render(<App />)
  expect(screen.getByRole('main')).toHaveTextContent('Local launchpad')
})
test('development module route loads the isolated fixture playground', async () => {
  history.replaceState({}, '', '/mvp/dev/modules/brief?scenario=draft')
  render(<App />)
  expect(await screen.findByText('Fixture records — never production data')).toBeVisible()
  expect(screen.queryByText('Connected campaign workspace')).not.toBeInTheDocument()
})
