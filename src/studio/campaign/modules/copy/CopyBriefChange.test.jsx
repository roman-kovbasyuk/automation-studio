import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ModuleHarness } from '../../testing/ModuleHarness.jsx'
import { makeScenario } from '../../testing/workspaceFixtures.js'

it('keeps old copy visible until the marketer chooses and disables stale selection', async () => {
  const scenario = makeScenario('copy-ready')
  scenario.workspace.copies[0].stale = true
  const retain = vi.fn(async () => ({ ok: true })), regenerate = vi.fn(async () => ({ ok: true }))
  const view = render(<ModuleHarness moduleId="copy" scenario={scenario} actions={{ retain, regenerate }} />)
  expect(await screen.findByText('Brief has changed. Create new copy?')).toBeVisible()
  expect(screen.getByRole('article', { name: 'Copy option 1' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Select option 1' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Generate More Options' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Keep old copy' }))
  await waitFor(() => expect(retain).toHaveBeenCalledTimes(1))
  scenario.workspace.copies = scenario.workspace.copies.map(set => ({ ...set, stale: false }))
  view.rerender(<ModuleHarness moduleId="copy" scenario={scenario} actions={{ retain, regenerate }} />)
  expect(screen.queryByText('Brief has changed. Create new copy?')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Generate More Options' })).toBeVisible()
  expect(regenerate).not.toHaveBeenCalled()
})
it('Create new runs regeneration and preserves the choice on failure', async () => {
  const scenario = makeScenario('copy-ready'); scenario.workspace.copies[0].stale = true
  const regenerate = vi.fn(async () => ({ ok: false, message: 'Could not generate' }))
  render(<ModuleHarness moduleId="copy" scenario={scenario} actions={{ regenerate, retain: vi.fn() }} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Create new' }))
  expect(await screen.findByText('Could not generate')).toBeVisible()
  expect(screen.getByRole('article', { name: 'Copy option 1' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Keep old copy' })).toBeEnabled()
})
