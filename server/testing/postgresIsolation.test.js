// @vitest-environment node
import { Client } from 'pg'
import { describe, expect, test, vi } from 'vitest'
import {
  assertIsolatedSchema,
  isolatedDatabaseUrl,
} from './postgresIsolation.js'

describe('PostgreSQL test isolation', () => {
  test('rejects unsafe generated schema names', () => {
    expect(() =>
      isolatedDatabaseUrl(
        'postgresql:///banner_studio_test',
        'public; DROP SCHEMA public',
      ),
    ).toThrow('Unsafe isolated schema name')
  })

  test('replaces a hostile search path while retaining unrelated URL parameters', () => {
    const connectionString = isolatedDatabaseUrl(
      'postgresql://localhost/banner_studio_test?options=-c%20search_path%3Dpublic&application_name=recipe-fixture',
      'recipe_test_0123456789abcdef0123456789abcdef',
    )
    const url = new URL(connectionString)
    const client = new Client({ connectionString })

    expect(url.searchParams.get('application_name')).toBe('recipe-fixture')
    expect(client.connectionParameters.options).toBe(
      '-c search_path=recipe_test_0123456789abcdef0123456789abcdef',
    )
  })

  test('rejects a connection outside the owned schema before setup can continue', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ schema: 'public', searchPath: 'public' }],
      }),
    }

    await expect(
      assertIsolatedSchema(
        pool,
        'runtime_flow_0123456789abcdef0123456789abcdef',
      ),
    ).rejects.toThrow(
      'Refusing fixture writes outside runtime_flow_0123456789abcdef0123456789abcdef',
    )
  })
})
