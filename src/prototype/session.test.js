import { describe, expect, test } from 'vitest'
import { createSessionFixture } from './session.js'

describe('prototype session', () => {
  test('creates and reopens a project through the same local API', async () => {
    const session = await createSessionFixture()
    const created = await session.api.createCampaign({ title: 'Local launch', projectType: 'banners', brief: { product: 'Headphones', audience: 'Commuters', objective: 'Awareness' } })
    expect((await session.api.listCampaigns()).campaigns.map(item => item.id)).toContain(created.id)
    expect((await session.api.getWorkspace(created.id)).campaign.title).toBe('Local launch')
    await session.dispose()
  })

  test('returns local simulation capabilities and keeps API independent of fetch', async () => {
    const session = await createSessionFixture()
    expect((await session.api.getRuntimeConfig()).prototype).toBe(true)
    expect((await session.api.getGenerationReadiness()).state).toBe('ready')
    await session.dispose()
  })

  test('uses distinct demo identities when the reviewer role changes', async () => {
    const session = await createSessionFixture()
    expect((await session.api.getSession()).id).toBe('prototype-marketer')
    await session.scenarios.setActor('designer')
    expect((await session.api.getSession()).id).toBe('prototype-designer')
    await session.dispose()
  })

  test('normalizes a schema v2 briefing before the campaign runtime reads it', async () => {
    const session = await createSessionFixture()
    const created = await session.api.createCampaign({
      title: 'Source-ready campaign',
      projectType: 'banners',
      brief: { notes: 'A source-ready campaign.', briefing: { schemaVersion: 2 } },
    })
    const workspace = await session.api.getWorkspace(created.id)
    expect(workspace.campaign.brief.briefing).toMatchObject({
      schemaVersion: 2,
      sourceIds: [],
      answers: expect.objectContaining({ summary: '', audience: '', visualTags: [] }),
      confirmation: null,
    })
    await session.dispose()
  })
})

test('tailored simulation returns one direction per requested copy with exact pairing', async () => {
  const session = await createSessionFixture()
  const campaign = await session.api.createCampaign({ title: 'Pairing check', projectType: 'banners', brief: { product: 'Headphones' } })
  const copies = (await session.api.generate(campaign.id, 'copy', {}, 'copy-fixture')).job.result.copies
  const first = await session.api.generate(campaign.id, 'directions', { mode: 'selected_copy', copyIds: [copies[0].id, copies[2].id] }, 'tailored-fixture')
  expect(first.job.result.directions.map(direction => direction.copy.id)).toEqual([copies[0].id, copies[2].id])
  expect(first.job.result.directions).toHaveLength(2)
  const universal = await session.api.generate(campaign.id, 'directions', { mode: 'campaign' }, 'universal-fixture')
  expect(universal.job.result.directions).toHaveLength(5)
  expect(universal.job.result.directions.every(direction => direction.copy === null)).toBe(true)
  await session.dispose()
})

test('revoking one copy keeps the other selected copy and existing options', async () => {
  const session = await createSessionFixture()
  const campaign = await session.api.createCampaign({ title: 'Selection check', projectType: 'banners', brief: { product: 'Headphones' } })
  const copies = (await session.api.generate(campaign.id, 'copy', {}, 'copies')).job.result.copies
  let workspace = await session.api.getWorkspace(campaign.id)
  await session.api.approveCopy(campaign.id, copies[0].id, workspace.campaign.revision)
  workspace = await session.api.getWorkspace(campaign.id)
  await session.api.approveCopy(campaign.id, copies[1].id, workspace.campaign.revision)
  workspace = await session.api.getWorkspace(campaign.id)
  await session.api.approveCopy(campaign.id, copies[1].id, workspace.campaign.revision, true)
  workspace = await session.api.getWorkspace(campaign.id)
  expect(workspace.copies[0].approvedCandidateIds).toEqual([copies[0].id])
  expect(workspace.copies[0].selectedCandidateId).toBe(copies[0].id)
  expect(workspace.copies[0].candidates).toHaveLength(5)
  await session.dispose()
})
