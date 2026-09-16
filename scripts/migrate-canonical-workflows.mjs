import { createPool } from '../server/db/pool.js'
import { inspectCanonicalMigration, applyCanonicalMigration } from '../server/workflows/canonicalMigration.js'

const args = new Set(process.argv.slice(2))
const values = process.argv.slice(2)
const campaignIds = values.filter(value => value.startsWith('--campaign-id=')).map(value => value.slice('--campaign-id='.length)).filter(Boolean)
const manifestHash = values.find(value => value.startsWith('--manifest-hash='))?.slice('--manifest-hash='.length)
const pool = createPool({ connectionString: process.env.DATABASE_URL })
try {
  const inspected = await inspectCanonicalMigration({ pool, campaignIds })
  if (!args.has('--apply')) {
    process.stdout.write(`${JSON.stringify({ mode: 'dry-run', ...inspected })}\n`)
  } else {
    if (!manifestHash) throw new Error('--manifest-hash is required with --apply')
    const actor = { id: process.env.CANONICAL_MIGRATION_ACTOR_ID, role: 'admin' }
    const result = await applyCanonicalMigration({ pool, campaignIds, manifestHash, actor })
    process.stdout.write(`${JSON.stringify({ mode: 'apply', ...result })}\n`)
  }
} finally {
  await pool.end()
}
