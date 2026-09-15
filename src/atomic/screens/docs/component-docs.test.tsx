import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { ComponentDocs } from './ComponentDocs'
import { UIBlockDocs } from './UIBlockDocs'
import { componentManifest } from '../../catalog/componentManifest'
import { componentPageMap } from './componentContent'
import { blockPageMap } from './blockContent'

test('component routes render real grouped pages and references', async () => {
  window.history.replaceState({}, '', '/page-21.html?component=button#reference')
  const user = userEvent.setup()
  render(<ComponentDocs />)
  expect(screen.getByRole('heading', { name: 'Button', level: 1 })).toBeVisible()
  expect(screen.getByRole('table', { name: 'Button reference' })).toBeVisible()
  await user.click(within(screen.getByRole('complementary', { name: 'Documentation' })).getByRole('link', { name: 'Select' }))
  expect(screen.getByRole('heading', { name: 'Select / Combobox / MultiSelect', level: 1 })).toBeVisible()
  expect(screen.getByText('Three related controls for choosing one option, searching options or choosing several.')).toBeVisible()
})

test('Button documentation follows the reference example hierarchy', () => {
  window.history.replaceState({}, '', '/page-21.html?component=button#overview')
  render(<ComponentDocs />)
  expect(screen.getByRole('heading', { name: 'Examples', level: 2 })).toBeVisible()
  for (const title of ['Primary (Default)', 'Neutral', 'Error', 'Size', 'Disabled', 'With Icon', 'Full Width', 'asChild']) {
    expect(screen.getByRole('heading', { name: title, level: 3 })).toBeVisible()
  }
  expect(screen.getByRole('heading', { name: 'Composition', level: 2 })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'API Reference', level: 2 })).toBeVisible()
  expect(screen.getByRole('heading', { name: '1. Add Button to your application', level: 3 })).toBeVisible()
  expect(screen.queryByRole('heading', { name: '1. Install the shared package', level: 3 })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: '1. Build and pack the library', level: 3 })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: '3. Provide the shared foundation', level: 3 })).not.toBeInTheDocument()
  expect(screen.queryByText('Missing component')).not.toBeInTheDocument()
})

test('every exported component name is represented by a documentation destination', () => {
  expect(componentManifest.every(entry => componentPageMap.has(entry.id.replace(/^component-/, '')))).toBe(true)
  expect(componentPageMap.size).toBeGreaterThan(30)
  expect(blockPageMap.size).toBe(3)
})

test('UI block routes use the same documentation structure', () => {
  window.history.replaceState({}, '', '/page-22.html?block=prompt-input#overview')
  render(<UIBlockDocs />)
  expect(screen.getByRole('heading', { name: 'AI prompt input', level: 1 })).toBeVisible()
  expect(screen.getByRole('region', { name: 'AI prompt input overview' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Reference', level: 2 })).toBeVisible()
})
