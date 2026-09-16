import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { PublishStep } from './PublishStep.jsx'
import { PublishedBrandView } from './PublishedBrandView.jsx'
import { createEmptyBrandDraft } from '../../../shared/brandDesignSystem.js'

function completeDraft() {
  const draft = createEmptyBrandDraft('Northstar')
  draft.assets = [{ id: 'logo-1', name: 'Primary mark', kind: 'logo', mimeType: 'image/svg+xml', approved: true }]
  draft.logoRoles = { primary: 'logo-1', secondary: 'not_applicable', symbol: 'not_applicable', light: 'not_applicable', dark: 'not_applicable' }
  draft.colors = { palette: [{ id: 'ink', name: 'Ink', value: '#101820', confirmed: true, evidence: { method: 'manual' } }, { id: 'paper', name: 'Paper', value: '#FFFFFF', confirmed: true, evidence: { method: 'manual' } }], roles: { primary: 'ink', accent: 'ink', canvas: 'paper', surface: 'paper', primaryText: 'ink', inverseText: 'paper' } }
  draft.typography.heading = { family: 'Avenir Next', weight: 600, fallbacks: ['Arial'], confirmed: true }
  draft.typography.body = { family: 'Avenir Next', weight: 400, fallbacks: ['Arial'], confirmed: true }
  draft.typography.licenseConfirmed = true
  return draft
}

