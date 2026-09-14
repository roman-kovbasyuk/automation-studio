import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { AtomsCatalog } from './AtomsCatalog'
import * as components from '../components'
import { componentManifest } from './componentManifest'
import userEvent from '@testing-library/user-event'

test('quick search finds all catalog layers and Escape restores navigation', async () => {
  const user = userEvent.setup()
  render(<AtomsCatalog />)
  const sidebar = within(screen.getByRole('complementary', { name: '' }))
  const search = sidebar.getByRole('searchbox', { name: 'Quick search' })
  await user.type(search, '  TYPO  ')
  expect(sidebar.getByRole('link', { name: 'Typography' })).toHaveAttribute('href', '#typography')
  expect(sidebar.queryByRole('link', { name: 'Button' })).not.toBeInTheDocument()
  await user.clear(search); await user.type(search, 'dropdown')
  expect(sidebar.getByRole('link', { name: 'Dropdowns' })).toHaveAttribute('href', '#component-dropdowns')
  await user.clear(search); await user.type(search, 'sidebar')
  expect(sidebar.getByRole('link', { name: 'Sidebar panel' })).toHaveAttribute('href', '#block-sidebar')
  await user.clear(search); await user.type(search, 'no-such-section')
  expect(sidebar.getByRole('status')).toHaveTextContent('No matching sections')
  await user.keyboard('{Escape}')
  expect(search).toHaveValue('')
  expect(sidebar.getByRole('link', { name: 'Button' })).toBeInTheDocument()
})

test('Dropdowns groups selectable variants under one reachable destination', async () => {
  const user = userEvent.setup()
  render(<AtomsCatalog />)
  const link = within(screen.getByRole('navigation', { name: 'Component sections' })).getByRole('link', { name: 'Dropdowns' })
  const section = document.querySelector<HTMLElement>(link.getAttribute('href')!)!
  expect(within(section).getByRole('combobox', { name: 'Primary channel' })).toBeInTheDocument()
  expect(within(section).getByRole('button', { name: /Markets/ })).toBeInTheDocument()
  await user.click(within(section).getByRole('combobox', { name: 'Channel with icons' }))
  const option = screen.getByRole('option', { name: 'Display' })
  expect(option.querySelector('svg')).not.toBeNull()
  await user.click(option)
  expect(within(section).getByRole('combobox', { name: 'Channel with icons' })).toHaveTextContent('Display')
})

test('every public Component has one reachable catalog specimen and navigation link', () => {
  expect(componentManifest.map(item => item.name).sort()).toEqual(Object.keys(components).sort())
  expect(new Set(componentManifest.map(item => item.id)).size).toBe(componentManifest.filter(item => !item.aliasOf && !item.groupedWith).length)
  render(<AtomsCatalog />)
  const navigation = screen.getByRole('navigation', { name: 'Component sections' })
  for (const item of componentManifest) {
    const link = within(navigation).getByRole('link', { name: item.title })
    expect(link).toHaveAttribute('href', `#${item.id}`)
    const specimen = document.getElementById(item.id)
    expect(specimen).not.toBeNull()
    expect(within(specimen!).getByRole('heading', { name: item.title })).toBeInTheDocument()
  }
})

test('each Atoms navigation link reaches its rendered section', () => {
  render(<AtomsCatalog />)
  for (const title of ['Color', 'Typography', 'Spacing', 'Shape & sizing', 'Elevation', 'Motion', 'Icons', 'Layout']) {
    const link = screen.getByRole('link', { name: title })
    const section = document.querySelector(link.getAttribute('href')!)
    expect(section).toBeTruthy()
    expect(section).toContainElement(screen.getByRole('heading', { name: title, level: 2 }))
  }
})

test('sidebar pins copy mode in a footer and uses the 1px navigation gap token', () => {
  render(<AtomsCatalog />)
  const sidebar = screen.getByRole('complementary', { name: '' })
  const footer = sidebar.querySelector('.atoms-nav__footer')
  expect(footer).toContainElement(screen.getByRole('switch', { name: 'Click to copy' }))
  expect(sidebar.querySelector('.atoms-nav__scroll')).toContainElement(screen.getByRole('navigation', { name: 'Atoms sections' }))
  const navStack = sidebar.querySelector('.atoms-nav__scroll nav > .a-stack')
  expect(navStack).toHaveStyle('--layout-gap: var(--a-space-1)')
})

test('sidebar navigation groups compose the shared NavigationList component', () => {
  render(<AtomsCatalog />)
  const sidebar = screen.getByRole('complementary', { name: '' })
  for (const label of ['Atoms sections', 'Component sections', 'UI block sections']) {
    const navigation = within(sidebar).getByRole('navigation', { name: label })
    expect(navigation.querySelectorAll('.c-navigation-row').length).toBeGreaterThan(0)
  }
})
