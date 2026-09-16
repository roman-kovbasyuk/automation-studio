import { describe, expect, test } from 'vitest'
import {
  brandChangeOperationSchema,
  brandDesignSystemResponseSchema,
  brandDraftSchema,
  brandStateSchema,
  addBrandSourceRequestSchema,
} from './contracts.js'
import { getBrandReadiness } from './brandDesignSystem.js'

const draft = {
  name: 'Northstar',
  context: 'Premium outdoor equipment',
  currentStep: 'review',
  sources: [{ id: 'source-1', kind: 'figma', label: 'Brand library', url: 'https://www.figma.com/design/file', status: 'ready' }],
  assets: [{ id: 'asset-1', name: 'Primary logo', kind: 'logo', mimeType: 'image/svg+xml', sourceId: 'source-1', approved: true }],
  logoRoles: { primary: 'asset-1', secondary: 'not_applicable', symbol: 'not_applicable', light: 'not_applicable', dark: 'not_applicable' },
  colors: {
    palette: [
      { id: 'ink', name: 'Ink', value: '#101820', confirmed: true, evidence: { method: 'structured_import', sourceId: 'source-1' } },
      { id: 'paper', name: 'Paper', value: '#FFFFFF', confirmed: true, evidence: { method: 'manual' } },
    ],
    roles: { primary: 'ink', accent: 'ink', canvas: 'paper', surface: 'paper', primaryText: 'ink', inverseText: 'paper' },
  },
  typography: {
    heading: { family: 'Avenir Next', weight: 600, fallbacks: ['Arial', 'sans-serif'], confirmed: true },
    body: { family: 'Avenir Next', weight: 400, fallbacks: ['Arial', 'sans-serif'], confirmed: true },
    licenseConfirmed: true,
    scale: {
      h1: { size: 48, lineHeight: 1.1 }, h2: { size: 36, lineHeight: 1.15 }, h3: { size: 24, lineHeight: 1.2 },
      body: { size: 16, lineHeight: 1.5 }, caption: { size: 13, lineHeight: 1.4 },
    },
  },
  conflicts: [],
}

describe('brand design system contracts', () => {
  test('accepts only supported lifecycle states and strict DTCG-compatible drafts', () => {
    expect(brandStateSchema.options).toEqual(['draft', 'published', 'archived'])
    expect(brandDraftSchema.parse(draft)).toEqual(draft)
    expect(brandDraftSchema.safeParse({ ...draft, templateId: 'not-part-of-brand-v1' }).success).toBe(false)
  })

  test('rejects invalid colors, references, and typography values at the boundary', () => {
    expect(brandDraftSchema.safeParse({ ...draft, colors: { ...draft.colors, palette: [{ ...draft.colors.palette[0], value: 'blue' }] } }).success).toBe(false)
    expect(brandDraftSchema.safeParse({ ...draft, typography: { ...draft.typography, scale: { ...draft.typography.scale, h1: { size: 0, lineHeight: 1.1 } } } }).success).toBe(false)
  })

  test('allows an incomplete manual draft to be saved before publication', () => {
    expect(brandDraftSchema.safeParse({
      ...draft,
      colors: { palette: [], roles: { primary: '', accent: '', canvas: '', surface: '', primaryText: '', inverseText: '' } },
      typography: { ...draft.typography, heading: { ...draft.typography.heading, family: '', confirmed: false }, body: { ...draft.typography.body, family: '', confirmed: false } },
    }).success).toBe(true)
  })

  test('limits AI changes to typed color and typography operations', () => {
    expect(brandChangeOperationSchema.safeParse({ operation: 'set_color', tokenId: 'ink', value: '#202830' }).success).toBe(true)
    expect(brandChangeOperationSchema.safeParse({ operation: 'scale_typography', factor: 0.9 }).success).toBe(true)
    expect(brandChangeOperationSchema.safeParse({ operation: 'execute_code', value: 'rm -rf /' }).success).toBe(false)
  })

  test('keeps API responses strict and separates the active immutable version', () => {
    const response = {
      id: 'brand-1', workspaceId: 'default', ownerId: 'designer-1', state: 'published', revision: 3,
      activeVersionId: 'version-1', draft, activeVersion: {
        id: 'version-1', brandId: 'brand-1', versionNumber: 1, snapshot: draft,
        publishedBy: 'designer-1', publishedAt: '2026-09-07T10:00:00.000Z', schemaVersion: 1,
      },
      createdAt: '2026-09-07T09:00:00.000Z', updatedAt: '2026-09-07T10:00:00.000Z', requestId: 'request-1',
    }
    expect(brandDesignSystemResponseSchema.safeParse(response).success).toBe(true)
    expect(brandDesignSystemResponseSchema.safeParse({ ...response, templatePreview: {} }).success).toBe(false)
  })

  test('accepts mixed safe sources and rejects executable or archive uploads', () => {
    expect(addBrandSourceRequestSchema.safeParse({ kind: 'figma', label: 'Library', url: 'https://www.figma.com/design/file' }).success).toBe(true)
    expect(addBrandSourceRequestSchema.safeParse({ kind: 'file', name: 'brand.pdf', mimeType: 'application/pdf', data: 'JVBERi0xLjQ=' }).success).toBe(true)
    expect(addBrandSourceRequestSchema.safeParse({ kind: 'file', name: 'brand.zip', mimeType: 'application/zip', data: 'AAAA' }).success).toBe(false)
  })

  test('requires every assigned optional logo to be an approved logo asset', () => {
    const invalid = structuredClone(draft)
    invalid.assets.push({ id: 'asset-2', name: 'Unapproved symbol', kind: 'logo', mimeType: 'image/svg+xml', approved: false })
    invalid.logoRoles.symbol = 'asset-2'
    expect(getBrandReadiness(invalid)).toContainEqual(expect.objectContaining({ field: 'logoRoles.symbol' }))
  })
})
