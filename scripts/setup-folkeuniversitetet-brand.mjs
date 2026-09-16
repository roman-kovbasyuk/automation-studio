import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { createPool } from '../server/db/pool.js'
import { createLocalDemoAssetStore } from '../server/storage/localDemoAssetStore.js'
import { createBrandDesignSystemService } from '../server/services/brandDesignSystemService.js'
import { createTemplateBrandService } from '../server/services/templateBrandService.js'
import { getBrandReadiness } from '../shared/brandDesignSystem.js'
import { createFolkeuniversitetetBrandDraft, folkeuniversitetetFigma, folkeuniversitetetWebsite } from '../shared/folkeuniversitetetBrand.js'

// Explicit local setup; never runs on production startup or overwrites an existing brand.
if (process.env.NODE_ENV === 'production' || process.env.K_SERVICE) throw new Error('Local demo setup only')

const pool = createPool({ connectionString: 'postgresql:///banner_studio_demo' })
const store = await createLocalDemoAssetStore({ directory: fileURLToPath(new URL('../.studio-demo-assets', import.meta.url)) })
const templates = createTemplateBrandService({ pool, assetStore: store })
const brands = createBrandDesignSystemService({ pool, assetStore: store, onPublish: templates.refresh })
const actor = { id: 'studio-demo-admin', role: 'admin', workspaceId: 'default' }

try {
  let brand = (await brands.list({ actor })).find(item => item.draft.name === 'Folkeuniversitetet')
  if (!brand) {
    brand = await brands.create({ actor, input: { name: 'Folkeuniversitetet' } })
    const source = Buffer.from(JSON.stringify({
      figma: folkeuniversitetetFigma,
      website: folkeuniversitetetWebsite,
      inspected: '2026-09-08',
      palette: ['#FF3F2E', '#FFC6B6', '#BA0C2F', '#00205B', '#FFE2D9', '#941962', '#FF285C'],
      displayFont: 'Matter',
      utilityFont: 'Matter Mono',
      bodyFont: 'Inter',
      licenseStatus: 'Matter and Matter Mono require licensed font files before publishing.',
    }, null, 2))
    brand = await brands.addSource({ actor, id: brand.id, expectedRevision: brand.revision, input: {
      kind: 'file', name: 'Folkeuniversitetet Figma token provenance.json', mimeType: 'application/json', data: source.toString('base64'),
    } })
    const bytes = await readFile(new URL('./fixtures/folkeuniversitetet/logo.svg', import.meta.url))
    brand = await brands.addAsset({ actor, id: brand.id, expectedRevision: brand.revision, input: {
      name: 'Folkeuniversitetet primary logo.svg', kind: 'logo', mimeType: 'image/svg+xml', data: bytes.toString('base64'),
    } })
    const draft = createFolkeuniversitetetBrandDraft({
      assets: brand.draft.assets.map(asset => ({ ...asset, approved: true })),
      sources: brand.draft.sources,
    })
    brand = await brands.patchDraft({ actor, id: brand.id, expectedRevision: brand.revision, draft })
  }

  console.log(JSON.stringify({
    brandId: brand.id,
    state: brand.state,
    currentStep: brand.draft.currentStep,
    readiness: getBrandReadiness(brand.draft),
    colors: brand.draft.colors.palette.map(token => `${token.name} ${token.value}`),
    typography: { heading: brand.draft.typography.heading.family, body: brand.draft.typography.body.family },
  }, null, 2))
} finally {
  await store.close()
  await pool.end()
}
