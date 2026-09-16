import { pathToFileURL } from 'node:url'
import { createPool } from '../server/db/pool.js'
import { seedAssetWorkflows } from '../server/assetWorkflows/definitionService.js'

export async function seedConfiguredAssetWorkflows({
  connectionString = process.env.DATABASE_URL ??
    'postgresql:///banner_studio_demo',
} = {}) {
  const pool = createPool({ connectionString })
  try {
    const result = await pool.query(`
      SELECT id,email,role,display_name,disabled,disabled_at
      FROM users
      WHERE role='admin' AND disabled=false AND disabled_at IS NULL
      ORDER BY created_at,id
      LIMIT 1
    `)
    const user = result.rows[0]
    if (!user)
      throw new Error(
        'No enabled administrator exists; create or enable an admin before seeding recipes',
      )
    return await seedAssetWorkflows({
      pool,
      actor: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
        disabled: user.disabled,
        disabledAt: user.disabled_at,
      },
    })
  } finally {
    await pool.end()
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const result = await seedConfiguredAssetWorkflows()
    console.log(
      `Asset workflow seed complete: ${result.created.length} created, existing recipes preserved.`,
    )
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Asset workflow seed failed',
    )
    process.exitCode = 1
  }
}
