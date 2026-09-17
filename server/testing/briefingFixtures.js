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
