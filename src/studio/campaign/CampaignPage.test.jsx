import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { CampaignPage } from './CampaignPage.jsx'
import { createCampaignRuntime } from './campaignRuntime.js'
import { makeScenario } from './testing/workspaceFixtures.js'

it('opening an analyzed campaign does not dispatch unrequested generation',async()=>{
  const scenario=makeScenario('copy-ready')
  scenario.workspace.copies=[]
  scenario.workspace.directions=[]
  scenario.workspace.jobs=scenario.workspace.jobs.filter(job=>job.step==='brief_analysis')
  scenario.workspace.campaign.selectedCopyId=null
  scenario.workspace.campaign.status='draft'
  const api={generate:vi.fn().mockRejectedValue(new Error('Unexpected generation')),getWorkspace:vi.fn(async()=>scenario.workspace)}
  const runtime=createCampaignRuntime({...scenario,api})
  render(<CampaignPage runtime={runtime} activeModule="brief" onNavigate={()=>{}} />)
  await screen.findByRole('textbox')
  expect(api.generate).not.toHaveBeenCalled()
  runtime.dispose()
})

it('shows only the requested step and navigates using semantic IDs', async () => {
  const scenario = makeScenario('copy-ready')
  const runtime = createCampaignRuntime({ ...scenario, api: {} })
  const navigate = vi.fn()
  render(<CampaignPage runtime={runtime} activeModule="copy" onNavigate={navigate} heading={<h1>Campaign</h1>} />)
  expect(screen.getAllByRole('heading', { level: 2 }).map(item => item.textContent)).toEqual(['Copy'])
  const nav = screen.getByRole('navigation', { name: 'Campaign workflow' })
  fireEvent.click(within(nav).getByRole('button', { name: /Brief/ }))
  expect(navigate).toHaveBeenCalledWith('brief')
  await screen.findByRole('button', { name: 'Preview option 1' })
  runtime.dispose()
})

it('preserves the brief editor across module navigation and runtime refresh', async () => {
  const scenario = makeScenario('copy-ready')
  const api = { getWorkspace: vi.fn().mockResolvedValue(scenario.workspace) }
  const runtime = createCampaignRuntime({ ...scenario, api })
  const props = { runtime, activeModule: 'brief', onNavigate: vi.fn() }
  const { rerender } = render(<CampaignPage {...props} />)
  const input = await screen.findByRole('textbox')
  fireEvent.change(input, { target: { value: 'Keep this draft' } })
  rerender(<CampaignPage {...props} activeModule="copy" />)
  await runtime.refresh()
  expect(input).not.toBeVisible()
  rerender(<CampaignPage {...props} activeModule="brief" />)
  await waitFor(() => expect(screen.getByRole('textbox')).toBe(input))
  expect(input).toHaveValue('Keep this draft')
  expect(runtime.hasDirty()).toBe(true)
  runtime.dispose()
})

it('falls back to an available step for a locked deep link without generating', async () => {
  const scenario = makeScenario('copy-ready')
  const api = { generate: vi.fn() }
  const runtime = createCampaignRuntime({ ...scenario, api })
  render(<CampaignPage runtime={runtime} activeModule="distribute" onNavigate={() => {}} />)
  expect(screen.queryByRole('region', { name: 'Distribute', exact: true })).not.toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Visuals', exact: true })).toBeVisible()
  expect(api.generate).not.toHaveBeenCalled()
  runtime.dispose()
})
