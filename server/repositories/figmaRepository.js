export function mapHandoff(row) {
  if (!row) return null
  return { id:row.id,versionId:row.version_id,campaignId:row.campaign_id,fileKey:row.file_key,
    sourceHash:row.source_hash,packageHash:row.package_hash,state:row.state,leaseGeneration:row.lease_generation,
    pageId:row.page_id,mappings:row.mappings,createdAt:new Date(row.created_at).toISOString(),importedAt:row.imported_at ? new Date(row.imported_at).toISOString() : null,
    figmaUrl:row.page_id ? `https://www.figma.com/design/${row.file_key}?node-id=${row.page_id.replace(':','-')}` : `https://www.figma.com/design/${row.file_key}` }
}
export function createFigmaRepository(client) {
  return {
    async findByVersion(id) { return (await client.query('SELECT * FROM figma_handoffs WHERE version_id=$1',[id])).rows[0] ?? null },
    async findById(id,{lock=false}={}) { return (await client.query(`SELECT * FROM figma_handoffs WHERE id=$1${lock?' FOR UPDATE':''}`,[id])).rows[0] ?? null },
    async insert({ id,version,campaign,actor,fileKey,pkg }) {
      return (await client.query(`INSERT INTO figma_handoffs (id,version_id,campaign_id,created_by,file_key,source_hash,package_hash,scene_package)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[id,version.id,campaign.id,actor.id,fileKey,version.contentHash,pkg.packageHash,pkg])).rows[0]
    },
  }
}
