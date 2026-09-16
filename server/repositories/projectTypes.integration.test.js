// Uses a connection-local temporary table only; never modifies application records.
import { readFile } from 'node:fs/promises'
import { Pool } from 'pg'
import { expect, test } from 'vitest'
import { projectTypes } from '../../shared/projectTypes.js'
import { createCampaignRepository } from './campaignRepository.js'

test.skipIf(!process.env.TEST_DATABASE_URL)('migration backfills existing projects and repository retains each future type', async () => {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL })
  const client = await pool.connect()
  try {
    await client.query(`CREATE TEMP TABLE campaigns (
      id TEXT PRIMARY KEY, title TEXT, brief JSONB, created_by TEXT,
      status TEXT DEFAULT 'draft', revision INT DEFAULT 0,
      selected_copy_id TEXT, selected_direction_id TEXT, composition_id TEXT,
      current_version_number INT DEFAULT 0, open_version_id TEXT,
      created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), archived_at TIMESTAMPTZ
    )`)
    await client.query("INSERT INTO campaigns (id, title) SELECT 'old-' || i, 'Old project' FROM generate_series(1, 20) AS i")
    await client.query(await readFile('server/db/migrations/046_project_types.sql', 'utf8'))
    const repository = createCampaignRepository(client)
    for (const row of await repository.list()) expect(projectTypes).toContain(row.projectType)
    for (const projectType of projectTypes) {
      const created = await repository.create({ id: projectType, title: 'New project', brief: { notes: 'Test' }, createdBy: 'test', projectType })
      expect(created.projectType).toBe(projectType)
      expect((await repository.findById(created.id)).projectType).toBe(projectType)
    }
    const legacyClient = await repository.create({ id:'legacy-client', title:'Banner', brief:{notes:'Test'}, createdBy:'test' })
    expect(legacyClient.projectType).toBe('banners')
    await expect(repository.create({id:'invalid', title:'Invalid', brief:{notes:'Test'}, createdBy:'test', projectType:'unknown'})).rejects.toMatchObject({code:'23514'})
  } finally {
    await client.query('DROP TABLE IF EXISTS pg_temp.campaigns')
    client.release()
    await pool.end()
  }
})
