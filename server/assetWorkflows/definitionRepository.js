const iso = (value) => new Date(value).toISOString()
export function versionMetadata(row) {
  return {
    id: row.id,
    version: row.version,
    hash: row.hash,
    changeNote: row.change_note,
    createdAt: iso(row.created_at),
  }
}
export function createDefinitionRepository(client) {
  return {
    async list() {
      return (
        await client.query(
          'SELECT * FROM asset_workflows ORDER BY updated_at DESC, id DESC',
        )
      ).rows
    },
    async find(id, lock = false) {
      return (
        await client.query(
          `SELECT * FROM asset_workflows WHERE id=$1${lock ? ' FOR UPDATE' : ''}`,
          [id],
        )
      ).rows[0]
    },
    async versions(id) {
      return (
        await client.query(
          'SELECT id, version, hash, change_note, created_at FROM asset_workflow_versions WHERE workflow_id=$1 ORDER BY version DESC',
          [id],
        )
      ).rows.map(versionMetadata)
    },
    async version(id, versionId) {
      return (
        await client.query(
          'SELECT * FROM asset_workflow_versions WHERE workflow_id=$1 AND id=$2',
          [id, versionId],
        )
      ).rows[0]
    },
    async publication(id, key) {
      return (
        await client.query(
          'SELECT * FROM asset_workflow_versions WHERE workflow_id=$1 AND idempotency_key=$2',
          [id, key],
        )
      ).rows[0]
    },
    async create({ id, input, hash, ignoreDuplicate = false }) {
      return (
        await client.query(
          `INSERT INTO asset_workflows (id,key,asset_type,title,draft,draft_hash) VALUES ($1,$2,$3,$4,$5,$6) ${ignoreDuplicate ? 'ON CONFLICT (key) DO NOTHING' : ''} RETURNING *`,
          [id, input.key, input.assetType, input.title, input.draft, hash],
        )
      ).rows[0]
    },
    async save(id, draft, hash) {
      return (
        await client.query(
          'UPDATE asset_workflows SET draft=$2, draft_hash=$3, draft_revision=draft_revision+1, updated_at=now() WHERE id=$1 RETURNING *',
          [id, draft, hash],
        )
      ).rows[0]
    },
    async publish({ id, versionId, row, input, requestHash }) {
      return (
        await client.query(
          `INSERT INTO asset_workflow_versions (id,workflow_id,version,definition,hash,draft_revision,change_note,idempotency_key,request_hash)
      SELECT $1,$2,COALESCE(MAX(version),0)+1,$3,$4,$5,$6,$7,$8 FROM asset_workflow_versions WHERE workflow_id=$2 RETURNING *`,
          [
            versionId,
            id,
            row.draft,
            row.draft_hash,
            row.draft_revision,
            input.changeNote,
            input.idempotencyKey,
            requestHash,
          ],
        )
      ).rows[0]
    },
    async activate(id, versionId) {
      return (
        await client.query(
          'UPDATE asset_workflows SET active_version_id=$2, updated_at=now() WHERE id=$1 RETURNING *',
          [id, versionId],
        )
      ).rows[0]
    },
    async detail(row) {
      return {
        id: row.id,
        key: row.key,
        assetType: row.asset_type,
        title: row.title,
        draft: row.draft,
        draftRevision: row.draft_revision,
        draftHash: row.draft_hash,
        activeVersionId: row.active_version_id,
        versions: await this.versions(row.id),
        updatedAt: iso(row.updated_at),
      }
    },
  }
}
