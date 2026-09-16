import { describe, expect, test } from 'vitest'
import { canonicalJson, hashCanonical } from './canonicalJson.js'

describe('canonicalJson', () => {
  test('sorts object keys recursively without reordering arrays', () => {
    expect(canonicalJson({ z: 1, a: { y: 2, x: [3, 1] } }))
      .toBe('{"a":{"x":[3,1],"y":2},"z":1}')
  })

  test('produces the same hash for equivalent object key order', () => {
    expect(hashCanonical({ b: 2, a: 1 })).toBe(hashCanonical({ a: 1, b: 2 }))
  })

  test.each([
    ['undefined', undefined],
    ['function', () => {}],
    ['symbol', Symbol('unsupported')],
    ['non-finite number', Number.POSITIVE_INFINITY],
  ])('rejects an unsupported %s', (_label, value) => {
    expect(() => canonicalJson(value)).toThrow(TypeError)
  })

  test('rejects circular structures', () => {
    const circular = {}
    circular.self = circular

    expect(() => canonicalJson(circular)).toThrow(TypeError)
  })
})

 test('hashes binary bytes without Web Crypto, including cross-realm buffers', async () => {
  const {sha256Bytes}=await import('./canonicalJson.js')
  const {createHash}=await import('node:crypto')
  for(const size of [0,1,55,56,64,1024]){
   const bytes=new Uint8Array(Array.from({length:size},(_,i)=>i%256))
   expect(sha256Bytes(bytes)).toBe(createHash('sha256').update(bytes).digest('hex'))
  }
 })
