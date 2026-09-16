import { describe, expect, test } from 'vitest'
import { currentStage, canVisitStage, selectedCopy, routeFromLocation } from './workflow.js'

describe('persisted studio workflow', () => {
  test('keeps review and approval as separate steps and allows prior steps to be inspected', () => {
    expect(currentStage({ campaign: { status: 'in_review' } })).toBe(5)
    expect(currentStage({ campaign: { status: 'ready' } })).toBe(6)
    expect(currentStage({ campaign: { status: 'approved' } })).toBe(7)
    expect(canVisitStage(7, { campaign: { status: 'draft' } })).toBe(false)
    expect(canVisitStage(0, { campaign: { status: 'delivered' } })).toBe(true)
  })
  test('reconstructs selected copy from persisted set and candidate ids', () => {
    const workspace = { campaign: { selectedCopyId: 'set' }, copies: [{ id: 'set', selectedCandidateId: 'b', candidates: [{id:'a'}, {id:'b', headline:'Selected'}] }] }
    expect(selectedCopy(workspace).headline).toBe('Selected')
  })
  test('restores campaign and stage from a shareable route', () => {
    expect(routeFromLocation('/mvp/campaign/campaign-1', '?step=3')).toEqual({view:'campaign', id:'campaign-1', step:3})
    expect(routeFromLocation('/templates','')).toEqual({view:'templates'})
  })
  test('recognizes the personal settings route', () => {
    expect(routeFromLocation('/mvp/settings','')).toEqual({view:'settings'})
  })
  test('restores every brand design system screen from a dedicated route', () => {
    expect(routeFromLocation('/mvp/system/new/materials')).toEqual({ view: 'system', mode: 'new', step: 'materials' })
    expect(routeFromLocation('/mvp/system/brand%2F1/review')).toEqual({ view: 'system', id: 'brand/1', step: 'review' })
    expect(routeFromLocation('/mvp/system/brand-1/publish')).toEqual({ view: 'system', id: 'brand-1', step: 'publish' })
    expect(routeFromLocation('/mvp/system/brand-1')).toEqual({ view: 'system', id: 'brand-1', step: 'published' })
  })
  test('supports the admin workflow scaffold route', () => {
    expect(routeFromLocation('/mvp/admin')).toEqual({ view: 'admin', section: 'overview' })
    expect(routeFromLocation('/mvp/admin/workflows')).toEqual({ view: 'admin', section: 'workflows' })
  })
})
