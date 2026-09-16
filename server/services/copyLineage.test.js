import { expect, test } from 'vitest'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { verifyCopyLineage } from './versionService.js'

const oldAnalysis = { summary: 'Original', themes: [], warnings: [] }
const brief = { product: 'Headphones', audience: 'Commuters', objective: 'Shop', offer: '', locale: 'en', notes: 'Launch', analysis: oldAnalysis }
const current = { ...brief, analysis: { ...oldAnalysis, summary: 'Updated' } }
const candidate = { id: 'copy', headline: 'Quiet', body: 'Listen', cta: 'Shop', offer: '', visualPrompt: 'Headphones' }
const safe = { generationStatus: 'succeeded', generationSafety: { verdict: 'safe' } }
const copy = { ...safe, id: 'set', stale: false, generationStep: 'copy', selectedCandidateId: 'copy', selectedCopy: candidate, candidates: [candidate],
  generationInput: { brief, analysis: oldAnalysis }, generationResult: { copySetId: 'set', copies: [candidate] } }
const analysis = { ...safe, generationStep: 'brief_analysis', generationInput: { brief }, generationResult: { analysis: oldAnalysis } }
test('explicit retention authorizes unchanged safe copy for exactly the accepted brief', () => {
  expect(() => verifyCopyLineage({ ...copy, retainedBriefHash: hashCanonical(current) }, current, analysis)).not.toThrow()
  expect(() => verifyCopyLineage(copy, current, analysis)).toThrow()
  expect(() => verifyCopyLineage({ ...copy, retainedBriefHash: hashCanonical(brief) }, current, analysis)).toThrow()
})
test('retention cannot bypass stale, altered, or unsafe generated content', () => {
  const retained = { ...copy, retainedBriefHash: hashCanonical(current) }
  expect(() => verifyCopyLineage({ ...retained, stale: true }, current, analysis)).toThrow()
  expect(() => verifyCopyLineage({ ...retained, candidates: [{ ...candidate, headline: 'Tampered' }] }, current, analysis)).toThrow()
  expect(() => verifyCopyLineage({ ...retained, generationSafety: { verdict: 'blocked' } }, current, analysis)).toThrow()
})
