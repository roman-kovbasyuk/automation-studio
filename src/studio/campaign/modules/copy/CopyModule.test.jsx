import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { ModuleHarness } from '../../testing/ModuleHarness.jsx'
import { makeScenario } from '../../testing/workspaceFixtures.js'
import { ModuleHost } from '../../ModuleHost.jsx'
import { createCampaignRuntime } from '../../campaignRuntime.js'
import { createWorkflowCoordinator } from '../../workflowCoordinator.js'

describe('Copy module boundaries', () => {
  test('a review-locked campaign explains disabled copy controls and opens Review', async () => {
    const scenario = makeScenario('ready')
    scenario.figmaReview = { loaded: true, versionId: 'version-1', handoff: { id: 'handoff-1' } }
    const navigate = vi.fn()
    render(<ModuleHarness moduleId="copy" scenario={scenario} onNavigate={navigate} />)
    const notice = await screen.findByRole('region', { name: 'Copy is locked' })
    expect(notice).toHaveTextContent(/review/i)
    expect(screen.getByRole('article', { name: 'Copy option 1' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Copy option 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete option 1' })).not.toBeInTheDocument()
    expect(screen.queryByText('1', { selector: '.bs-copy-card-number' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Go to Review' }))
    expect(navigate).toHaveBeenCalledWith('review')
  })

  test('approved copy remains editable after visuals, with save and cancel inline', async () => {
    const scenario = makeScenario('composed')
    const edit = vi.fn(async () => ({ ok: true }))
    render(<ModuleHarness moduleId="copy" scenario={scenario} actions={{ edit }} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit option 1' }))
    const headline = screen.getByRole('textbox', { name: 'Headline' })
    await userEvent.clear(headline)
    await userEvent.type(headline, 'A revised headline')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(edit).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox', { name: 'Headline' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Edit option 1' }))
    expect(screen.getByRole('textbox', { name: 'Headline' })).toHaveValue('Find your quiet')
    await userEvent.clear(screen.getByRole('textbox', { name: 'Headline' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Headline' }), 'A revised headline')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(edit).toHaveBeenCalledWith('copy-1', expect.objectContaining({ headline: 'A revised headline' }), expect.objectContaining({ expectedInputKey: expect.any(String) })))
    expect(screen.queryByRole('textbox', { name: 'Headline' })).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Copy option 2' })).toBeInTheDocument()
  })

  test('keeps append generation available after visuals have been created', async () => {
    render(<ModuleHarness moduleId="copy" scenario={makeScenario('composed')} />)
    await screen.findByRole('button', { name: 'Preview option 1' })
    expect(screen.getByRole('button', { name: 'Generate More Options' })).toBeVisible()
  })

  test('mount and refresh never generate or read images', async () => {
    const scenario = makeScenario('copy-ready')
    const generate = vi.fn(), assets = { getAssetBlob: vi.fn() }
    const view = render(<ModuleHarness moduleId="copy" scenario={scenario} actions={{ generate }} assets={assets} />)
    await screen.findByRole('button', { name: 'Preview option 1' })
    scenario.workspace.campaign.revision += 1
    view.rerender(<ModuleHarness moduleId="copy" scenario={scenario} actions={{ generate }} assets={assets} />)
    expect(generate).not.toHaveBeenCalled()
    expect(assets.getAssetBlob).not.toHaveBeenCalled()
  })
  test('a failed batch leaves earlier cards and approvals visible', async () => {
    const scenario = makeScenario('copy-ready')
    scenario.workspace.copies[0].approvedCandidateIds = ['copy-1']
    scenario.workspace.copies[0].selectedCandidateId = 'copy-1'
    scenario.workspace.campaign.selectedCopyId = scenario.workspace.copies[0].id
    const generate = vi.fn().mockRejectedValue(new Error('Copy provider unavailable'))
    render(<ModuleHarness moduleId="copy" scenario={scenario} actions={{ generate }} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Generate More Options' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Copy provider unavailable'))
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Deselect option 1' })).toHaveAttribute('aria-pressed', 'true')
  })
  test('unknown generation offers reconciliation, not a new batch', async () => {
    const generate = vi.fn(), reconcile = vi.fn()
    render(<ModuleHarness moduleId="copy" scenario={makeScenario('copy-ready')} reconcile={reconcile}
      actions={{ generate }} operation={{ kind: 'uncertain', actionId: 'generate', error: new Error('Check generation status') }} />)
    expect(await screen.findByRole('button', { name: 'Generate More Options' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Check latest state' }))
    await waitFor(() => expect(reconcile).toHaveBeenCalledOnce())
    expect(generate).not.toHaveBeenCalled()
  })
  test('a persisted unknown image explains blocked copy selection and can be checked without generation', async () => {
    const scenario = makeScenario('copy-ready')
    scenario.workspace.copies[0].approvedCandidateIds = []
    scenario.workspace.jobs.push({ id: 'image-unknown', step: 'image', status: 'unknown' })
    const api = {
      generate: vi.fn(),
      getWorkspace: vi.fn(async () => structuredClone(scenario.workspace)),
      selectCopy: vi.fn(async (_campaignId, { copyId }) => {
        scenario.workspace.copies[0].selectedCandidateId = copyId
        scenario.workspace.campaign.selectedCopyId = scenario.workspace.copies[0].id
        scenario.workspace.campaign.revision += 1
      }),
    }
    const runtime = createCampaignRuntime({ ...scenario, api })
    const coordinator = createWorkflowCoordinator({ runtime })
    const view = render(<ModuleHost runtime={runtime} moduleId="copy" actions={coordinator.actions.copy} active />)
    expect(await screen.findByRole('button', { name: 'Select option 1' })).toBeDisabled()
    expect(screen.getByText('Image generation needs checking before you can change copy.')).toBeVisible()
    const check = screen.getByRole('button', { name: 'Check latest state' })
    await userEvent.click(check)
    expect(screen.getByRole('button', { name: 'Select option 1' })).toBeDisabled()
    scenario.workspace.jobs.at(-1).status = 'succeeded'
    await userEvent.click(check)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Select option 1' })).toBeEnabled())
    expect(screen.queryByText('Image generation needs checking before you can change copy.')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Select option 1' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Deselect option 1' })).toHaveAttribute('aria-pressed', 'true'))
    expect(api.selectCopy).toHaveBeenCalledOnce()
    expect(api.generate).not.toHaveBeenCalled()
    view.unmount(); runtime.dispose()
  })
  test('checking state clears an immediate selection error from the card and host', async () => {
    const scenario = makeScenario('copy-ready')
    const api = { getWorkspace: vi.fn(async () => structuredClone(scenario.workspace)) }
    const runtime = createCampaignRuntime({ ...scenario, api })
    const select = vi.fn(async () => ({ ok: false, code: 'reconciliation_required', message: 'Check the previous request before sending another change.' }))
    const view = render(<ModuleHost runtime={runtime} moduleId="copy" actions={{ select }} active />)
    await userEvent.click(await screen.findByRole('button', { name: 'Select option 1' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Check the previous request')
    await userEvent.click(screen.getByRole('button', { name: 'Check latest state' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(select).toHaveBeenCalledOnce()
    view.unmount(); runtime.dispose()
  })
  test('the Select card interaction sends one selection and one authoritative workspace refresh', async () => {
    const scenario = makeScenario('copy-ready')
    scenario.workspace.copies[0].approvedCandidateIds = []
    const api = {
      getWorkspace: vi.fn(async () => structuredClone(scenario.workspace)),
      selectCopy: vi.fn(async (_campaignId, { copyId }) => {
        scenario.workspace.copies[0].selectedCandidateId = copyId
        scenario.workspace.campaign.selectedCopyId = scenario.workspace.copies[0].id
        scenario.workspace.campaign.revision += 1
      }),
      deleteCopy: vi.fn(), generate: vi.fn(), uploadVisual: vi.fn(), selectDirection: vi.fn(),
    }
    const initialWorkspace = await api.getWorkspace(scenario.workspace.campaign.id)
    const initialReads = api.getWorkspace.mock.calls.length
    const runtime = createCampaignRuntime({ ...scenario, workspace: initialWorkspace, api })
    const coordinator = createWorkflowCoordinator({ runtime })
    const view = render(<ModuleHost runtime={runtime} moduleId="copy" actions={coordinator.actions.copy} active />)

    await userEvent.click(await screen.findByRole('button', { name: 'Select option 1' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Deselect option 1' })).toHaveAttribute('aria-pressed', 'true'))

    expect(initialReads).toBe(1)
    expect(api.selectCopy).toHaveBeenCalledOnce()
    expect(api.selectCopy).toHaveBeenCalledWith('campaign-1', { copyId: 'copy-1' }, initialWorkspace.campaign.revision)
    expect(api.getWorkspace).toHaveBeenCalledTimes(initialReads + 1)
    expect(api.deleteCopy).not.toHaveBeenCalled()
    expect(api.generate).not.toHaveBeenCalled()
    expect(api.uploadVisual).not.toHaveBeenCalled()
    expect(api.selectDirection).not.toHaveBeenCalled()
    view.unmount()
    runtime.dispose()
  })
})

test('selected copy offers explicit continuation without triggering generation', async () => {
  const scenario = makeScenario('composed')
  const navigate = vi.fn(), generate = vi.fn()
  render(<ModuleHarness moduleId="copy" scenario={scenario} actions={{ generate }} onNavigate={navigate} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Continue to Visuals' }))
  expect(navigate).toHaveBeenCalledWith('visuals')
  expect(generate).not.toHaveBeenCalled()
})
