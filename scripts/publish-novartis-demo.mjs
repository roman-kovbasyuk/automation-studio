import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { createPool } from '../server/db/pool.js'
import { createLocalDemoAssetStore } from '../server/storage/localDemoAssetStore.js'
import { createBrandDesignSystemService } from '../server/services/brandDesignSystemService.js'
import { createTemplateBrandService } from '../server/services/templateBrandService.js'

// Explicit local setup for the pitch library; never runs on production startup.
if (process.env.NODE_ENV === 'production' || process.env.K_SERVICE) throw new Error('Local demo setup only')

const pool = createPool({ connectionString: 'postgresql:///banner_studio_demo' })
const store = await createLocalDemoAssetStore({ directory: fileURLToPath(new URL('../.studio-demo-assets', import.meta.url)) })
const templates = createTemplateBrandService({ pool, assetStore: store })
const brands = createBrandDesignSystemService({ pool, assetStore: store, onPublish: templates.refresh })
const actor = { id: 'studio-demo-admin', role: 'admin', workspaceId: 'default' }

try {
  let brand = (await brands.list({ actor })).find(item => item.draft.name === 'Novartis')
  if (!brand) throw new Error('Run npm run setup:novartis first.')
  if (brand.state === 'published') {
    console.log(JSON.stringify({ brandId: brand.id, state: brand.state, version: brand.activeVersion?.versionNumber }, null, 2))
  } else {
    let logo = brand.draft.assets.find(asset => asset.kind === 'logo')
    if (!logo) {
      const bytes = await readFile(new URL('./fixtures/novartis/concept-wordmark.svg', import.meta.url))
      brand = await brands.addAsset({ actor, id: brand.id, expectedRevision: brand.revision, input: {
        name: 'Novartis concept wordmark.svg', kind: 'logo', mimeType: 'image/svg+xml', data: bytes.toString('base64'),
      } })
      logo = brand.draft.assets.find(asset => asset.kind === 'logo')
    }
    const draft = {
      ...brand.draft,
      currentStep: 'publish',
      assets: brand.draft.assets.map(asset => asset.id === logo.id ? { ...asset, approved: true } : asset),
      logoRoles: { ...brand.draft.logoRoles, primary: logo.id },
      typography: { ...brand.draft.typography, licenseConfirmed: true },
    }
    brand = await brands.patchDraft({ actor, id: brand.id, expectedRevision: brand.revision, draft })
    brand = await brands.publish({ actor, id: brand.id, expectedRevision: brand.revision, idempotencyKey: 'novartis-pitch-initial-2026-09-15' })
    for (const userId of ['studio-demo-marketer', 'studio-demo-designer']) await brands.grantViewer({ actor, id: brand.id, userId })
    console.log(JSON.stringify({ brandId: brand.id, state: brand.state, version: brand.activeVersion?.versionNumber, logo: logo.name }, null, 2))
  }
} finally {
  await store.close()
  await pool.end()
}
