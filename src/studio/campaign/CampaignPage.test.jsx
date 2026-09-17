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

it('a new project opens in Brief and runs its pending submission there, once', async () => {
  const scenario = makeScenario('draft')
  scenario.workspace.campaign.brief = { ...scenario.workspace.campaign.brief, briefing: { schemaVersion: 2, sourceKey: 'a'.repeat(64), sourceIds: [], analysisJobId: null,
    answers: { summary: '', audience: '', copyMode: null, ageGroups: [], gender: 'all', reach: null, goal: null, goalCustom: '', visualTags: [] }, confirmation: null } }
  scenario.workspace.sources = []
  const calls = []
  const api = {
    getWorkspace: vi.fn(async () => structuredClone(scenario.workspace)),
    putBriefSource: vi.fn(async (id, sourceId, input, revision) => {
      calls.push(`upload:${sourceId}`)
      scenario.workspace.sources.push({ id: sourceId, name: input.name, kind: 'text', mimeType: 'text/plain', byteSize: 1, status: 'ready', errorCode: null, contentHash: 'b'.repeat(64), contentRevision: 1 })
      scenario.workspace.campaign.revision = revision + 1
      return { source: { id: sourceId, status: 'ready', name: input.name }, campaignRevision: revision + 1 }
    }),
    generate: vi.fn(async (id, step) => { calls.push(step); return { job: { id: 'analysis', status: 'succeeded' } } }),
  }
  const runtime = createCampaignRuntime({ ...scenario, api })
  const started = vi.fn(), settled = vi.fn()
  const pendingSubmission = { sources: [{ id: 'source-1', kind: 'text', name: 'brief.txt', text: 'Brief' }] }
  const { rerender } = render(<CampaignPage runtime={runtime} activeModule="brief" onNavigate={() => {}}
    pendingSubmission={pendingSubmission} onSubmissionStarted={started} onSubmissionSettled={settled} />)
  await waitFor(() => expect(settled).toHaveBeenCalledOnce())
  expect(started).toHaveBeenCalledOnce()
  expect(calls).toEqual(['upload:source-1', 'brief'])
  rerender(<CampaignPage runtime={runtime} activeModule="brief" onNavigate={() => {}}
    pendingSubmission={pendingSubmission} onSubmissionStarted={started} onSubmissionSettled={settled} />)
  expect(api.putBriefSource).toHaveBeenCalledOnce()
  runtime.dispose()
})

it('after a reload, lists interrupted uploads without sending anything again', async () => {
  const scenario = makeScenario('draft')
  scenario.workspace.sources = [{ id: 'kept', name: 'uploaded.pdf', kind: 'file', mimeType: 'application/pdf', byteSize: 1, status: 'ready', errorCode: null, contentHash: 'c'.repeat(64), contentRevision: 1 }]
  const api = { getWorkspace: vi.fn(async () => structuredClone(scenario.workspace)), generate: vi.fn(), putBriefSource: vi.fn() }
  const runtime = createCampaignRuntime({ ...scenario, api })
  const dismiss = vi.fn()
  render(<CampaignPage runtime={runtime} activeModule="brief" onNavigate={() => {}}
    interruptedUploads={['uploaded.pdf', 'missing.docx']} onDismissInterruptedUploads={dismiss} />)
  expect(await screen.findByText('Upload interrupted — add your files again')).toBeVisible()
  expect(screen.getByText('These files were not uploaded: missing.docx.')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
  expect(dismiss).toHaveBeenCalledOnce()
  expect(api.generate).not.toHaveBeenCalled()
  expect(api.putBriefSource).not.toHaveBeenCalled()
  runtime.dispose()
})
