const safeSchema = /^[a-z][a-z0-9_]{0,62}$/

function requireSafeSchema(schema) {
  if (!safeSchema.test(schema)) throw new TypeError('Unsafe isolated schema name')
}

export function isolatedDatabaseUrl(connectionString, schema) {
  requireSafeSchema(schema)
  const url = new URL(connectionString)
  url.searchParams.set('options', `-c search_path=${schema}`)
  return url.toString()
}

export async function assertIsolatedSchema(pool, schema) {
  requireSafeSchema(schema)
  const { rows: [isolation] } = await pool.query(
    `SELECT current_schema() AS schema,
            current_setting('search_path') AS "searchPath"`,
  )
  if (isolation?.schema !== schema || isolation?.searchPath !== schema)
    throw new Error(`Refusing fixture writes outside ${schema}`)
}
