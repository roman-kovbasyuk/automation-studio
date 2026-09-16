import { describe, expect, test } from 'vitest'
import { createMemoryPrototypeStore } from './store.js'

describe('prototype store', () => {
  test('returns isolated clones and applies atomic updates', async () => {
    const store = createMemoryPrototypeStore({ value: { count: 1, nested: { ok: true } } })
    const first = await store.read()
    first.nested.ok = false
    expect((await store.read()).nested.ok).toBe(true)

    await store.update(state => {
      state.count += 1
      return state.count
    })
    expect((await store.read()).count).toBe(2)
  })

  test('failed update leaves the committed record intact', async () => {
    const store = createMemoryPrototypeStore({ value: { count: 2 } })
    await expect(store.update(() => { throw new Error('storage failure') })).rejects.toThrow('storage failure')
    expect((await store.read()).count).toBe(2)
  })

  test('reset swaps state and invalidates the prior epoch', async () => {
    const store = createMemoryPrototypeStore({ value: { epoch: 0, count: 3 } })
    await store.reset({ epoch: 1, count: 0 })
    await expect(store.read()).resolves.toEqual({ epoch: 1, count: 0 })
  })
})
