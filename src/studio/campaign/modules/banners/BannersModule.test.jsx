import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { makeScenario } from '../../testing/workspaceFixtures.js'
import { moduleInputKey, projectModuleInput } from '../../moduleContracts.js'
import { deriveWorkflowState } from '../../workflowState.js'
import BannersModule from './BannersModule.jsx'

it('restores a legacy composition as a selected design without writing on mount', async () => {
  const { workspace, templates } = makeScenario('composed')
  const port = { input: projectModuleInput('banners', workspace, { templates }), inputKey: 'source', access: { canEdit: true }, operation: { kind: 'idle' }, actions: { save: vi.fn().mockResolvedValue({ ok: false, message: 'Conflict' }) }, assets: { getAssetBlob: vi.fn().mockRejectedValue(new Error('offline')) }, setDirty: vi.fn(), navigate: vi.fn() }
  const { rerender } = render(<BannersModule port={port} />)
  const selectedDesign = screen.getByRole('button', { name: 'Deselect Editorial split' })
  expect(selectedDesign).toHaveAttribute('aria-pressed', 'true')
  expect(selectedDesign).toHaveAttribute('aria-pressed', 'true')
  rerender(<BannersModule port={{ ...port, inputKey: 'new-source', input: { ...port.input } }} />)
  expect(screen.getByRole('button', { name: 'Deselect Editorial split' })).toHaveAttribute('aria-pressed', 'true')
  expect(port.setDirty).toHaveBeenLastCalledWith(false)
  expect(port.actions.save).not.toHaveBeenCalled()
})

it('renders the Figma review state inside Banners', () => {
  const scenario = makeScenario('in-review')
  const reviewInput = projectModuleInput('review', scenario.workspace, scenario)
  const reviewPort = {
    input: reviewInput,
    inputKey: moduleInputKey('review', reviewInput),
    access: deriveWorkflowState(scenario.workspace, scenario.actor, scenario.reviewHistory).modules.review,
    operation: { kind: 'idle' },
    actions: {},
    assets: { getAssetBlob: vi.fn(async () => new Blob([], { type: 'image/png' })) },
    setDirty: vi.fn(),
  }
  render(<BannersModule port={{ input: projectModuleInput('banners', scenario.workspace, scenario), inputKey: 'source',
    access: { canEdit: false }, operation: { kind: 'idle' }, actions: {}, assets: reviewPort.assets,
    setDirty: vi.fn(), navigate: vi.fn(), reviewPort }} />)
  // D1: the requester checks the embedded review and can accept it without a designer.
  expect(screen.getByRole('button', { name: 'Accept banners' })).toBeVisible()
})

it('reports dirty changes without re-announcing when the host replaces its callback', () => {
  const scenario = makeScenario('visuals-ready')
  const dirty = vi.fn()
  const port = { input: projectModuleInput('banners', scenario.workspace, scenario), inputKey: 'source', access: { canEdit: true }, operation: { kind: 'idle' }, actions: {}, assets: { getAssetBlob: async () => new Blob() }, setDirty: dirty, navigate: vi.fn() }
  const view = render(<BannersModule port={port} />)
  expect(dirty).toHaveBeenCalledTimes(1)
  view.rerender(<BannersModule port={{ ...port, setDirty: value => dirty(value) }} />)
  expect(dirty).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Select all designs' }))
  expect(dirty).toHaveBeenLastCalledWith(true)
})
