import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { ComponentDocs } from './ComponentDocs'
import { UIBlockDocs } from './UIBlockDocs'
import { componentManifest } from '../../componentManifest'
import { componentPageMap } from './componentContent'
import { blockPageMap } from './blockContent'
import { componentGroups } from './docsNavigation'

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

test('detailed usage guidance remains visible on pages with examples', () => {
  window.history.replaceState({}, '', '/page-21.html?component=button#usage')
  render(<ComponentDocs />)
  expect(screen.getByRole('heading', { name: 'Usage guidance', level: 2 })).toBeVisible()
  expect(screen.getByText(/The user explicitly initiates an operation/)).toBeVisible()
})

test('UI block usage guidance uses the shared guidance document', () => {
  window.history.replaceState({}, '', '/page-22.html?block=sidebar#usage')
  render(<UIBlockDocs />)
  expect(screen.getByRole('heading', { name: 'Usage guidance', level: 2 })).toBeVisible()
  expect(screen.getByText(/A workspace needs a persistent navigation structure/)).toBeVisible()
})

test('component previews use the shared centered preview layout', () => {
  window.history.replaceState({}, '', '/page-21.html?component=date-picker#overview')
  render(<ComponentDocs />)
  const preview = screen.getByRole('tabpanel', { name: 'Date picker overview preview' })
  expect(preview.closest('.docs-component-example')).not.toBeNull()
})

test('inline text editing is documented in the Form group and reuses the shared editor', () => {
  window.history.replaceState({}, '', '/page-21.html?component=inline-text#overview')
  render(<ComponentDocs />)
  expect(screen.getByRole('heading', { name: 'Inline text editing', level: 1 })).toBeVisible()
  const sidebar = within(screen.getByRole('complementary', { name: 'Documentation' }))
  expect(sidebar.getByRole('link', { name: 'Inline text editing' })).toHaveAttribute('href', '/page-21.html?component=inline-text')
  const preview = screen.getByRole('tabpanel', { name: 'Inline text editing overview preview' })
  expect(preview.querySelector('.c-inline-text')).not.toBeNull()
  expect(within(preview).getByRole('button', { name: 'Edit Campaign title' })).toBeInTheDocument()
})

test('progress bar and progress circle docs keep their previews separate', () => {
  window.history.replaceState({}, '', '/page-21.html?component=progress-bar#overview')
  const bar = render(<ComponentDocs />)
  const barPreview = screen.getByRole('tabpanel', { name: 'Progress bar overview preview' })
  expect(barPreview.querySelector('.c-progress-bar')).not.toBeNull()
  expect(barPreview.querySelector('.c-progress-ring')).toBeNull()
  const sidebar = within(screen.getByRole('complementary', { name: 'Documentation' }))
  expect(sidebar.getByRole('link', { name: 'Progress Bar' })).toHaveAttribute('href', '/page-21.html?component=progress-bar')
  expect(sidebar.getByRole('link', { name: 'Progress Circle' })).toHaveAttribute('href', '/page-21.html?component=progress-ring')
  bar.unmount()

  window.history.replaceState({}, '', '/page-21.html?component=progress-ring#overview')
  render(<ComponentDocs />)
  const ringPreview = screen.getByRole('tabpanel', { name: 'Progress ring overview preview' })
  expect(ringPreview.querySelector('.c-progress-ring')).not.toBeNull()
  expect(ringPreview.querySelector('.c-progress-bar')).toBeNull()
})

test('tabs and segmented control docs keep their controls and sizes separate', () => {
  window.history.replaceState({}, '', '/page-21.html?component=tabs#overview')
  const tabs = render(<ComponentDocs />)
  const tabsPreview = screen.getByRole('tabpanel', { name: 'Tabs overview preview' })
  expect(tabsPreview.querySelector('.c-tabs')).not.toBeNull()
  expect(tabsPreview.querySelector('.c-segmented[role="radiogroup"]')).toBeNull()
  expect(tabsPreview.querySelectorAll('.c-segmented[data-size]')).toHaveLength(2)
  tabs.unmount()

  window.history.replaceState({}, '', '/page-21.html?component=segmented-control#overview')
  render(<ComponentDocs />)
  const segmentedPreview = screen.getByRole('tabpanel', { name: 'Segmented Control overview preview' })
  expect(segmentedPreview.querySelector('.c-tabs')).toBeNull()
  expect(segmentedPreview.querySelectorAll('.c-segmented[role="radiogroup"]')).toHaveLength(2)
  expect(segmentedPreview.querySelector('.c-segmented[data-size="compact"]')).not.toBeNull()
  expect(segmentedPreview.querySelector('.c-segmented[data-size="default"]')).not.toBeNull()
})

