import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { BasicsDocs } from './BasicsDocs'
import { AtomsCatalog } from '../../catalog/AtomsCatalog'

test('direct links select the requested page; history changes update the article', () => {
  window.history.replaceState({}, '', '/page-20.html?basic=typography#reference')
  render(<BasicsDocs />)
  expect(screen.getByRole('heading', { name: 'Typography', level: 1 })).toBeVisible()
  window.history.replaceState({}, '', '/page-20.html?basic=spacing')
  fireEvent.popState(window)
  expect(screen.getByRole('heading', { name: 'Spacing', level: 1 })).toBeVisible()
})

test('unknown pages recover to Color and all eight Basics destinations work', async () => {
  window.history.replaceState({}, '', '/page-20.html?basic=missing')
  const user = userEvent.setup()
  render(<BasicsDocs />)
  expect(screen.getByRole('heading', { name: 'Color', level: 1 })).toBeVisible()
  const sidebar = within(screen.getByRole('complementary', { name: 'Documentation' }))
  for (const title of ['Color', 'Typography', 'Spacing', 'Shape & sizing', 'Elevation', 'Motion', 'Icons', 'Layout']) {
    await user.click(sidebar.getByRole('link', { name: title }))
    expect(screen.getByRole('heading', { name: title, level: 1 })).toBeVisible()
    expect(screen.getByRole('table', { name: `${title} reference` })).toBeInTheDocument()
  }
})

test('search normalizes input, reports empty matches, and Escape restores navigation', async () => {
  window.history.replaceState({}, '', '/page-20.html')
  const user = userEvent.setup()
  render(<BasicsDocs />)
  const sidebar = within(screen.getByRole('complementary', { name: 'Documentation' }))
  const search = screen.getByRole('searchbox', { name: 'Quick search' })
  await user.type(search, '  tYpO  ')
  expect(sidebar.getByRole('link', { name: 'Typography' })).toBeInTheDocument()
  expect(sidebar.queryByRole('link', { name: 'Color' })).not.toBeInTheDocument()
  await user.clear(search); await user.type(search, 'no such foundation')
  expect(sidebar.getByRole('status')).toHaveTextContent('No matching')
  await user.keyboard('{Escape}')
  expect(search).toHaveValue('')
  expect(sidebar.getByRole('link', { name: 'Color' })).toBeInTheDocument()
})

test('mobile navigation closes after selecting a Basics page', async () => {
  window.history.replaceState({}, '', '/page-20.html')
  const user = userEvent.setup()
  render(<BasicsDocs />)
  await user.click(screen.getByRole('button', { name: 'Browse documentation' }))
  const drawer = screen.getByRole('dialog', { name: 'Documentation' })
  await user.click(within(drawer).getByRole('link', { name: 'Elevation' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Elevation', level: 1 })).toBeVisible()
})

test('sidebar Installation retains its section destination on a selected Basics page', async () => {
  window.history.replaceState({}, '', '/page-20.html?basic=color')
  render(<BasicsDocs />)
  await userEvent.click(within(screen.getByRole('navigation', { name: 'Getting Started' })).getByRole('link', { name:'Installation' }))
  await waitFor(() => expect(window.location.hash).toBe('#installation'))
})

test('every component and block navigation link reaches a real catalog section', () => {
  window.history.replaceState({}, '', '/page-20.html')
  const docs = render(<BasicsDocs />)
  const links = within(screen.getByRole('complementary', { name:'Documentation' })).getAllByRole('link')
  const anchors = links.map(link => link.getAttribute('href')!).filter(href => href.startsWith('/atomic.html#')).map(href => href.split('#')[1])
  expect(anchors.length).toBeGreaterThan(40)
  docs.unmount()
  render(<AtomsCatalog />)
  for (const id of anchors) expect(document.getElementById(id), `Missing catalog destination ${id}`).not.toBeNull()
})
