import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { DocsIndex } from './DocsIndex'

test('documentation index links every published page family', () => {
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
  expect(screen.getByRole('heading', { name: 'Browse the system', level: 2 })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Components', level: 3 })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'UI Blocks', level: 3 })).toBeVisible()
})

test('installation steps retain the canonical Panel styling', () => {
  render(<DocsIndex />)
  for (const title of ['1. Build and pack the library', '2. Install the local package', '3. Provide the shared foundation']) {
    const panel = screen.getByRole('region', { name: title })
    expect(panel).toHaveClass('c-panel', 'c-panel--split')
    expect(panel).not.toHaveClass('docs-installation-step')
  }
})
