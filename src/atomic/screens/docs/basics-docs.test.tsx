import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { BasicsDocs } from './BasicsDocs'
import { componentPageMap } from './componentContent'
import { blockPageMap } from './blockContent'
import Color, { colorGroupItems } from './examples/Color'

test('direct links select the requested page; history changes update the article', () => {
  window.history.replaceState({}, '', '/page-20.html?basic=typography#reference')
  render(<BasicsDocs />)
  expect(screen.getByRole('heading', { name: 'Typography', level: 1 })).toBeVisible()
  window.history.replaceState({}, '', '/page-20.html?basic=spacing')
  fireEvent.popState(window)
  expect(screen.getByRole('heading', { name: 'Spacing', level: 1 })).toBeVisible()
})

test('foundation previews do not offer global source copying', () => {
  window.history.replaceState({}, '', '/page-20.html?basic=typography#overview')
  render(<BasicsDocs />)
  expect(screen.queryByRole('button', { name: 'Copy Typography overview code' })).not.toBeInTheDocument()
})

test('icons preview hides names and copies the selected icon size', async () => {
  window.history.replaceState({}, '', '/page-20.html?basic=icons#overview')
  const user = userEvent.setup()
  render(<BasicsDocs />)
  const icon = screen.getByRole('button', { name: 'Accessibility' })
  expect(icon).not.toHaveTextContent('Accessibility')
  await user.click(icon)
  expect(screen.getByRole('menuitem', { name: '32 px' })).toBeInTheDocument()
  await user.click(screen.getByRole('menuitem', { name: '32 px' }))
  expect(await navigator.clipboard.readText()).toBe('<Icon name="Accessibility" size="xlarge" />')
  expect(screen.getByText('Copied Accessibility at 32px', { exact: true })).toHaveRole('status')
  await user.click(icon)
  await user.click(screen.getByRole('menuitem', { name: 'Copy SVG' }))
  expect(await navigator.clipboard.readText()).toMatch(/^<svg /)
  expect(screen.getByText('Copied Accessibility SVG', { exact: true })).toHaveRole('status')
  const token = screen.getByRole('button', { name: 'Copy --a-icon-small' })
  expect(token).toHaveTextContent('--a-icon-small')
  await user.click(token)
  expect(await navigator.clipboard.readText()).toBe('--a-icon-small')
})

test('icon copy controls reserve a 64px square placeholder', () => {
  window.history.replaceState({}, '', '/page-20.html?basic=icons#overview')
  render(<BasicsDocs />)
  expect(document.querySelector('.docs-icons-grid')).not.toBeNull()
  const icon = screen.getByRole('button', { name: 'Accessibility' })
  expect(icon).toHaveClass('docs-icon-button')
})

test('icon sizes preview omits the redundant accessibility note', () => {
  window.history.replaceState({}, '', '/page-20.html?basic=icons#examples')
  render(<BasicsDocs />)
  expect(screen.queryByText('Give standalone meaningful icons a label. Omit it inside an already labeled control.')).not.toBeInTheDocument()
})

test('unknown pages recover to Color and all eight Basics destinations work', async () => {
  window.history.replaceState({}, '', '/page-20.html?basic=missing')
  const user = userEvent.setup()
  render(<BasicsDocs />)
  expect(screen.getByRole('heading', { name: 'Color', level: 1 })).toBeVisible()
  const sidebar = within(screen.getByRole('complementary', { name: 'Documentation' }))
  for (const title of ['Color', 'Typography', 'Spacing', 'Shape & sizing', 'Elevation', 'Motion', 'Icons', 'Layout']) {
    const destination = sidebar.getAllByRole('link', { name: title }).find(link => link.getAttribute('href')?.startsWith('/page-20.html?basic='))
    expect(destination).toBeDefined()
    await user.click(destination!)
    expect(screen.getByRole('heading', { name: title, level: 1 })).toBeVisible()
    if (title !== 'Color') expect(screen.getByRole('table', { name: `${title} reference` })).toBeInTheDocument()
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

test('Basics sidebar Installation points to the shared Getting Started workflow', () => {
  window.history.replaceState({}, '', '/page-20.html?basic=color')
  render(<BasicsDocs />)
  expect(within(screen.getByRole('navigation', { name: 'Getting Started' })).getByRole('link', { name: 'Installation' }))
    .toHaveAttribute('href', '/page-23.html#installation')
})

test('Color docs keep semantic tokens out of the standalone palette groups', () => {
  expect(colorGroupItems.some(item => item.id === 'color-group-semantic')).toBe(false)
  window.history.replaceState({}, '', '/page-20.html?basic=color#overview')
  render(<Color />)
  expect(screen.queryByRole('heading', { name: 'Semantic roles' })).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Static' })).toBeInTheDocument()
})

test('Color docs place the Static palette group first', () => {
  expect(colorGroupItems[0]).toEqual({ id: 'color-group-static', label: 'Static' })
  window.history.replaceState({}, '', '/page-20.html?basic=color#overview')
  render(<Color />)
  const headings = screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent)
  expect(headings[0]).toBe('Static')
})

test('foundation pages do not repeat the global installation workflow', async () => {
  window.history.replaceState({}, '', '/page-20.html?basic=spacing')
  render(<BasicsDocs />)
  expect(screen.queryByRole('heading', { name: 'Installation', level: 2 })).not.toBeInTheDocument()
  await userEvent.click(within(screen.getByRole('complementary', { name: 'Documentation' })).getByRole('link', { name: 'Typography' }))
  expect(screen.queryByRole('heading', { name: 'Installation', level: 2 })).not.toBeInTheDocument()
})

test('every component and block navigation link reaches a real documentation page', () => {
  window.history.replaceState({}, '', '/page-20.html')
  const docs = render(<BasicsDocs />)
  const links = within(screen.getByRole('complementary', { name:'Documentation' })).getAllByRole('link')
  const componentIds = links.map(link => link.getAttribute('href')!).filter(href => href.startsWith('/page-21.html?component=')).map(href => new URL(href, 'http://localhost').searchParams.get('component'))
  const blockIds = links.map(link => link.getAttribute('href')!).filter(href => href.startsWith('/page-22.html?block=')).map(href => new URL(href, 'http://localhost').searchParams.get('block'))
  expect(componentIds.length).toBeGreaterThan(20)
  expect(blockIds).toEqual(expect.arrayContaining(['sidebar', 'prompt-input', 'code-example']))
  for (const id of componentIds) expect(componentPageMap.has(id!), `Missing component documentation ${id}`).toBe(true)
  for (const id of blockIds) expect(blockPageMap.has(id!), `Missing block documentation ${id}`).toBe(true)
  docs.unmount()
})