test('vertical stepper documents header-only and descriptive modes', () => {
  window.history.replaceState({}, '', '/page-21.html?component=vertical-stepper#overview')
  render(<ComponentDocs />)
  const preview = screen.getByRole('tabpanel', { name: 'Vertical Stepper overview preview' })
  expect(preview.querySelectorAll('.c-vertical-stepper')).toHaveLength(1)
  expect(within(preview).queryByText('Headers only')).not.toBeInTheDocument()
  expect(within(preview).queryByText('Headers with descriptions')).not.toBeInTheDocument()
  expect(within(preview).getByText('Set up your workspace profile.')).toBeVisible()
  expect(within(preview).getByText('Check your information before continuing.')).toBeVisible()
  expect(within(preview).getByText('Invite your team and publish the workspace.')).toBeVisible()
  expect(within(preview).getAllByText('Review details')).toHaveLength(1)
  expect(screen.getByRole('heading', { name: 'Headers only', level: 3 })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'With descriptions', level: 3 })).toBeVisible()
  expect(screen.getByRole('tabpanel', { name: 'Headers only preview' }).querySelector('.c-vertical-stepper')).not.toBeNull()
  expect(screen.getByRole('tabpanel', { name: 'With descriptions preview' }).querySelector('.c-vertical-stepper')).not.toBeNull()
})

test('vertical stepper installation snippet shows the descriptive variant', () => {
  expect(componentPageMap.get('vertical-stepper')?.source).toContain('stepsWithDescriptions')
  expect(componentPageMap.get('vertical-stepper')?.examples?.some(example => example.id === 'headers-only')).toBe(true)
  expect(componentPageMap.get('vertical-stepper')?.examples?.some(example => example.id === 'with-descriptions')).toBe(true)
  expect(componentPageMap.get('vertical-stepper')?.reference.some(row => row.name === 'description')).toBe(true)
})

test('Kbd overview uses a descriptive keyboard shortcut label', () => {
  window.history.replaceState({}, '', '/page-21.html?component=kbd#overview')
  render(<ComponentDocs />)
  expect(screen.getByRole('heading', { name: 'Keyboard Shortcut', level: 1 })).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Kbd', level: 1 })).not.toBeInTheDocument()
  const sidebar = within(screen.getByRole('complementary', { name: 'Documentation' }))
  expect(sidebar.getByRole('link', { name: 'Keyboard Shortcut' })).toBeVisible()
  expect(sidebar.queryByRole('link', { name: 'Kbd' })).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Keyboard Shortcut overview', level: 2 })).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Kbd overview', level: 2 })).not.toBeInTheDocument()
})

test('Button Group preview uses white buttons with black strokes', () => {
  window.history.replaceState({}, '', '/page-21.html?component=button-group#overview')
  render(<ComponentDocs />)
  const preview = screen.getByRole('tabpanel', { name: 'Button Group overview preview' })
  const buttons = Array.from(preview.querySelectorAll('.c-button'))
  expect(buttons).toHaveLength(3)
  expect(buttons.every(button => button.getAttribute('data-variant') === 'secondary')).toBe(true)
})

test('File dropzone overview uses the compact upload surface and matched file actions', () => {
  window.history.replaceState({}, '', '/page-21.html?component=file-dropzone#overview')
  render(<ComponentDocs />)
  const preview = screen.getByRole('tabpanel', { name: 'File dropzone overview preview' })
  expect(preview.querySelector('.c-file-dropzone')).toHaveAttribute('data-size', 'small')
  expect(preview.querySelectorAll('.c-file-list__icon')).toHaveLength(2)
  expect(preview.querySelector('.c-file-list .c-button')).toHaveAttribute('data-size', 'compact')
  expect(componentPageMap.get('file-dropzone')?.source).toContain('size="small"')
})

test('reference prop codes use the global docs code treatment', () => {
  window.history.replaceState({}, '', '/page-21.html?component=button-group#reference')
  render(<ComponentDocs />)
  const prop = screen.getByText('children')
  expect(prop.tagName).toBe('CODE')
  expect(getComputedStyle(prop).fontSize).toBe('14px')
  expect(getComputedStyle(prop).color).toBe('rgb(81, 126, 230)')
})

test('Kbd preview keeps a 4px gap between shortcut keys', () => {
  window.history.replaceState({}, '', '/page-21.html?component=kbd#overview')
  render(<ComponentDocs />)
  const preview = screen.getByRole('tabpanel', { name: 'Keyboard Shortcut overview preview' })
  expect(preview.querySelector('.a-inline')).toHaveStyle({ '--layout-gap': 'var(--a-space-1)' })
})

test('component navigation groups use link-style accordion controls', async () => {
  window.history.replaceState({}, '', '/page-21.html?component=progress-ring#overview')
  const user = userEvent.setup()
  render(<ComponentDocs />)
  const sidebar = within(screen.getByRole('complementary', { name: 'Documentation' }))
  const layout = sidebar.getAllByRole('link', { name: 'Layout' }).find(link => link.getAttribute('href') === '#docs-nav-group-layout')
  expect(layout).toBeDefined()
  expect(layout).toHaveAttribute('aria-expanded', 'true')
  expect(sidebar.getByRole('link', { name: 'Breadcrumb' })).toBeInTheDocument()
  await user.click(layout!)
  expect(layout).toHaveAttribute('aria-expanded', 'false')
  expect(sidebar.queryByRole('link', { name: 'Breadcrumb' })).not.toBeInTheDocument()
})

