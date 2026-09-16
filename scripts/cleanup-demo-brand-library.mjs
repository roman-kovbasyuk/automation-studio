import { createPool } from '../server/db/pool.js'

// Explicit, reversible cleanup of known local QA fixtures; never a startup migration.
if (process.env.NODE_ENV === 'production' || process.env.K_SERVICE) throw new Error('Local demo cleanup only')
const pool = createPool({ connectionString: 'postgresql:///banner_studio_demo' })
const fixtures = ['Atlas Browser Check', 'Atlas Brand QA', 'Northstar QA']
try {
  const result = await pool.query(`UPDATE brand_design_systems
    SET state = 'archived', revision = revision + 1, updated_at = now()
    WHERE workspace_id = 'default' AND state <> 'archived' AND draft->>'name' = ANY($1::text[])
    RETURNING id, draft->>'name' AS name`, [fixtures])
  const active = await pool.query(`SELECT id, draft->>'name' AS name, state FROM brand_design_systems
    WHERE workspace_id = 'default' AND state <> 'archived' ORDER BY draft->>'name'`)
  console.log(JSON.stringify({ archived: result.rows, active: active.rows }, null, 2))
} finally { await pool.end() }
