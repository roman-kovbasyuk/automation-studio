// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { startIsolatedStudio } from './start-isolated-studio.mjs'

let runtime
beforeAll(async () => {
  runtime = await startIsolatedStudio()
}, 30000)
afterAll(async () => runtime?.close(), 30000)

describe('isolated admin runtime', () => {
  test('wires admin reads and explicitly seeds all four recipes', async () => {
    const recipes = await fetch(`${runtime.url}/api/v1/admin/asset-workflows`, {
      headers: { 'x-studio-demo-role': 'admin' },
    })
    expect(recipes.status).toBe(200)
    expect((await recipes.json()).items.map(({ key }) => key).sort()).toEqual([
      'banners',
      'presentations',
      'templates',
      'websites',
    ])

    const overview = await fetch(`${runtime.url}/api/v1/admin/overview`, {
      headers: { 'x-studio-demo-role': 'admin' },
    })
    expect(overview.status).toBe(200)
    expect((await overview.json()).counts.assetWorkflows).toBe(4)
  })

  test('uses the same enabled-admin guard for admin reads and recipe authoring', async () => {
    for (const path of [
      '/api/v1/admin/users',
      '/api/v1/admin/asset-workflows',
    ]) {
      expect(
        (
          await fetch(`${runtime.url}${path}`, {
            headers: { 'x-studio-demo-role': 'designer' },
          })
        ).status,
      ).toBe(403)
    }
  })
})
