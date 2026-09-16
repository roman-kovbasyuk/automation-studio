import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const algorithm = 'aes-256-gcm'

function keyBytes(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Credential encryption key is required')
  const normalized = value.trim()
  const decoded = /^[a-f0-9]{64}$/i.test(normalized) ? Buffer.from(normalized, 'hex') : Buffer.from(normalized, 'base64')
  if (decoded.length !== 32) throw new Error('Credential encryption key must decode to 32 bytes')
  return decoded
}

export function createCredentialVault({ key, keyVersion = 'v1' } = {}) {
  const secret = keyBytes(key)
  return {
    keyVersion,
    encrypt(value) {
      if (typeof value !== 'string' || !value.trim()) throw new TypeError('Credential must be a non-empty string')
      const iv = randomBytes(12)
      const cipher = createCipheriv(algorithm, secret, iv)
      const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
      return { keyVersion, iv: iv.toString('base64url'), ciphertext: ciphertext.toString('base64url'), authTag: cipher.getAuthTag().toString('base64url') }
    },
    decrypt(envelope) {
      const decipher = createDecipheriv(algorithm, secret, Buffer.from(envelope.iv, 'base64url'))
      decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64url'))
      return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64url')), decipher.final()]).toString('utf8')
    },
    mask(value) {
      const suffix = value.slice(-4)
      return `••••••••${suffix}`
    },
    fingerprint(value) {
      return createHash('sha256').update(value).digest('hex')
    },
  }
}
