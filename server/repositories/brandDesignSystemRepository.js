function mapVersion(row) {
  if (!row) return null
  return {
    id: row.id,
    brandId: row.brand_id,
    versionNumber: row.version_number,
    snapshot: row.snapshot,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
    schemaVersion: row.schema_version,
  }
}

function mapBrand(row) {
  if (!row) return null
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    state: row.state,
    revision: row.revision,
    activeVersionId: row.active_version_id,
    draft: row.draft,
    activeVersion: mapVersion(row.active_version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapProposal(row) {
  if (!row) return null
  return {
    id: row.id,
    brandId: row.brand_id,
    baseRevision: row.base_revision,
    prompt: row.prompt,
    operations: row.operations,
    unchanged: row.unchanged,
    state: row.state,
    createdAt: row.created_at,
  }
}

function mapAsset(row) {
  if (!row) return null
  return {
    id: row.id,
    brandId: row.brand_id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    brandState: row.brand_state,
    activeSnapshot: row.active_snapshot,
    name: row.name,
    kind: row.kind,
    mimeType: row.mime_type,
    objectKey: row.object_key,
    byteSize: Number(row.byte_size),
    checksum: row.checksum,
  }
}

const brandSelect = `SELECT b.*,
  (SELECT row_to_json(v) FROM brand_design_system_versions v WHERE v.id = b.active_version_id) active_version
  FROM brand_design_systems b`

export class BrandRevisionConflictError extends Error {
  constructor(id, expectedRevision) {
    super(`Brand ${id} is not at revision ${expectedRevision}`)
    this.name = 'BrandRevisionConflictError'
    this.code = 'revision_conflict'
  }
}

export function createBrandDesignSystemRepository(client) {
  if (!client || typeof client.query !== 'function') throw new TypeError('A PostgreSQL pool or client is required')

  return {
    async list(workspaceId) {
      const result = await client.query(`${brandSelect} WHERE b.workspace_id = $1 AND b.state <> 'archived' ORDER BY b.updated_at DESC`, [workspaceId])
      return result.rows.map(mapBrand)
    },
    async listForMember(userId) {
      const result = await client.query(
        `${brandSelect} JOIN brand_design_system_members m ON m.brand_id = b.id
         WHERE m.user_id = $1 AND b.state = 'published' ORDER BY b.updated_at DESC`, [userId],
      )
      return result.rows.map(mapBrand)
    },
    async get(id, workspaceId) {
      const result = await client.query(`${brandSelect} WHERE b.id = $1 AND b.workspace_id = $2 AND b.state <> 'archived'`, [id, workspaceId])
      return mapBrand(result.rows[0])
    },
    async getForMember(id, userId) {
      const result = await client.query(
        `${brandSelect} JOIN brand_design_system_members m ON m.brand_id = b.id
         WHERE b.id = $1 AND m.user_id = $2 AND b.state = 'published'`, [id, userId],
      )
      return mapBrand(result.rows[0])
    },
    async grantMember({ brandId, userId }) {
      await client.query(
        `INSERT INTO brand_design_system_members (brand_id, user_id, access_level)
         VALUES ($1, $2, 'viewer') ON CONFLICT (brand_id, user_id) DO UPDATE SET access_level = EXCLUDED.access_level`,
        [brandId, userId],
      )
    },
    async getForUpdate(id, workspaceId) {
      const result = await client.query('SELECT * FROM brand_design_systems WHERE id = $1 AND workspace_id = $2 AND state <> $3 FOR UPDATE', [id, workspaceId, 'archived'])
      return mapBrand(result.rows[0])
    },
    async create({ id, workspaceId, ownerId, draft }) {
      const result = await client.query(
        `INSERT INTO brand_design_systems (id, workspace_id, owner_id, draft)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [id, workspaceId, ownerId, draft],
      )
      await client.query(
        `INSERT INTO brand_design_system_members (brand_id, user_id, access_level)
         VALUES ($1, $2, 'owner') ON CONFLICT (brand_id, user_id) DO NOTHING`, [id, ownerId],
      )
      return mapBrand({ ...result.rows[0], active_version: null })
    },
    async patchDraft({ id, workspaceId, expectedRevision, draft }) {
      const result = await client.query(
        `UPDATE brand_design_systems SET draft = $4, revision = revision + 1, updated_at = now()
         WHERE id = $1 AND workspace_id = $2 AND revision = $3 AND state <> 'archived'
         RETURNING *, (SELECT row_to_json(v) FROM brand_design_system_versions v WHERE v.id = active_version_id) active_version`,
        [id, workspaceId, expectedRevision, draft],
      )
      if (result.rowCount) return mapBrand(result.rows[0])
      const existing = await client.query('SELECT revision FROM brand_design_systems WHERE id = $1 AND workspace_id = $2', [id, workspaceId])
      if (existing.rowCount) throw new BrandRevisionConflictError(id, expectedRevision)
      return null
    },
    async replaceSources({ brandId, sources }) {
      await client.query('DELETE FROM brand_design_system_sources WHERE brand_id = $1', [brandId])
      for (const source of sources) {
        await client.query(
          `INSERT INTO brand_design_system_sources
            (id, brand_id, kind, label, source_url, mime_type, byte_size, object_key, checksum, status, evidence)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [source.id, brandId, source.kind, source.label, source.url ?? null, source.mimeType ?? null,
            source.byteSize ?? null, source.objectKey ?? null, source.checksum ?? null, source.status, source.evidence ?? {}],
        )
      }
      return sources
    },
    async publish({ id, workspaceId, versionId, versionNumber, snapshot, publishedBy, expectedRevision }) {
      const inserted = await client.query(
        `INSERT INTO brand_design_system_versions (id, brand_id, version_number, snapshot, published_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [versionId, id, versionNumber, snapshot, publishedBy],
      )
      const result = await client.query(
        `UPDATE brand_design_systems SET state = 'published', active_version_id = $4, draft = $5,
           revision = revision + 1, updated_at = now()
         WHERE id = $1 AND workspace_id = $2 AND revision = $3 RETURNING *`,
        [id, workspaceId, expectedRevision, versionId, snapshot],
      )
      if (!result.rowCount) throw new BrandRevisionConflictError(id, expectedRevision)
      return mapBrand({ ...result.rows[0], active_version: inserted.rows[0] })
    },
    async findPublication(id, key) {
      const result = await client.query(
        `SELECT b.*, p.version_id active_version_id, row_to_json(v) active_version
         FROM brand_design_systems b
         JOIN brand_design_system_publication_requests p ON p.brand_id = b.id
         JOIN brand_design_system_versions v ON v.id = p.version_id AND v.brand_id = b.id
         WHERE b.id = $1 AND p.idempotency_key = $2`, [id, key],
      )
      return mapBrand(result.rows[0])
    },
    async recordPublication({ id, key, versionId }) {
      await client.query(
        'INSERT INTO brand_design_system_publication_requests (brand_id, idempotency_key, version_id) VALUES ($1, $2, $3)',
        [id, key, versionId],
      )
    },
    async listVersions(id) {
      const result = await client.query('SELECT * FROM brand_design_system_versions WHERE brand_id = $1 ORDER BY version_number DESC', [id])
      return result.rows.map(mapVersion)
    },
    async listSources(brandId) {
      const result = await client.query('SELECT * FROM brand_design_system_sources WHERE brand_id = $1', [brandId])
      return result.rows.map((row) => ({ id: row.id, brandId: row.brand_id, kind: row.kind, label: row.label,
        url: row.source_url, mimeType: row.mime_type, byteSize: row.byte_size == null ? undefined : Number(row.byte_size), status: row.status,
        error: row.error_message ?? undefined }))
    },
    async listAssets(brandId) {
      const result = await client.query('SELECT * FROM brand_design_system_assets WHERE brand_id = $1', [brandId])
      return result.rows.map(mapAsset)
    },
    async getVersion(id, brandId) {
      const result = await client.query('SELECT * FROM brand_design_system_versions WHERE id = $1 AND brand_id = $2', [id, brandId])
      return mapVersion(result.rows[0])
    },
    async restoreVersion({ id, brandId, workspaceId, expectedRevision, versionId }) {
      const version = await this.getVersion(versionId, brandId)
      if (!version) return null
      return this.patchDraft({ id, workspaceId, expectedRevision, draft: version.snapshot })
    },
    async createProposal({ id, brandId, baseRevision, prompt, operations, unchanged, createdBy }) {
      const result = await client.query(
        `INSERT INTO brand_design_system_proposals (id, brand_id, base_revision, prompt, operations, unchanged, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, brandId, baseRevision, prompt, operations, unchanged, createdBy],
      )
      return mapProposal(result.rows[0])
    },
    async recordSource({ id, brandId, kind, label, url = null, mimeType = null, byteSize = null, objectKey = null, checksum = null, status, evidence = {}, error = null }) {
      await client.query(
        `INSERT INTO brand_design_system_sources
          (id, brand_id, kind, label, source_url, mime_type, byte_size, object_key, checksum, status, evidence, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [id, brandId, kind, label, url, mimeType, byteSize, objectKey, checksum, status, evidence, error],
      )
    },
    async recordAsset({ id, brandId, sourceId = null, name, kind, mimeType, objectKey, byteSize, checksum, metadata = {} }) {
      await client.query(
        `INSERT INTO brand_design_system_assets
          (id, brand_id, source_id, name, kind, mime_type, object_key, byte_size, checksum, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, brandId, sourceId, name, kind, mimeType, objectKey, byteSize, checksum, metadata],
      )
    },
    async getAsset(id, workspaceId) {
      const result = await client.query(
        `SELECT a.*, b.workspace_id, b.owner_id, b.state brand_state, v.snapshot active_snapshot
         FROM brand_design_system_assets a
         JOIN brand_design_systems b ON b.id = a.brand_id
         LEFT JOIN brand_design_system_versions v ON v.id = b.active_version_id
         WHERE a.id = $1 AND b.workspace_id = $2 AND b.state <> 'archived'`,
        [id, workspaceId],
      )
      return mapAsset(result.rows[0])
    },
    async getProposal(id, brandId) {
      const result = await client.query('SELECT * FROM brand_design_system_proposals WHERE id = $1 AND brand_id = $2', [id, brandId])
      return mapProposal(result.rows[0])
    },
    async resolveProposal({ id, brandId, state }) {
      const result = await client.query(
        `UPDATE brand_design_system_proposals SET state = $3, resolved_at = now()
         WHERE id = $1 AND brand_id = $2 AND state = 'proposed' RETURNING *`, [id, brandId, state],
      )
      return mapProposal(result.rows[0])
    },
    async createAIJob({ id, brandId, operation, inputRevision, inputHash, policyVersion, provider, model,
      estimatedUsd = null, approvalFingerprint = null, status = 'running', createdBy }) {
      await client.query(
        `INSERT INTO brand_design_system_ai_jobs
          (id, brand_id, operation, input_revision, input_hash, policy_version, provider, model,
           estimated_usd, approval_fingerprint, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [id, brandId, operation, inputRevision, inputHash, policyVersion, provider, model,
          estimatedUsd, approvalFingerprint, status, createdBy],
      )
    },
    async resolveAIJob({ id, status, usage = {}, errorCode = null }) {
      await client.query(
        `UPDATE brand_design_system_ai_jobs
         SET status = $2, usage = $3, error_code = $4, updated_at = now()
         WHERE id = $1`,
        [id, status, usage, errorCode],
      )
    },
  }
}
