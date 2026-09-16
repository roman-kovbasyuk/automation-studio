import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { BrandDesignSystemPage } from './BrandDesignSystemPage.jsx'

const emptyDraft = {
  name: 'Northstar', context: '', currentStep: 'materials', sources: [], assets: [],
  logoRoles: { primary: null, secondary: null, symbol: null, light: null, dark: null },
  colors: { palette: [], roles: { primary: '', accent: '', canvas: '', surface: '', primaryText: '', inverseText: '' } },
  typography: {
    heading: { family: '', weight: 600, fallbacks: ['Arial', 'sans-serif'], confirmed: false },
    body: { family: '', weight: 400, fallbacks: ['Arial', 'sans-serif'], confirmed: false }, licenseConfirmed: false,
    scale: { h1: { size: 48, lineHeight: 1.1 }, h2: { size: 36, lineHeight: 1.15 }, h3: { size: 24, lineHeight: 1.2 }, body: { size: 16, lineHeight: 1.5 }, caption: { size: 13, lineHeight: 1.4 } },
  }, conflicts: [],
}
const brand = { id: 'brand-1', workspaceId: 'default', ownerId: 'designer-1', state: 'draft', revision: 2,
  activeVersionId: null, activeVersion: null, draft: emptyDraft, createdAt: '2026-09-07T09:00:00.000Z', updatedAt: '2026-09-07T09:00:00.000Z' }

function api(overrides = {}) {
  return {
    listBrandSystems: vi.fn(async () => ({ brands: [brand] })),
    createBrandSystem: vi.fn(async () => brand),
    getBrandSystem: vi.fn(async () => brand),
    patchBrandDraft: vi.fn(async (_id, draft) => ({ ...brand, revision: 3, draft })),
    addBrandSource: vi.fn(async (_id, input) => ({ ...brand, revision: 3, draft: { ...brand.draft, sources: [{ id: 'source-1', kind: input.kind, label: input.label ?? input.name, ...(input.kind === 'figma' ? { url: input.url } : { mimeType: input.mimeType, byteSize: 5 }), status: 'ready' }] } })),
    addBrandAsset: vi.fn(async (_id, input) => ({ ...brand, revision: 3, draft: { ...brand.draft, currentStep: 'review', assets: [{ id: 'asset-1', name: input.name, kind: input.kind, mimeType: input.mimeType, approved: false }] } })),
    analyseBrandSources: vi.fn(async () => ({ ...brand, revision: 4, draft: { ...brand.draft, currentStep: 'review' } })),
    publishBrandSystem: vi.fn(), proposeBrandChange: vi.fn(), applyBrandProposal: vi.fn(), discardBrandProposal: vi.fn(),
    ...overrides,
  }
}

