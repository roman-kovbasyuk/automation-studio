function mapIntegration(row) {
  return {
    platform: row.platform,
    status: row.status,
    destination: row.destination,
    lastCheckedAt: row.last_checked_at,
    updatedAt: row.updated_at,
  }
}

function mapNotifications(row) {
  return {
    slack: { enabled: row?.slack_enabled === true },
    discord: { enabled: row?.discord_enabled === true },
    projectScope: row?.project_scope ?? 'all',
    selectedProjectIds: row?.selected_project_ids ?? [],
    events: {
      anyProjectChange: row?.any_project_change === true,
      newImageGenerations: row?.new_image_generations !== false,
      newVideoGenerations: row?.new_video_generations !== false,
      approvalStatusChanged: row?.approval_status_changed !== false,
    },
    includeOwnChanges: row?.include_own_changes === true,
    digestInterval: row?.digest_interval ?? 'immediate',
    quietHours: row?.quiet_hours ?? {},
  }
}

export function createPersonalSettingsRepository(client) {
  if (!client || typeof client.query !== 'function') throw new TypeError('A PostgreSQL pool or client is required')
  return {
    async listIntegrations(userId) {
      const result = await client.query('SELECT platform, status, destination, last_checked_at, updated_at FROM personal_integrations WHERE user_id = $1 ORDER BY platform', [userId])
      const connected = new Map(result.rows.map((row) => [row.platform, mapIntegration(row)]))
      return ['slack', 'discord'].map((platform) => connected.get(platform) ?? { platform, status: 'not_connected' })
    },
    async getIntegration({ userId, platform }) {
      const result = await client.query('SELECT * FROM personal_integrations WHERE user_id = $1 AND platform = $2', [userId, platform])
      return result.rows[0] ?? null
    },
    async listUsers() {
      const result = await client.query('SELECT id FROM users WHERE disabled = false ORDER BY id')
      return result.rows.map((row) => row.id)
    },
    async upsertIntegration({ userId, platform, secret, destination, webhookUrl }) {
      const result = await client.query(
        `INSERT INTO personal_integrations (user_id, platform, key_version, iv, ciphertext, auth_tag, destination, webhook_url, status, last_checked_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'connected',now())
         ON CONFLICT (user_id, platform) DO UPDATE SET key_version=$3, iv=$4, ciphertext=$5, auth_tag=$6, destination=$7, webhook_url=$8, status='connected', last_checked_at=now(), updated_at=now()
         RETURNING platform, status, destination, last_checked_at, updated_at`,
        [userId, platform, secret.keyVersion, secret.iv, secret.ciphertext, secret.authTag, destination, webhookUrl],
      )
      return mapIntegration(result.rows[0])
    },
    async deleteIntegration({ userId, platform }) {
      await client.query('DELETE FROM personal_integrations WHERE user_id = $1 AND platform = $2', [userId, platform])
    },
    async getNotifications(userId) {
      const result = await client.query('SELECT * FROM personal_notification_preferences WHERE user_id = $1', [userId])
      return mapNotifications(result.rows[0])
    },
    async updateNotifications({ userId, preferences }) {
      const result = await client.query(
        `INSERT INTO personal_notification_preferences
          (user_id, slack_enabled, discord_enabled, project_scope, selected_project_ids, any_project_change, new_image_generations, new_video_generations, approval_status_changed, include_own_changes, digest_interval, quiet_hours)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (user_id) DO UPDATE SET slack_enabled=$2, discord_enabled=$3, project_scope=$4, selected_project_ids=$5, any_project_change=$6, new_image_generations=$7, new_video_generations=$8, approval_status_changed=$9, include_own_changes=$10, digest_interval=$11, quiet_hours=$12, updated_at=now()
         RETURNING *`,
        [userId, preferences.slack.enabled, preferences.discord.enabled, preferences.projectScope, JSON.stringify(preferences.selectedProjectIds), preferences.events.anyProjectChange, preferences.events.newImageGenerations, preferences.events.newVideoGenerations, preferences.events.approvalStatusChanged, preferences.includeOwnChanges, preferences.digestInterval, JSON.stringify(preferences.quietHours)],
      )
      return mapNotifications(result.rows[0])
    },
    async enqueueNotification({ id, userId, platform, eventType, dedupeKey, payload }) {
      const result = await client.query(
        `INSERT INTO personal_notification_outbox (id, user_id, platform, event_type, dedupe_key, payload)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (dedupe_key) DO NOTHING
         RETURNING id, user_id, platform, event_type, dedupe_key, payload, status, attempts, next_attempt_at`,
        [id, userId, platform, eventType, dedupeKey, JSON.stringify(payload)],
      )
      return result.rows[0] ?? null
    },
    async listDueNotifications(limit = 25) {
      const result = await client.query(
        `SELECT * FROM personal_notification_outbox
         WHERE status = 'pending' AND next_attempt_at <= now()
         ORDER BY created_at, id LIMIT $1 FOR UPDATE SKIP LOCKED`, [limit],
      )
      return result.rows
    },
    async markNotificationSent(id) {
      await client.query("UPDATE personal_notification_outbox SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = $1", [id])
    },
    async markNotificationFailed({ id, error }) {
      await client.query(
        `UPDATE personal_notification_outbox
         SET status = CASE WHEN attempts + 1 >= 5 THEN 'failed' ELSE 'pending' END,
             attempts = attempts + 1, last_error = $2, next_attempt_at = now() + interval '5 minutes', updated_at = now()
         WHERE id = $1`, [id, String(error ?? 'Delivery failed').slice(0, 500)],
      )
    },
  }
}
