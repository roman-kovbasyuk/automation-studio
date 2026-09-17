import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { TemplateLibrary } from './TemplateLibrary.jsx'

const manifest = (id, name, brand = 'Folkeuniversitetet') => ({
  id,
  name,
  version: '1.0.0',
  brand: { name: brand },
  ratios: [{ id: 'square', width: 1080, height: 1080 }],
  slots: [],
  presentation: { backgroundColor: '#ffffff', slotColors: {}, shapes: [] },
})

const template = (id, name, brand = 'Folkeuniversitetet', group = 'banners') => ({
  id,
  name,
  version: '1.0.0',
  group,
  manifest: manifest(id, name, brand),
})

beforeEach(() => window.history.replaceState({}, '', '/mvp/templates'))

describe('Templates card catalog', () => {
  test('renders extensible groups and scoped cards with hover actions', async () => {
    const user = userEvent.setup()
    const onChoose = vi.fn()
    render(<TemplateLibrary templates={[template('banner-1', 'Variant 1'), template('doc-1', 'Field guide', 'Folkeuniversitetet', 'documents')]} onChoose={onChoose} />)

    expect(screen.getByRole('region', { name: 'Banners' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Slides' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Documents' })).toBeVisible()
    const card = within(screen.getByRole('region', { name: 'Banners' })).getByRole('article', { name: /Variant 1/i })
    expect(within(card).getByText('Usage not recorded')).toBeVisible()
    expect(within(card).getByRole('button', { name: 'Create with template' })).toBeVisible()
    expect(within(card).getByRole('button', { name: 'Actions for Variant 1' })).toBeVisible()
    await user.click(within(card).getByRole('button', { name: 'Create with template' }))
    expect(onChoose).toHaveBeenCalledWith('banner-1')
  })

  test('searches and filters groups while retaining the brand selector', async () => {
    const user = userEvent.setup()
    render(<TemplateLibrary templates={[template('a', 'About'), template('b', 'Opening')]} />)
    await user.click(screen.getByRole('button', { name: 'Search templates' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search templates' }), 'about')
    expect(screen.getByText('About')).toBeVisible()
    expect(screen.queryByText('Opening')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Design system' })).toHaveTextContent('Folkeuniversitetet')
    await user.click(screen.getByRole('button', { name: 'Clear Search templates' }))
    expect(screen.getByText('Opening')).toBeVisible()
  })

  test('opens the card menu and reports unavailable management actions honestly', async () => {
    const user = userEvent.setup()
    render(<TemplateLibrary templates={[template('a', 'About')]} />)
    const card = within(screen.getByRole('region', { name: 'Banners' })).getByRole('article', { name: /About/i })
    await user.click(within(card).getByRole('button', { name: 'Actions for About' }))
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeVisible()
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(screen.getByRole('status')).toHaveTextContent(/Template editing is not available/i)
  })

  test('switches sort order and keeps unknown usage last', async () => {
    const user = userEvent.setup()
    render(<TemplateLibrary templates={[{ ...template('a', 'Alpha'), lastUsedAt: null }, { ...template('z', 'Zulu'), lastUsedAt: '2026-09-14T12:00:00.000Z' }]} />)
    const cards = () => within(screen.getByRole('region', { name: 'Banners' })).getAllByRole('article').filter(article => article.hasAttribute('data-template-name')).map(article => article.getAttribute('data-template-name'))
    expect(cards()).toEqual(['Zulu', 'Alpha'])
    await user.click(screen.getByRole('combobox', { name: 'Sort by' }))
    await user.click(screen.getByRole('option', { name: 'Name A–Z' }))
    expect(cards()).toEqual(['Alpha', 'Zulu'])
  })

  test('uses an explicit empty-state message for a search with no matches', async () => {
    const user = userEvent.setup()
    render(<TemplateLibrary templates={[]} />)
    await user.click(screen.getByRole('button', { name: 'Search templates' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search templates' }), 'missing')
    expect(screen.getByText('No banners templates match')).toBeVisible()
  })

  test('preserves direct legacy category routes through the type filter', () => {
    window.history.replaceState({}, '', '/mvp/templates?type=slides')
    render(<TemplateLibrary templates={[]} />)
    expect(screen.getByRole('combobox', { name: 'Template type' })).toHaveTextContent('Slides')
    expect(screen.queryByRole('region', { name: 'Banners' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Slides' })).toBeVisible()
  })
})
