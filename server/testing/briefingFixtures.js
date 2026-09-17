import { emptyBriefAnswers } from '../../shared/briefingContracts.js'
import { copyProjection, visualProjection } from '../../shared/briefingDependencies.js'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { initialBriefingState } from '../repositories/briefingRepository.js'
import { createCampaignRepository } from '../repositories/campaignRepository.js'
import { createBriefingService } from '../services/briefingService.js'

// Copy, visual and video generation require a confirmed canonical briefing.
// Integration fixtures reach that state the way users do: analysis with the
// mock provider, then confirmation of the proposed answers.

export function briefWithBriefing(brief) {
  return { ...brief, briefing: initialBriefingState(brief) }
}

export async function confirmBriefing({ pool, actor, campaignId, answers = {}, idempotencyKey = 'fixture-briefing-confirmation' }) {
  const campaign = await createCampaignRepository(pool).findById(campaignId)
  const state = campaign?.brief.briefing
  if (!state?.analysisJobId) throw new Error('Analyze the fixture brief before confirming it')
  const proposed = state.answers
  return createBriefingService({ pool }).confirm({
    actor, campaignId, expectedRevision: campaign.revision, idempotencyKey,
    input: {
      analysisJobId: state.analysisJobId,
      sourceKey: state.sourceKey,
      answers: {
        ...proposed,
        copyMode: proposed.copyMode ?? 'create_new',
        reach: proposed.reach ?? 'local',
        goal: proposed.goal ?? 'signups',
        ...answers,
      },
    },
  })
}

export async function analyseAndConfirmBriefing({ pool, generation, actor, campaignId, answers, idempotencyKey = 'fixture-briefing-analysis' }) {
  const analysis = await generation.analyseBrief({ actor, campaignId, idempotencyKey, input: {} })
  const confirmation = await confirmBriefing({ pool, actor, campaignId, answers, idempotencyKey: `${idempotencyKey}-confirmation` })
  return { analysis, confirmation }
}

// For control-plane tests that prepare image or direction jobs without running
// analysis: writes the confirmed state the confirmation gate checks, without a
// revision change, provider call or generation job.
export async function seedConfirmedBriefing({ pool, campaignId, actorId, answers = {} }) {
  const campaign = await createCampaignRepository(pool).findById(campaignId)
  const state = campaign.brief.briefing ?? initialBriefingState(campaign.brief)
  const confirmedAnswers = {
    ...emptyBriefAnswers(), summary: 'Fixture campaign summary', audience: campaign.brief.audience || 'Fixture audience',
    copyMode: 'create_new', reach: 'local', goal: 'signups', ...answers,
  }
  const analysisJobId = state.analysisJobId ?? `${campaignId}:fixture-analysis`
  const brief = { ...campaign.brief, briefing: { ...state, analysisJobId, answers: confirmedAnswers } }
  const id = `${campaignId}:fixture-confirmation`
  const confirmation = {
    id, analysisJobId, sourceKey: state.sourceKey,
    copyKey: hashCanonical(copyProjection(brief)), visualKey: hashCanonical(visualProjection(brief)), answersKey: hashCanonical(confirmedAnswers),
    confirmedAt: '2026-09-04T10:00:00.000Z', confirmedBy: actorId, importedCopySetId: null,
  }
  await pool.query(`INSERT INTO brief_confirmations(id,campaign_id,actor_id,idempotency_key,request_hash,source_key,copy_key,answers_key,snapshot,response)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [id, campaignId, actorId, id, confirmation.answersKey, state.sourceKey, confirmation.copyKey,
    confirmation.answersKey, JSON.stringify({ answers: confirmedAnswers, confirmation, suppliedCopy: null }),
    JSON.stringify({ confirmationId: id, campaignRevision: campaign.revision, initialCopy: 'skip', importedCopySetId: null })])
  await pool.query('UPDATE campaigns SET brief = $1 WHERE id = $2', [JSON.stringify({ ...brief, briefing: { ...brief.briefing, confirmation } }), campaignId])
  return confirmation
}
