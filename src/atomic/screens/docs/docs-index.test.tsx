import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { DocsIndex } from './DocsIndex'

test('documentation index keeps the title, horizontal navigation, and installation guide', () => {
  render(<DocsIndex />)
  expect(screen.getByRole('img', { name: 'Brutalist Design System' }))
    .toHaveAttribute('width', '160')
  expect(screen.getByRole('img', { name: 'Brutalist Design System' }))
    .toHaveAttribute('height', '39')
  expect(screen.getByText('1.0', { selector: '.docs-brand__version' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Every element, one system', level: 1 })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Installation', level: 2 })).toBeVisible()
  expect(screen.getByRole('heading', { name: '1. Build and pack the library', level: 3 })).toBeVisible()
  expect(screen.getByRole('heading', { name: '2. Install the local package', level: 3 })).toBeVisible()
  expect(screen.getByRole('heading', { name: '3. Provide the shared foundation', level: 3 })).toBeVisible()
  expect(screen.queryByText('Browse the system')).not.toBeInTheDocument()
  expect(screen.queryByText('Documentation / Version one')).not.toBeInTheDocument()
  expect(screen.queryByText(/^Install the shared foundation once/)).not.toBeInTheDocument()
  expect(screen.queryAllByRole('tab')).toHaveLength(0)
  expect(screen.queryByRole('heading', { name: 'Basics', level: 3 })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Components', level: 3 })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'UI Blocks', level: 3 })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Basics' })).toHaveAttribute('href', '/page-20.html?basic=color')
  expect(screen.getByRole('link', { name: 'Components' })).toHaveAttribute('href', '/page-21.html?component=button')
  expect(screen.getByRole('link', { name: 'UI Blocks' })).toHaveAttribute('href', '/page-22.html?block=sidebar')
})

test('installation steps retain the canonical Panel styling', () => {
  render(<DocsIndex />)
  for (const title of ['1. Build and pack the library', '2. Install the local package', '3. Provide the shared foundation']) {
    const panel = screen.getByRole('region', { name: title })
    expect(panel).toHaveClass('c-panel', 'c-panel--split')
    expect(panel).not.toHaveClass('docs-installation-step')
  }
})
