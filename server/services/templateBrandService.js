import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { withTransaction } from '../db/pool.js'
import { createBrandDesignSystemRepository } from '../repositories/brandDesignSystemRepository.js'
import { createTemplateRepository } from '../repositories/templateRepository.js'
import { resolveTemplateBrand } from '../../shared/resolveTemplateBrand.js'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { PublicApiError } from '../routes/support.js'

const reject = (status, code, message) => { throw new PublicApiError(status, code, message) }
const nextVersion = version => { const [major, minor, patch] = version.match(/^(\d+)\.(\d+)\.(\d+)/).slice(1).map(Number); return `${major}.${minor}.${patch + 1}` }

export function createTemplateBrandService({ pool, assetStore, transaction = withTransaction,
  brandRepository = createBrandDesignSystemRepository, templateRepository = createTemplateRepository }) {
  async function logoData(client, brand) {
    const snapshot = brand.activeVersion?.snapshot
    const logo = snapshot?.assets.find(asset => asset.id === snapshot.logoRoles.primary && asset.kind === 'logo' && asset.approved)
    if (!logo) reject(422, 'brand_not_ready', 'Publish a brand with an approved primary logo first.')
    const asset = await brandRepository(client).getAsset(logo.id, brand.workspaceId)
    if (!asset || asset.brandId !== brand.id) reject(422, 'brand_asset_missing', 'The approved logo is unavailable.')
    const bytes = await assetStore?.get({ objectKey: asset.objectKey })
    if (!bytes || bytes.length !== asset.byteSize || createHash('sha256').update(bytes).digest('hex') !== asset.checksum) {
      reject(422, 'brand_asset_unavailable', 'The approved logo could not be verified.')
    }
    // Only raster data reaches manifests. No SVG markup or remote asset URL can execute in previews.
    const png = await sharp(bytes, { limitInputPixels: 40_000_000 }).resize({ width: 1200, height: 600, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
    if (png.length > 500000) reject(422, 'brand_logo_too_large', 'Use a smaller logo for banner templates.')
    return `data:image/png;base64,${png.toString('base64')}`
  }
  async function writeAssignments(client, brand, actor, ids) {
    const repository = templateRepository(client)
    // Serialize different brand assignments to the same template without blocking unrelated layouts.
    for (const id of [...ids].sort()) await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`template-brand:${id}`])
    const latest = await repository.listLatest()
    const selected = ids.map(id => {
      const template = latest.find(item => item.id === id)
      if (!template) reject(404, 'template_not_found', 'A selected template was not found.')
      return template
    })
    if (!selected.length) return []
    const pending = selected.filter(item => item.manifest.brand?.versionId !== brand.activeVersion.id || item.manifest.brand?.systemId !== brand.id)
    if (!pending.length) return selected
    const dataUrl = await logoData(client, brand)
    const results = []
    for (const template of selected) {
      if (!pending.includes(template)) { results.push(template); continue }
      let manifest
      try { manifest = resolveTemplateBrand(template.manifest, brand.activeVersion, dataUrl) }
      catch (error) { reject(422, 'brand_template_incompatible', error.message) }
      manifest.version = nextVersion(template.version)
      results.push(await repository.createVersion({ id: template.id, name: template.name, version: manifest.version,
        manifest, manifestHash: hashCanonical(manifest), createdBy: actor.id }))
    }
    return results
  }
  return {
    async assign({ actor, brandId, templateIds }) {
      if (actor?.role !== 'admin' || !actor.workspaceId) reject(403, 'forbidden', 'Only an administrator can assign brands to the shared template catalog.')
      if (!Array.isArray(templateIds) || !templateIds.length || templateIds.length > 50 || new Set(templateIds).size !== templateIds.length || templateIds.some(id => typeof id !== 'string' || !id.trim())) reject(400, 'invalid_request', 'Choose unique template IDs.')
      return transaction(pool, async client => {
        const brands = brandRepository(client)
        await brands.getForUpdate(brandId, actor.workspaceId)
        const brand = await brands.get(brandId, actor.workspaceId)
        if (!brand || brand.state !== 'published' || !brand.activeVersion) reject(422, 'brand_not_published', 'Choose an available published brand system.')
        return writeAssignments(client, brand, actor, templateIds)
      })
    },
    async refresh({ client, brand, actor }) {
      const latest = await templateRepository(client).listLatest()
      const ids = latest.filter(item => item.manifest.brand?.systemId === brand.id).map(item => item.id)
      if (!ids.length) return []
      // Recheck after locking: another brand assignment may have won while the lock was awaited.
      for (const id of [...ids].sort()) await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`template-brand:${id}`])
      const current = await templateRepository(client).listLatest()
      return writeAssignments(client, brand, actor, current.filter(item => ids.includes(item.id) && item.manifest.brand?.systemId === brand.id).map(item => item.id))
    },
  }
}
