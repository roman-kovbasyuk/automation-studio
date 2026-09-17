// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { expect, test } from 'vitest'
import { runMigrations } from '../db/migrate.js'
import { createCampaignRepository } from './campaignRepository.js'
import { createTemplateRepository } from './templateRepository.js'
import { createGenerationControlPlane } from './generationJobRepository.js'
import { createGenerationService } from '../services/generationService.js'
import { createWorkspaceService } from '../services/workspaceService.js'
import { createVersionService } from '../services/versionService.js'
import { createFigmaHandoffService } from '../services/figmaHandoffService.js'
import { createReviewService } from '../services/reviewService.js'
import { createMockProvider } from '../providers/mockProvider.js'
import { createMemoryAssetStore } from '../storage/memoryAssetStore.js'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { studioTemplates } from '../../shared/studioTemplates.js'
import { briefWithBriefing, confirmBriefing } from '../testing/briefingFixtures.js'

test.each(['campaign', 'selected_copy'])('copy edits preserve approvals and invalidate the right artifacts (%s)', async mode => {
  const schema = `copy_edit_${randomUUID().replaceAll('-', '')}`
  const connectionString = process.env.TEST_DATABASE_URL ?? 'postgresql:///banner_studio_test'
  const maintenance = new Pool({ connectionString })
  await maintenance.query(`CREATE SCHEMA ${schema}`)
  const pool = new Pool({ connectionString, options: `-c search_path=${schema}` })
  try {
    await runMigrations({ pool })
    await pool.query('UPDATE settings SET daily_budget_microunits=10000000, per_step_regeneration_limit=100')
    await pool.query("INSERT INTO users (id,email,role,display_name) VALUES ('editor','editor@copy.test','marketer','Editor')")
    await pool.query("INSERT INTO users (id,email,role,display_name) VALUES ('designer','designer@copy.test','designer','Designer')")
    const actor = { id: 'editor', role: 'marketer' }
    const common = { actor, campaignId: 'campaign' }
    await createCampaignRepository(pool).create({ id: 'campaign', title: 'Copy editing', createdBy: actor.id,
      brief: briefWithBriefing({ product: 'Course', audience: 'Learners', objective: 'Signups', offer: '', locale: 'en', notes: '' }) })
    for (const manifest of studioTemplates) await createTemplateRepository(pool).createVersion({ ...manifest, manifest, manifestHash: hashCanonical(manifest), createdBy: actor.id })
    const assetStore = createMemoryAssetStore()
    const generation = createGenerationService({ pool, assetStore, controlPlane: createGenerationControlPlane({ pool }), providers: { mock: createMockProvider() } })
    const versions = createVersionService({ pool, assetStore })
    const read = () => createWorkspaceService({ pool }).getWorkspace(common)
    await generation.analyseBrief({ ...common, input: {}, idempotencyKey: 'brief' })
    await confirmBriefing({ pool, ...common })
    await generation.generateCopy({ ...common, input: {}, idempotencyKey: 'copy' })
    const set = (await read()).copies[0], copy = set.candidates[0]
    await generation.approveCopy({ ...common, expectedRevision: (await read()).campaign.revision, input: { copyId: copy.id } })
    await generation.generateDirections({ ...common, idempotencyKey: 'directions', input: mode === 'campaign' ? { mode } : { mode, copyIds: [copy.id] } })
    const direction = (await read()).directions[0]
    await generation.generateImage({ ...common, idempotencyKey: 'image', input: { directionId: direction.id, width: 1000, height: 1000 } })
    await generation.selectDirection({ ...common, expectedRevision: (await read()).campaign.revision, input: { directionId: direction.id } })
    const batch = { designs: [{ templateId: studioTemplates[0].id, templateVersion: studioTemplates[0].version, copySetId: set.id, copyId: copy.id, directionId: direction.id }], ratioIds: ['square'] }
    await versions.saveBannerBatch({ ...common, expectedRevision: (await read()).campaign.revision, input: batch })
    const created = await versions.createVersion({ ...common, expectedRevision: (await read()).campaign.revision, idempotencyKey: 'review', input: {} })
    const snapshot = structuredClone(created.body.version.snapshot)
    const input = { copyId: copy.id, headline: 'Updated headline', body: copy.body, offer: copy.offer, cta: copy.cta }
    const revision = (await read()).campaign.revision
    await expect(pool.query("UPDATE campaigns SET status='composed', open_version_id=NULL, revision=revision+1 WHERE id='campaign'"))
      .rejects.toMatchObject({ code: '23514' })
    await expect(generation.editCopy({ ...common, input, expectedRevision: revision - 1 })).rejects.toMatchObject({ code: 'revision_conflict' })
    await generation.editCopy({ ...common, input, expectedRevision: revision })
    let workspace = await read()
    await expect(generation.editCopy({...common,expectedRevision:workspace.campaign.revision,input:{...input,headline:''}})).rejects.toMatchObject({code:'invalid_request'})
    await expect(generation.editCopy({...common,expectedRevision:workspace.campaign.revision,input:{...input,cta:'x'.repeat(81)}})).rejects.toMatchObject({code:'invalid_request'})
    expect(workspace.copies[0].candidates[0]).toMatchObject({ ...copy, headline: input.headline })
    expect(workspace.copies[0].approvedCandidateIds).toContain(copy.id)
    expect(workspace.directions.find(item => item.id === direction.id).stale).toBe(mode === 'selected_copy')
    expect(workspace.campaign.openVersionId).toBeNull()
    expect(workspace.campaign.compositionId).toBeNull()
    expect(workspace.versions.find(item => item.id === created.body.version.id).snapshot).toEqual(snapshot)
    if (mode === 'campaign') {
      await versions.saveBannerBatch({ ...common, expectedRevision: workspace.campaign.revision, input: batch })
      const next = await versions.createVersion({ ...common, expectedRevision: (await read()).campaign.revision, idempotencyKey: 'review-2', input: {} })
      const figma = createFigmaHandoffService({ pool, assetStore })
      await figma.createHandoff({ actor, versionId: next.body.version.id, expectedRevision: next.body.campaign.revision, idempotencyKey: 'handoff', input: { fileKey: 'CopyEditingTest123' } })
      for (const method of ['editCopy', 'deleteCopy', 'approveCopy', 'selectCopy']) {
        await expect(generation[method]({ ...common, expectedRevision: (await read()).campaign.revision,
          input: method === 'editCopy' ? input : { copyId: copy.id } })).rejects.toMatchObject({ code: 'campaign_locked' })
      }
      const reviews = createReviewService({ pool })
      await reviews.requestChanges({ actor: { id: 'designer', role: 'designer' }, versionId: next.body.version.id,
        expectedRevision: (await read()).campaign.revision, idempotencyKey: 'changes', input: { comment: 'Revise the copy.' } })
      await reviews.reopen({ ...common, expectedRevision: (await read()).campaign.revision, idempotencyKey: 'reopen', input: {} })
      await generation.editCopy({ ...common, expectedRevision: (await read()).campaign.revision, input: { ...input, headline: 'Reopened copy' } })
      expect((await read()).copies[0].candidates[0].headline).toBe('Reopened copy')
      await generation.deleteCopy({ ...common, expectedRevision: (await read()).campaign.revision, input: { copyId: copy.id } })
      expect((await read()).copies[0]).toMatchObject({ hasApprovalHistory: true, approvedCandidateIds: [] })
    } else {
      await generation.generateDirections({ ...common, idempotencyKey: 'new-directions', input: { mode, copyIds: [copy.id] } })
      workspace = await read()
      const replacement = workspace.directions.find(item => !item.stale)
      expect(replacement.copy.headline).toBe(input.headline)
      await generation.generateImage({ ...common, idempotencyKey: 'new-image', input: { directionId: replacement.id, width: 1000, height: 1000 } })
      await generation.selectDirection({ ...common, expectedRevision: (await read()).campaign.revision, input: { directionId: replacement.id } })
      await versions.saveBannerBatch({ ...common, expectedRevision: (await read()).campaign.revision,
        input: { ...batch, designs: batch.designs.map(design => ({ ...design, directionId: replacement.id })) } })
      expect((await read()).composition.stale).toBe(false)
    }
  } finally {
    await pool.end()
    await maintenance.query(`DROP SCHEMA ${schema} CASCADE`)
    await maintenance.end()
  }
}, 30000)
