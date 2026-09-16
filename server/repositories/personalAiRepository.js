function mapConnection(row) {
  return {
    provider: row.provider,
    status: row.status ?? 'connected',
    maskedSuffix: row.masked_suffix,
    lastCheckedAt: row.last_checked_at ?? row.updated_at,
    ...(row.last_error ? { lastError: row.last_error } : {}),
    updatedAt: row.updated_at,
  }
}

function mapDefaults(row) {
  return row ?? { text_provider: null, text_model: null, text_secondary_provider: null, text_secondary_model: null, image_provider: null, image_model: null, image_secondary_provider: null, image_secondary_model: null }
}

function mapCredential(row) {
  if (!row) return null
  return { ...row, keyVersion: row.key_version, authTag: row.auth_tag }
}

export function createPersonalAiRepository(client) {
  if (!client || typeof client.query !== 'function') throw new TypeError('A PostgreSQL pool or client is required')
  return {
    async listConnections(userId) {
      const result = await client.query('SELECT provider, status, masked_suffix, last_checked_at, last_error, updated_at FROM personal_provider_credentials WHERE user_id = $1 ORDER BY provider', [userId])
      const connected = new Map(result.rows.map(row => [row.provider, mapConnection(row)]))
      return ['anthropic', 'openai', 'google', 'openrouter'].map(provider => connected.get(provider) ?? { provider, status: 'not_connected' })
    },
    async getConnection({ userId, provider }) {
      const result = await client.query('SELECT * FROM personal_provider_credentials WHERE user_id = $1 AND provider = $2', [userId, provider])
      return mapCredential(result.rows[0])
    },
    async getDefaults(userId) {
      const result = await client.query('SELECT text_provider, text_model, text_secondary_provider, text_secondary_model, image_provider, image_model, image_secondary_provider, image_secondary_model FROM personal_ai_defaults WHERE user_id = $1', [userId])
      const row = mapDefaults(result.rows[0])
      return { textProvider: row.text_provider, textModel: row.text_model, textSecondaryProvider: row.text_secondary_provider, textSecondaryModel: row.text_secondary_model, imageProvider: row.image_provider, imageModel: row.image_model, imageSecondaryProvider: row.image_secondary_provider, imageSecondaryModel: row.image_secondary_model }
    },
    async upsertConnection({ userId, provider, envelope, maskedSuffix }) {
      const result = await client.query(
        `INSERT INTO personal_provider_credentials (user_id, provider, key_version, iv, ciphertext, auth_tag, masked_suffix, status, last_checked_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'connected',now())
         ON CONFLICT (user_id, provider) DO UPDATE SET key_version=$3, iv=$4, ciphertext=$5, auth_tag=$6, masked_suffix=$7, credential_version=personal_provider_credentials.credential_version + 1, status='connected', last_checked_at=now(), last_error=NULL, updated_at=now()
         RETURNING provider, status, masked_suffix, last_checked_at, last_error, updated_at`,
        [userId, provider, envelope.keyVersion, envelope.iv, envelope.ciphertext, envelope.authTag, maskedSuffix],
      )
      return mapConnection(result.rows[0])
    },
    async markConnectionCheck({ userId, provider, status, error = null }) {
      const result = await client.query(
        `UPDATE personal_provider_credentials
         SET status = $3, last_checked_at = now(), last_error = $4, updated_at = now()
         WHERE user_id = $1 AND provider = $2
         RETURNING provider, status, masked_suffix, last_checked_at, last_error, updated_at`,
        [userId, provider, status, error ? String(error).slice(0, 500) : null],
      )
      return mapConnection(result.rows[0])
    },
    async deleteConnection({ userId, provider }) {
      const run = async (queryClient) => {
        await queryClient.query('DELETE FROM personal_provider_credentials WHERE user_id = $1 AND provider = $2', [userId, provider])
        await queryClient.query('UPDATE personal_ai_defaults SET text_provider = NULL, text_model = NULL WHERE user_id = $1 AND text_provider = $2', [userId, provider])
        await queryClient.query('UPDATE personal_ai_defaults SET text_secondary_provider = NULL, text_secondary_model = NULL WHERE user_id = $1 AND text_secondary_provider = $2', [userId, provider])
        await queryClient.query('UPDATE personal_ai_defaults SET image_provider = NULL, image_model = NULL WHERE user_id = $1 AND image_provider = $2', [userId, provider])
        await queryClient.query('UPDATE personal_ai_defaults SET image_secondary_provider = NULL, image_secondary_model = NULL WHERE user_id = $1 AND image_secondary_provider = $2', [userId, provider])
      }
      if (typeof client.connect !== 'function') return run(client)
      const connection = await client.connect()
      try {
        await connection.query('BEGIN')
        await run(connection)
        await connection.query('COMMIT')
      } catch (error) {
        await connection.query('ROLLBACK').catch(() => {})
        throw error
      } finally {
        connection.release()
      }
    },
    async updateDefaults({ userId, textProvider, textModel, textSecondaryProvider, textSecondaryModel, imageProvider, imageModel, imageSecondaryProvider, imageSecondaryModel }) {
      const current = await this.getDefaults(userId)
      const nextTextProvider = textProvider === undefined ? current.textProvider : textProvider
      const nextTextModel = textModel === undefined ? current.textModel : textModel
      const nextTextSecondaryProvider = textSecondaryProvider === undefined ? current.textSecondaryProvider : textSecondaryProvider
      const nextTextSecondaryModel = textSecondaryModel === undefined ? current.textSecondaryModel : textSecondaryModel
      const nextImageProvider = imageProvider === undefined ? current.imageProvider : imageProvider
      const nextImageModel = imageModel === undefined ? current.imageModel : imageModel
      const nextImageSecondaryProvider = imageSecondaryProvider === undefined ? current.imageSecondaryProvider : imageSecondaryProvider
      const nextImageSecondaryModel = imageSecondaryModel === undefined ? current.imageSecondaryModel : imageSecondaryModel
      await client.query(
        `INSERT INTO personal_ai_defaults (user_id, text_provider, text_model, text_secondary_provider, text_secondary_model, image_provider, image_model, image_secondary_provider, image_secondary_model)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (user_id) DO UPDATE SET text_provider=$2, text_model=$3, text_secondary_provider=$4, text_secondary_model=$5, image_provider=$6, image_model=$7, image_secondary_provider=$8, image_secondary_model=$9, updated_at=now()`,
        [userId, nextTextProvider, nextTextModel, nextTextSecondaryProvider, nextTextSecondaryModel, nextImageProvider, nextImageModel, nextImageSecondaryProvider, nextImageSecondaryModel],
      )
    },
  }
}
