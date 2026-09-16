import { fileURLToPath } from 'node:url'
import { createPool } from '../server/db/pool.js'
import { createLocalDemoAssetStore } from '../server/storage/localDemoAssetStore.js'
import { createBrandDesignSystemService } from '../server/services/brandDesignSystemService.js'
import { createTemplateBrandService } from '../server/services/templateBrandService.js'
import { getBrandReadiness } from '../shared/brandDesignSystem.js'
import { createNovartisBrandDraft, novartisReference } from '../shared/novartisBrand.js'

// Explicit local setup; never runs on production startup or overwrites an existing brand.
if (process.env.NODE_ENV === 'production' || process.env.K_SERVICE) throw new Error('Local demo setup only')

const pool = createPool({ connectionString: 'postgresql:///banner_studio_demo' })
const store = await createLocalDemoAssetStore({ directory: fileURLToPath(new URL('../.studio-demo-assets', import.meta.url)) })
const templates = createTemplateBrandService({ pool, assetStore: store })
const brands = createBrandDesignSystemService({ pool, assetStore: store, onPublish: templates.refresh })
const actor = { id: 'studio-demo-admin', role: 'admin', workspaceId: 'default' }

try {
  let brand = (await brands.list({ actor })).find(item => item.draft.name === 'Novartis')
  if (!brand) {
    brand = await brands.create({ actor, input: { name: 'Novartis' } })
    const provenance = Buffer.from(JSON.stringify({
      reference: novartisReference,
      inspected: '2026-09-15',
      note: 'Concept reconstruction from the supplied cardiovascular campaign board. Palette, type scale, and graphic parameters are visual inference until Novartis brand approval.',
      typeface: 'Inter (requested for the pitch system)',
      logo: 'Awaiting an approved Novartis logo asset before publishing.',
    }, null, 2))
    brand = await brands.addSource({ actor, id: brand.id, expectedRevision: brand.revision, input: {
      kind: 'file', name: 'Novartis concept token provenance.json', mimeType: 'application/json', data: provenance.toString('base64'),
    } })
    const draft = createNovartisBrandDraft({ sources: brand.draft.sources })
    brand = await brands.patchDraft({ actor, id: brand.id, expectedRevision: brand.revision, draft })
  }

  console.log(JSON.stringify({
    brandId: brand.id,
    state: brand.state,
    currentStep: brand.draft.currentStep,
    readiness: getBrandReadiness(brand.draft),
    templates: brand.draft.campaignKit?.templates ?? [],
  }, null, 2))
} finally {
  await store.close()
  await pool.end()
}
