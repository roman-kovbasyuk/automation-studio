import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { createPool } from '../server/db/pool.js'
import { createLocalDemoAssetStore } from '../server/storage/localDemoAssetStore.js'
import { createBrandDesignSystemService } from '../server/services/brandDesignSystemService.js'
import { createTemplateBrandService } from '../server/services/templateBrandService.js'
import { createMsdBrandDraft, msdReference } from '../shared/msdBrand.js'

// Explicit local setup; never runs on production startup or overwrites an existing MSD record.
if (process.env.NODE_ENV === 'production' || process.env.K_SERVICE) throw new Error('Local demo setup only')
const pool = createPool({ connectionString: 'postgresql:///banner_studio_demo' })
const store = await createLocalDemoAssetStore({ directory: fileURLToPath(new URL('../.studio-demo-assets', import.meta.url)) })
const templates = createTemplateBrandService({ pool, assetStore: store })
const brands = createBrandDesignSystemService({ pool, assetStore: store, onPublish: templates.refresh })
const actor = { id: 'studio-demo-admin', role: 'admin', workspaceId: 'default' }
try {
  let brand = (await brands.list({ actor })).find(item => item.draft.name === 'MSD')
  if (!brand) {
    brand = await brands.create({ actor, input: { name: 'MSD' } })
    const source = Buffer.from(JSON.stringify({ reference: msdReference, inspected: '2026-09-08',
      websiteFontStack: ['Arial', 'Helvetica Neue', 'Helvetica', 'sans-serif'], renderFont: 'Arimo', license: 'SIL Open Font License 1.1',
      logoColor: '#008876', source: 'User-supplied transparent MSD logo', supportingTint: '#E5F3F1 (derived)' }, null, 2))
    brand = await brands.addSource({ actor, id: brand.id, expectedRevision: brand.revision, input: { kind: 'file', name: 'MSD reference and token provenance.json', mimeType: 'application/json', data: source.toString('base64') } })
    for (const [name, kind, mimeType, path] of [
      ['MSD primary logo.png', 'logo', 'image/png', './fixtures/msd/logo.png'],
      ['Arimo · OFL.ttf', 'font', 'font/ttf', '../shared/fonts/Arimo.ttf'],
    ]) {
      const bytes = await readFile(new URL(path, import.meta.url))
      brand = await brands.addAsset({ actor, id: brand.id, expectedRevision: brand.revision, input: { name, kind, mimeType, data: bytes.toString('base64') } })
    }
    const draft = createMsdBrandDraft({ assets: brand.draft.assets.map(asset => ({ ...asset, approved: true })), sources: brand.draft.sources })
    brand = await brands.patchDraft({ actor, id: brand.id, expectedRevision: brand.revision, draft })
    brand = await brands.publish({ actor, id: brand.id, expectedRevision: brand.revision, idempotencyKey: 'msd-initial-system-2026-09-08' })
  }
  if (brand.state !== 'published') throw new Error('An MSD draft already exists. Review and publish it before assignment.')
  for (const userId of ['studio-demo-marketer', 'studio-demo-designer']) await brands.grantViewer({ actor, id: brand.id, userId })
  const assigned = await templates.assign({ actor, brandId: brand.id, templateIds: ['editorial-split', 'product-spotlight', 'bold-announcement'] })
  console.log(JSON.stringify({ brandId: brand.id, brandVersion: brand.activeVersion.versionNumber,
    templates: assigned.map(item => ({ id: item.id, version: item.version, brand: item.manifest.brand.name })) }))
} finally { await store.close(); await pool.end() }