describe('brand publication UI', () => {
  test('shows the Novartis showcase on the published detail page', () => {
    const novartis = completeDraft()
    novartis.name = 'Novartis'
    render(<PublishedBrandView brand={{ state: 'published', draft: novartis, activeVersion: { versionNumber: 1, snapshot: novartis } }} />)
    expect(screen.getByRole('region', { name: 'Novartis design system' })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'Foundation' })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'Templates' })).toBeVisible()
  })

  test('shows the same showcase anatomy for other brand systems', () => {
    const other = completeDraft()
    other.name = 'Folkeuniversitetet'
    render(<PublishedBrandView brand={{ state: 'published', draft: other, activeVersion: { versionNumber: 1, snapshot: other } }} />)
    expect(screen.getByRole('region', { name: 'Folkeuniversitetet design system' })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'Foundation' })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'Templates' })).toBeVisible()
  })

  test('links each missing requirement back to its review section', () => {
    render(<PublishStep draft={createEmptyBrandDraft('Northstar')} saveState="Saved" onBack={vi.fn()} onEdit={vi.fn()} onPublish={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Publish design system' })).toBeDisabled()
    expect(screen.getByRole('link', { name: /Choose and approve a usable primary logo/i })).toHaveAttribute('href', '#brand-review-logos')
  })

  test('publishes a complete, saved draft without any template dependency', async () => {
    const user = userEvent.setup()
    const publish = vi.fn()
    render(<PublishStep draft={completeDraft()} saveState="Saved" onBack={vi.fn()} onEdit={vi.fn()} onPublish={publish} />)
    await user.click(screen.getByRole('button', { name: 'Publish design system' }))
    expect(publish).toHaveBeenCalledOnce()
    expect(screen.queryByText(/template/i)).not.toBeInTheDocument()
  })

  test('renders a structured published reference and limits AI editing to designers', async () => {
    const user = userEvent.setup()
    const draft = completeDraft()
    const propose = vi.fn(async () => ({ id: 'proposal-1', operations: [{ operation: 'scale_typography', factor: 0.9 }], unchanged: ['colors', 'logos', 'assets'] }))
    const apply = vi.fn()
    const { rerender } = render(<PublishedBrandView brand={{ state: 'published', draft, activeVersion: { versionNumber: 1, snapshot: draft } }} canManage onEdit={vi.fn()} onPropose={propose} onApply={apply} onDiscard={vi.fn()} />)
    for (const name of ['Logo', 'Colors', 'Typography', 'Images and shapes']) expect(screen.getAllByRole('heading', { name })[0]).toBeVisible()
    await user.type(screen.getByRole('textbox', { name: 'Ask brand AI' }), 'Make all typography 10% smaller')
    await user.click(screen.getByRole('button', { name: 'Create proposal' }))
    expect(await screen.findByText('Scale all sizes × 0.9')).toBeVisible()
    for (const heading of ['Field', 'Current', 'Proposed']) expect(screen.getByRole('columnheader', { name: heading })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Apply proposal' }))
    expect(apply).toHaveBeenCalledWith('proposal-1')

    rerender(<PublishedBrandView brand={{ state: 'published', draft, activeVersion: { versionNumber: 1, snapshot: draft } }} canManage={false} />)
    expect(screen.queryByRole('textbox', { name: 'Ask brand AI' })).not.toBeInTheDocument()
  })

  test('uses the same overview for drafts and published brands without header metadata', () => {
    const draft = completeDraft()
    draft.typography.licenseConfirmed = false
    const { rerender } = render(<PublishedBrandView brand={{ state: 'draft', draft, activeVersion: null }} canManage onEdit={vi.fn()} />)
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
    expect(screen.queryByText(/Published · Version/)).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Foundation' })).toBeVisible()
    for (const name of ['Logo', 'Colors', 'Typography', 'Images and shapes']) expect(screen.getAllByRole('heading', { name })[0]).toBeVisible()
    rerender(<PublishedBrandView brand={{ state: 'published', draft, activeVersion: { versionNumber: 2, snapshot: draft } }} />)
    expect(screen.queryByText('Published · Version 2')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Foundation' })).toBeVisible()
    expect(screen.getByText('#101820', { selector: 'code' })).toBeVisible()
  })

  test('renders one foundation catalog without the duplicate legacy reference', () => {
    const draft = completeDraft()
    const { container } = render(<PublishedBrandView brand={{ state: 'published', draft, activeVersion: { versionNumber: 1, snapshot: draft } }} />)
    expect(screen.getByRole('navigation', { name: 'Foundation sections' })).toBeVisible()
    expect(screen.queryByRole('navigation', { name: 'Brand sections' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Typography' })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { name: 'Colors' })).toHaveLength(1)
    expect(container.querySelector('#brand-published-logos')).toBeNull()
  })

  test('does not expose unapproved optional logos in the published reference', () => {
    const draft = completeDraft()
    draft.assets.push({ id: 'logo-2', name: 'Draft symbol', kind: 'logo', mimeType: 'image/svg+xml', approved: false })
    draft.logoRoles.symbol = 'logo-2'
    render(<PublishedBrandView brand={{ state: 'published', draft, activeVersion: { versionNumber: 1, snapshot: draft } }} canManage={false} />)
    expect(screen.queryByText('Draft symbol')).not.toBeInTheDocument()
  })

  test('renders only the active snapshot for a read-only client', () => {
    const published = completeDraft()
    const unpublished = structuredClone(published)
    unpublished.typography.heading.family = 'Private draft font'
    render(<PublishedBrandView brand={{ state: 'published', draft: unpublished, activeVersion: { versionNumber: 1, snapshot: published } }} canManage={false} />)
    expect(screen.queryByText(/Private draft font/)).not.toBeInTheDocument()
    expect(screen.getByText(/Heading · Avenir Next/)).toBeVisible()
  })

  test('shows version history, restores a version as a draft, and offers one-step undo', async () => {
    const user = userEvent.setup()
    const published = completeDraft()
    const changed = structuredClone(published)
    changed.colors.palette[0].value = '#202830'
    const history = vi.fn(async () => ({ versions: [{ id: 'version-1', versionNumber: 1, publishedAt: '2026-09-07T10:00:00.000Z' }] }))
    const restore = vi.fn()
    const undo = vi.fn()
    render(<PublishedBrandView brand={{ state: 'published', draft: changed, activeVersion: { versionNumber: 1, snapshot: published } }} canManage
      onHistory={history} onRestore={restore} onUndo={undo} onEdit={vi.fn()} onPropose={vi.fn()} />)
    expect(screen.queryByText('Unpublished changes')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Undo last change' }))
    expect(undo).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'History' }))
    expect(await screen.findByText('Version 1')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Restore version 1' }))
    expect(restore).toHaveBeenCalledWith('version-1')
  })
})