describe('brand design system page', () => {
  test('lists independent brand systems and offers creation to a designer', async () => {
    const service = api()
    render(<BrandDesignSystemPage api={service} actor={{ id: 'designer-1', role: 'designer' }} route={{ view: 'system' }} onNavigate={vi.fn()} />)
    expect(await screen.findByRole('heading', { name: 'Brand design systems' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Northstar' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'New brand system' })).toBeVisible()
  })

  test('uses the vendor layout primitives on the library', async () => {
    const service = api()
    render(<BrandDesignSystemPage api={service} actor={{ id: 'designer-1', role: 'designer' }} route={{ view: 'system' }} onNavigate={vi.fn()} />)
    await screen.findByRole('heading', { name: 'Brand design systems' })
    expect(screen.getByRole('heading', { name: 'Brand design systems' }).closest('.a-container')).toHaveClass('a-container')
    expect(document.querySelector('#brand-system-library .a-grid')).toHaveClass('a-grid')
    expect(document.querySelector('#brand-system-library .a-grid .a-surface')).toBeVisible()
  })

  test('opens a draft from the library on the common overview, with editing as a separate action', async () => {
    const user = userEvent.setup()
    const service = api()
    const onNavigate = vi.fn()
    const { rerender } = render(<BrandDesignSystemPage api={service} actor={{ id: 'designer-1', role: 'designer' }} route={{ view: 'system' }} onNavigate={onNavigate} />)
    await user.click(await screen.findByRole('button', { name: 'Open Northstar' }))
    expect(onNavigate).toHaveBeenCalledWith('/mvp/system/brand-1')
    rerender(<BrandDesignSystemPage api={service} actor={{ id: 'designer-1', role: 'designer' }} route={{ view: 'system', id: 'brand-1', step: 'published' }} onNavigate={onNavigate} />)
    expect(await screen.findByRole('region', { name: 'Brand overview' })).toBeVisible()
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit system' }))
    expect(onNavigate).toHaveBeenCalledWith('/mvp/system/brand-1/review')
    await user.click(screen.getByRole('button', { name: 'All brand systems' }))
    expect(onNavigate).toHaveBeenLastCalledWith('/mvp/system')
  })

  test('uses a vendor container for the published overview', async () => {
    const published = { ...brand, state: 'published', activeVersionId: 'version-1', activeVersion: {
      id: 'version-1', brandId: brand.id, versionNumber: 1, snapshot: brand.draft, publishedBy: 'designer-1', publishedAt: '2026-09-07T10:00:00.000Z', schemaVersion: 1,
    } }
    const service = api({ getBrandSystem: vi.fn(async () => published) })
    render(<BrandDesignSystemPage api={service} actor={{ id: 'designer-1', role: 'designer' }} route={{ view: 'system', id: 'brand-1', step: 'published' }} onNavigate={vi.fn()} />)
    await screen.findByRole('heading', { name: 'Northstar' })
    expect(screen.getByRole('heading', { name: 'Northstar' }).closest('.a-container')).toHaveClass('a-container')
  })

  test('creates a named draft before opening the Materials route', async () => {
    const user = userEvent.setup()
    const service = api()
    const onNavigate = vi.fn()
    render(<BrandDesignSystemPage api={service} actor={{ id: 'designer-1', role: 'designer' }} route={{ view: 'system', mode: 'new', step: 'materials' }} onNavigate={onNavigate} />)
    await user.type(screen.getByRole('textbox', { name: 'Brand name' }), 'Northstar')
    expect(screen.getByRole('heading', { name: 'Materials' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Create private draft' }))
    await waitFor(() => expect(service.createBrandSystem).toHaveBeenCalledWith({ name: 'Northstar' }))
    expect(onNavigate).toHaveBeenCalledWith('/mvp/system/brand-1/materials')
  })

  test('restores the routed wizard step and exposes truthful save state', async () => {
    const service = api()
    render(<BrandDesignSystemPage api={service} actor={{ id: 'designer-1', role: 'designer' }} route={{ view: 'system', id: 'brand-1', step: 'materials' }} onNavigate={vi.fn()} />)
    expect(await screen.findByRole('heading', { name: 'Materials' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Brand setup' })).toBeVisible()
    expect(screen.getByText('Saved')).toBeVisible()
    expect(service.getBrandSystem).toHaveBeenCalledWith('brand-1', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  test('persists material files before asking the backend to analyse them', async () => {
    const user = userEvent.setup()
    const service = api()
    const onNavigate = vi.fn()
    render(<BrandDesignSystemPage api={service} actor={{ id: 'designer-1', role: 'designer' }} route={{ view: 'system', id: 'brand-1', step: 'materials' }} onNavigate={onNavigate} />)
    await screen.findByRole('heading', { name: 'Materials' })
    await user.upload(screen.getByLabelText('Brand files'), new File(['hello'], 'brand.json', { type: 'application/json' }))
    await waitFor(() => expect(service.addBrandSource).toHaveBeenCalledWith('brand-1', expect.objectContaining({ kind: 'file', name: 'brand.json', mimeType: 'application/json', data: 'aGVsbG8=' }), 2))
    await user.click(screen.getByRole('button', { name: 'Analyze materials' }))
    await waitFor(() => expect(service.analyseBrandSources).toHaveBeenCalledWith('brand-1', 3, undefined))
    expect(onNavigate).toHaveBeenCalledWith('/mvp/system/brand-1/review')
  })

  test('persists logo uploads from Review instead of creating browser-only metadata', async () => {
    const user = userEvent.setup()
    const reviewBrand = { ...brand, draft: { ...brand.draft, currentStep: 'review' } }
    const service = api({ getBrandSystem: vi.fn(async () => reviewBrand) })
    render(<BrandDesignSystemPage api={service} actor={{ id: 'designer-1', role: 'designer' }} route={{ view: 'system', id: 'brand-1', step: 'review' }} onNavigate={vi.fn()} />)
    await screen.findByRole('heading', { name: 'Review' })
    await user.upload(screen.getByLabelText('Logo files'), new File(['logo'], 'logo.svg', { type: 'image/svg+xml' }))
    await waitFor(() => expect(service.addBrandAsset).toHaveBeenCalledWith('brand-1', expect.objectContaining({ name: 'logo.svg', kind: 'logo', mimeType: 'image/svg+xml', data: 'bG9nbw==' }), 2))
  })

  test('keeps marketers on the published reference even when a wizard URL is opened directly', async () => {
    const published = { ...brand, state: 'published', activeVersionId: 'version-1', activeVersion: {
      id: 'version-1', brandId: brand.id, versionNumber: 1, snapshot: brand.draft, publishedBy: 'designer-1', publishedAt: '2026-09-07T10:00:00.000Z', schemaVersion: 1,
    } }
    const service = api({ getBrandSystem: vi.fn(async () => published) })
    render(<BrandDesignSystemPage api={service} actor={{ id: 'marketer-1', role: 'marketer' }} route={{ view: 'system', id: 'brand-1', step: 'materials' }} onNavigate={vi.fn()} />)
    expect(await screen.findByRole('heading', { name: 'Northstar' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Analyze materials' })).not.toBeInTheDocument()
  })

  test('serializes autosaves without replacing a newer local edit with an older response', async () => {
    let finishFirst
    let finishSecond
    const first = new Promise((resolve) => { finishFirst = resolve })
    const second = new Promise((resolve) => { finishSecond = resolve })
    const patchBrandDraft = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
    const service = api({ patchBrandDraft })
    render(<BrandDesignSystemPage api={service} actor={{ id: 'designer-1', role: 'designer' }} route={{ view: 'system', id: 'brand-1', step: 'materials' }} onNavigate={vi.fn()} />)
    const context = await screen.findByRole('textbox', { name: 'Client and brand context' })
    vi.useFakeTimers()
    fireEvent.change(context, { target: { value: 'First edit' } })
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(patchBrandDraft).toHaveBeenCalledTimes(1)
    fireEvent.change(context, { target: { value: 'Newer edit' } })
    await act(async () => { finishFirst({ ...brand, revision: 3, draft: { ...emptyDraft, context: 'First edit' } }); await Promise.resolve() })
    expect(patchBrandDraft).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('textbox', { name: 'Client and brand context' })).toHaveValue('Newer edit')
    await act(async () => { finishSecond({ ...brand, revision: 4, draft: { ...emptyDraft, context: 'Newer edit' } }); await Promise.resolve() })
    expect(screen.getByText('Saved')).toBeVisible()
    vi.useRealTimers()
  })
})
