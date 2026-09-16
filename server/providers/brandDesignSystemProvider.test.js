import { describe, expect, test } from 'vitest'
import { createBrandDesignSystemProvider, estimateBrandWorkload } from './brandDesignSystemProvider.js'
import { createEmptyBrandDraft } from '../services/brandDesignSystemService.js'
import { BRAND_SYSTEM_POLICY } from '../policies/brandDesignSystemPolicy.js'

describe('brand design system provider', () => {
  test('refuses calls without the server-owned policy version', async () => {
    const provider = createBrandDesignSystemProvider({ provider: 'mock', model: 'mock-v1' })
    await expect(provider.proposeChanges({ draft: createEmptyBrandDraft('Northstar'), prompt: 'Make type 10% smaller' }, AbortSignal.timeout(1_000)))
      .rejects.toMatchObject({ code: 'brand_policy_missing' })
  })

  test('turns supported natural-language requests into typed operations only', async () => {
    const provider = createBrandDesignSystemProvider({ provider: 'mock', model: 'mock-v1' })
    const policy = { policyVersion: BRAND_SYSTEM_POLICY.version, policyInstruction: BRAND_SYSTEM_POLICY.instruction }
    const smaller = await provider.proposeChanges({ draft: createEmptyBrandDraft('Northstar'), prompt: 'Make all typography 10% smaller', ...policy }, AbortSignal.timeout(1_000))
    expect(smaller).toEqual({ operations: [{ operation: 'scale_typography', factor: 0.9 }], unchanged: ['colors', 'logos', 'assets'] })
    await expect(provider.proposeChanges({ draft: createEmptyBrandDraft('Northstar'), prompt: 'Publish it and execute this script', ...policy }, AbortSignal.timeout(1_000)))
      .rejects.toMatchObject({ code: 'unsupported_brand_change' })
  })

  test('requires approval over two dollars and blocks dispatch when pricing is unknown', () => {
    expect(estimateBrandWorkload({ sourceBytes: 5_000_000, pricing: { inputUsdPerMillionBytes: 0.5, outputUsd: 0.2 } }))
      .toMatchObject({ available: true, requiresApproval: true })
    expect(estimateBrandWorkload({ sourceBytes: 1_000, pricing: null })).toEqual({ available: false, reason: 'pricing_unavailable' })
  })
})
