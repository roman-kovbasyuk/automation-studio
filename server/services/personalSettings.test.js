import { describe, expect, test } from 'vitest'
import { createCredentialVault } from './credentialVault.js'

describe('personal credential vault', () => {
  test('encrypts and decrypts a provider key without exposing plaintext in the envelope', () => {
    const vault = createCredentialVault({ key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' })
    const envelope = vault.encrypt('sk-example-secret')

    expect(envelope.ciphertext).not.toContain('sk-example-secret')
    expect(vault.decrypt(envelope)).toBe('sk-example-secret')
    expect(vault.mask('sk-example-secret')).toBe('••••••••cret')
  })

  test('fails closed when encryption material is missing', () => {
    expect(() => createCredentialVault({})).toThrow(/encryption key/i)
  })
})
