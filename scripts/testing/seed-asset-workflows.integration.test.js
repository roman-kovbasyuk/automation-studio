// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { runMigrations } from '../../server/db/migrate.js'
import { seedConfiguredAssetWorkflows } from '../seed-asset-workflows.mjs'

const schema = `seed_wrapper_test_${randomUUID().replaceAll('-', '')}`
const databaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgresql:///banner_studio_test'
const configuredDatabaseUrl = new URL(databaseUrl)
configuredDatabaseUrl.searchParams.set(
  'application_name',
  'seed-wrapper-query-param-regression',
)
const configuredConnectionString = configuredDatabaseUrl.toString()
const isolatedDatabaseUrl = new URL(configuredConnectionString)
isolatedDatabaseUrl.searchParams.set('options', `-c search_path=${schema}`)
const connectionString = isolatedDatabaseUrl.toString()
let maintenance

beforeAll(async () => {
  maintenance = new Pool({ connectionString: databaseUrl })
  await maintenance.query(`CREATE SCHEMA ${schema}`)
  const pool = new Pool({ connectionString })
  try {
    const isolation = await pool.query(
      "SELECT current_schema() schema,current_setting('search_path') search_path,current_setting('application_name') application_name",
    )
    expect(isolation.rows[0]).toEqual({
      schema,
      search_path: schema,
      application_name: 'seed-wrapper-query-param-regression',
    })
    await runMigrations({ pool })
    await pool.query(
      "INSERT INTO users (id,email,role,display_name) VALUES ('seed-admin','seed-admin@example.test','admin','Seed Admin')",
    )
  } finally {
    await pool.end()
  }
}, 30000)

afterAll(async () => {
  if (!maintenance) return
  await maintenance.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
  await maintenance.end()
}, 30000)

describe('configured asset workflow seed', () => {
  test('completes before closing its pool and preserves existing recipes on retry', async () => {
    await expect(
      seedConfiguredAssetWorkflows({ connectionString }),
    ).resolves.toMatchObject({
      created: expect.arrayContaining([expect.any(String)]),
    })
    await expect(
      seedConfiguredAssetWorkflows({ connectionString }),
    ).resolves.toEqual({ created: [] })

    const pool = new Pool({ connectionString })
    try {
      expect(
        (
          await pool.query('SELECT key FROM asset_workflows ORDER BY key')
        ).rows.map(({ key }) => key),
      ).toEqual(['banners', 'presentations', 'templates', 'websites'])
    } finally {
      await pool.end()
    }
  }, 10000)
})