test('component navigation items are alphabetized within each group', () => {
  for (const group of componentGroups) {
    const labels = group.items.map(item => item.label)
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })))
  }
})

test('Button documentation follows the reference example hierarchy', () => {
  window.history.replaceState({}, '', '/page-21.html?component=button#overview')
  render(<ComponentDocs />)
  expect(screen.getByRole('heading', { name: 'Examples', level: 2 })).toBeVisible()
  for (const title of ['Primary (Default)', 'Neutral', 'Error', 'Size', 'Disabled', 'With Icon', 'Full Width', 'Custom color', 'asChild']) {
    expect(screen.getByRole('heading', { name: title, level: 3 })).toBeVisible()
  }
  const customColorExample = screen.getByRole('tabpanel', { name: 'Custom color preview' })
  expect(customColorExample.querySelector('.c-button')).toHaveStyle({ backgroundColor: '#f2b84b' })
  expect(screen.getByRole('heading', { name: 'Composition', level: 2 })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'API Reference', level: 2 })).toBeVisible()
  expect(screen.getByRole('heading', { name: '1. Add Button to your application', level: 3 })).toBeVisible()
  expect(screen.queryByRole('heading', { name: '1. Install the shared package', level: 3 })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: '1. Build and pack the library', level: 3 })).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: '3. Provide the shared foundation', level: 3 })).not.toBeInTheDocument()
  expect(screen.queryByText('Missing component')).not.toBeInTheDocument()
})

test('Badge navigation combines category and status badge destinations', () => {
  window.history.replaceState({}, '', '/page-21.html?component=badge#overview')
  render(<ComponentDocs />)
  const sidebar = within(screen.getByRole('complementary', { name: 'Documentation' }))
  expect(sidebar.getByRole('link', { name: 'Badge' })).toHaveAttribute('href', '/page-21.html?component=badge')
  expect(sidebar.queryByRole('link', { name: 'Status Badge' })).not.toBeInTheDocument()
})

test('Tag overview is plain and status treatments live in examples', () => {
  window.history.replaceState({}, '', '/page-21.html?component=tag#overview')
  render(<ComponentDocs />)
  expect(screen.getByRole('heading', { name: 'Tag', level: 1 })).toBeVisible()
  const preview = screen.getByRole('tabpanel', { name: 'Tag overview preview' })
  const tags = preview.querySelectorAll('.c-tag')
  expect(tags).toHaveLength(1)
  expect(tags[0]).toHaveAttribute('data-tone', 'neutral')
  expect(tags[0].querySelector('svg')).toBeNull()
  expect(within(preview).getByText('Planned')).toBeVisible()
  for (const title of ['With icon', 'Status colors', 'Removable']) {
    expect(screen.getByRole('heading', { name: title, level: 3 })).toBeVisible()
  }
  const statusExample = screen.getByRole('tabpanel', { name: 'Status colors preview' })
  for (const label of ['Planned', 'In progress', 'In review', 'Approved', 'Blocked']) {
    expect(within(statusExample).getByText(label)).toBeVisible()
  }
  expect(componentPageMap.get('tag')?.source).toContain('<Tag>Planned</Tag>')
  expect(componentPageMap.get('tag')?.examples?.some(example => example.id === 'status-colors')).toBe(true)
})

test('Alert documentation exposes reference-style variants', () => {
  window.history.replaceState({}, '', '/page-21.html?component=alert#overview')
  render(<ComponentDocs />)
  expect(screen.getByRole('heading', { name: 'Alert', level: 1 })).toBeVisible()
  for (const title of ['Filled', 'Light', 'Lighter', 'Stroke', 'Size']) {
    expect(screen.getByRole('heading', { name: title, level: 3 })).toBeVisible()
  }
  expect(screen.getAllByText('Check the fields').length).toBeGreaterThan(0)
})

test('Tooltip documentation keeps unrelated feedback primitives out of its preview', () => {
  window.history.replaceState({}, '', '/page-21.html?component=tooltip#overview')
  render(<ComponentDocs />)
  const preview = screen.getByRole('tabpanel', { name: 'Tooltip overview preview' })
  expect(preview.querySelector('.c-tooltip-trigger')).not.toBeNull()
  expect(preview.querySelector('.c-spinner')).toBeNull()
  expect(preview.querySelector('.c-empty-state')).toBeNull()
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
  expect(screen.getByRole('heading', { name: '1. Add AI prompt input to your application', level: 3 })).toBeVisible()
  expect(screen.queryByRole('heading', { name: '1. Build and pack the library', level: 3 })).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Reference', level: 2 })).toBeVisible()
})
