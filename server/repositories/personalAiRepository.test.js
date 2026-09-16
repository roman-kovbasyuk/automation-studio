import { describe, expect, test, vi } from 'vitest'
import { createPersonalAiRepository } from './personalAiRepository.js'

describe('personal AI repository', () => {
  test('maps the stored auth tag into the credential vault envelope shape', async () => {
    const client = { query: vi.fn(async () => ({ rows: [{
      provider: 'google', key_version: 'v1', iv: 'iv', ciphertext: 'cipher', auth_tag: 'tag', credential_version: '2',
    }] })) }

    const connection = await createPersonalAiRepository(client).getConnection({ userId: 'user-1', provider: 'google' })

    expect(connection).toMatchObject({
      provider: 'google', key_version: 'v1', auth_tag: 'tag', keyVersion: 'v1', authTag: 'tag',
    })
  })
})
