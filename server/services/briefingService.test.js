import { describe, expect, test } from 'vitest'
import { requireBriefConfirmation } from './briefingService.js'

describe('requireBriefConfirmation', () => {
  test('rejects a canonical campaign without confirmation', async () => {
    const client = { query: async () => ({ rows: [] }) }

    await expect(requireBriefConfirmation(client, {
      id: 'campaign-1',
      brief: { product: 'Course', briefing: {
        schemaVersion: 2, sourceKey: 'a'.repeat(64), sourceIds: [], analysisJobId: null,
        answers: {}, confirmation: null,
      } },
    })).rejects.toMatchObject({
      statusCode: 409,
      code: 'brief_confirmation_required',
    })
  })
})
