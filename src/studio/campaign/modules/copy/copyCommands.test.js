import { describe, expect, test, vi } from 'vitest'
import { createCopyCommands } from './copyCommands.js'
import { createCampaignRuntime } from '../../campaignRuntime.js'
import { makeScenario } from '../../testing/workspaceFixtures.js'

function setup() {
  const scenario = makeScenario('copy-ready')
  const api = { getWorkspace: vi.fn(async () => structuredClone(scenario.workspace)),
    selectCopy: vi.fn(async () => {}), deselectCopy: vi.fn(async () => {}), approveCopy: vi.fn(async () => {}), deleteCopy: vi.fn(async () => {}),
    generate: vi.fn(async () => ({ job: { id: 'copy-job', status: 'succeeded' } })) }
  const runtime = createCampaignRuntime({ ...scenario, api })
  return { ...scenario, api, runtime, actions: createCopyCommands(runtime) }
}
describe('Copy commands', () => {
  test('editing refreshes copy and protects drafts captured before another change', async () => {
    const { api, runtime, workspace, actions } = setup()
    const fields = { headline: 'Updated headline', body: 'Updated body', offer: '', cta: 'Try now' }
    const expectedInputKey = runtime.getSnapshot('copy').inputKey
    api.editCopy = async (_campaignId, copyId, patch) => {
      Object.assign(workspace.copies[0].candidates.find(copy => copy.id === copyId), patch)
      workspace.campaign.revision += 1
    }
    expect(await actions.edit('copy-1', fields, { expectedInputKey })).toEqual({ ok: true })
    expect(runtime.getSnapshot('copy').input.copies[0].candidates[0]).toMatchObject(fields)
    expect(await actions.edit('copy-1', { ...fields, headline: 'Stale draft' }, { expectedInputKey })).toMatchObject({ ok: false, code: 'source_changed' })
    expect(workspace.copies[0].candidates[0].headline).toBe(fields.headline)
    runtime.dispose()
  })
  test('approvals use authoritative revisions and reconcile exact persisted IDs', async () => {
    const { actions, api, runtime, workspace } = setup()
    api.approveCopy.mockRejectedValueOnce(Object.assign(new Error('Offline'), { status: 0 }))
    expect(await actions.approve('copy-2')).toMatchObject({ ok: false })
    expect(api.approveCopy).toHaveBeenCalledWith('campaign-1', 'copy-2', workspace.campaign.revision)
    workspace.campaign.revision += 1
    await runtime.refresh()
    expect(runtime.getSnapshot('copy').operation.kind).toBe('uncertain')
    workspace.copies[0].approvedCandidateIds = ['copy-1', 'copy-2']
    await runtime.refresh()
    expect(runtime.getSnapshot('copy').operation.kind).toBe('idle')
    expect(api.approveCopy).toHaveBeenCalledTimes(1)
    runtime.dispose()
  })
  test('select and remove send candidate IDs and authoritative revisions', async () => {
    const { actions, api, runtime, workspace } = setup()
    expect(await actions.select('copy-1')).toEqual({ ok: true })
    expect(api.selectCopy).toHaveBeenCalledWith('campaign-1', { copyId: 'copy-1' }, workspace.campaign.revision)
    workspace.campaign.revision += 1
    await runtime.refresh()
    expect(await actions.remove('copy-2')).toEqual({ ok: true })
    expect(api.deleteCopy).toHaveBeenCalledWith('campaign-1', 'copy-2', workspace.campaign.revision)
    runtime.dispose()
  })
  test('deselect uses its own durable mutation and clears the active selection on refresh', async () => {
    const { actions, api, runtime, workspace } = setup()
    workspace.campaign.selectedCopyId = workspace.copies[0].id
    workspace.copies[0].selectedCandidateId = 'copy-1'
    api.deselectCopy.mockImplementation(async () => {
      workspace.campaign.selectedCopyId = null
      workspace.copies[0].selectedCandidateId = null
      workspace.campaign.revision += 1
    })
    expect(await actions.deselect('copy-1')).toEqual({ ok: true })
    expect(api.deselectCopy).toHaveBeenCalledWith('campaign-1', 1)
    expect(runtime.getSnapshot('copy').input.selectedCopyId).toBeNull()
    runtime.dispose()
  })
  test('legacy copy selection makes one mutation request and one workspace refresh', async () => {
    const { actions, api, runtime } = setup()

    expect(await actions.select('copy-1')).toEqual({ ok: true })

    expect(api.selectCopy).toHaveBeenCalledTimes(1)
    expect(api.getWorkspace).toHaveBeenCalledTimes(1)
    expect(api.approveCopy).not.toHaveBeenCalled()
    expect(api.deleteCopy).not.toHaveBeenCalled()
    expect(api.generate).not.toHaveBeenCalled()
    runtime.dispose()
  })
  test('generation uses its own job boundary and idempotency key', async () => {
    const { actions, api, runtime } = setup()
    expect(await actions.generate()).toEqual({ ok: true })
    expect(api.generate).toHaveBeenCalledWith('campaign-1', 'copy', {}, expect.any(String))
    runtime.dispose()
  })
  test('unknown or stale candidates never reach a write endpoint', async () => {
    const { actions, api, runtime, workspace } = setup()
    expect(await actions.select('another-candidate')).toMatchObject({ ok: false })
    workspace.copies[0].stale = true
    await runtime.refresh()
    expect(await actions.remove('copy-1')).toMatchObject({ ok: false })
    expect(api.selectCopy).not.toHaveBeenCalled()
    expect(api.deleteCopy).not.toHaveBeenCalled()
    runtime.dispose()
  })
  test('an uncertain selection can be reconciled without replaying PUT', async () => {
    const { actions, api, runtime, workspace } = setup()
    api.selectCopy.mockRejectedValueOnce(Object.assign(new Error('Offline'), { status: 0 }))
    expect(await actions.select('copy-1')).toMatchObject({ ok: false })
    workspace.campaign.selectedCopyId = workspace.copies[0].id
    workspace.copies[0].selectedCandidateId = 'copy-1'
    workspace.campaign.revision += 1
    await runtime.refresh()
    expect(runtime.getSnapshot('copy').operation.kind).toBe('idle')
    expect(api.selectCopy).toHaveBeenCalledTimes(1)
    runtime.dispose()
  })
})
