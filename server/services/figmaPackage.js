import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { campaignVersionRecordSchema } from '../../shared/contracts.js'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { figmaPackageSchema, hashFigmaPackage } from '../../shared/figmaContracts.js'
import { compileRenderSlotProvenance } from '../rendering/inProcessRenderer.js'

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const fontStyle = { 400: 'Regular', 600: 'Semi Bold', 700: 'Bold' }

// readAsset resolves a version-owned asset ID, never an arbitrary URL or object key.
export async function buildFigmaPackage({ version: rawVersion, campaignTitle, readAsset, compileSlots = compileRenderSlotProvenance }) {
  const version = campaignVersionRecordSchema.parse(rawVersion)
  const { snapshot } = version
  const loaded = new Map()
  let sourceSize = 0
  async function verifiedAsset(id) {
    if (loaded.has(id)) return loaded.get(id)
    const ref = snapshot.assets.find(a => a.id === id)
    const result = ref && await readAsset(id)
    if (!result?.bytes) fail('figma_asset_missing', 'A version asset is unavailable')
    if (sha256(result.bytes) !== ref.sha256) fail('figma_asset_mismatch', 'A version asset failed its integrity check')
    sourceSize += result.bytes.length
    if (sourceSize > 25 * 1024 * 1024) fail('figma_package_too_large', 'The Figma source package exceeds 25 MB')
    loaded.set(id, result)
    return result
  }
  const manifestRef = snapshot.assets.filter(a => a.kind === 'manifest')
  if (manifestRef.length !== 1) fail('figma_output_mismatch', 'A unique render manifest is required')
  const renderAsset = await verifiedAsset(manifestRef[0].id)
  let renderManifest
  try { renderManifest = JSON.parse(Buffer.from(renderAsset.bytes).toString('utf8')) } catch { fail('figma_output_mismatch', 'Invalid render manifest') }
  if (renderManifest.versionId !== version.id || !Array.isArray(renderManifest.renders)) fail('figma_output_mismatch', 'Render manifest does not match the version')
  const designs = snapshot.composition.designs ?? [{ ...snapshot.composition, id: snapshot.composition.id }]
  if (designs.length * snapshot.composition.ratioIds.length > 100) fail('figma_package_too_large', 'A Figma handoff supports at most 100 outputs')
  const sourceAssets = new Map()
  async function addImage(bytes) {
    const png = await sharp(bytes).rotate().png().toBuffer()
    const digest = sha256(png)
    const id = `image-${digest}`
    sourceAssets.set(id, { id, sha256: digest, mimeType: 'image/png', base64: png.toString('base64') })
    return id
  }
  const outputs = []
  const consumedRenders = new Set()
  for (const design of designs) {
    const context = snapshot.designs ? snapshot.designs.find(d => d.id === design.id) : snapshot
    if (!context) fail('figma_output_mismatch', 'Missing immutable design context')
    const manifest = context.templateManifest
    const slots = { ...design.slotValues }
    for (const slot of manifest.slots.filter(s => s.type === 'image')) {
      if (slots[slot.id]) slots[slot.id] = await verifiedAsset(slots[slot.id])
    }
    for (const ratioId of snapshot.composition.ratioIds) {
      const ratio = manifest.ratios.find(r => r.id === ratioId)
      if (!ratio) fail('figma_unsupported_format', 'The saved format is missing from its template')
      const references = renderManifest.renders.filter(r => r.ratioId === ratioId && (snapshot.designs ? r.designId === design.id : r.designId == null))
      if (references.length !== 1) fail('figma_output_mismatch', 'Every design and format needs exactly one reference render')
      const reference = references[0]
      if (!snapshot.assets.some(a => a.kind === 'review_png' && a.id === reference.asset?.id && a.sha256 === reference.asset.sha256)) {
        fail('figma_output_mismatch', 'Reference render is not in the immutable version')
      }
      if (consumedRenders.has(reference.asset.id)) fail('figma_output_mismatch', 'A reference render is mapped more than once')
      consumedRenders.add(reference.asset.id)
      const compiled = await compileSlots({ manifest, slots, ratio: ratioId })
      const nodes = (manifest.presentation?.shapes ?? []).map((s, i) => ({ id: `shape-${i}`, type: s.type, fill: s.fill, placement: s.placements[ratioId] }))
      for (const slot of compiled) {
        if (slot.type === 'image') {
          nodes.push({ id: slot.id, type: 'image', placement: slot.placement, assetId: await addImage(slots[slot.id].bytes),
            crop: slot.crop, sourceWidth: slot.source.width, sourceHeight: slot.source.height })
        } else {
          nodes.push({ id: slot.id, type: 'text', placement: slot.placement, characters: design.slotValues[slot.id], lines: slot.lines,
            font: { family: slot.font.family === 'Inter' ? 'Inter Display' : slot.font.family, style: fontStyle[slot.font.weight], size: slot.font.size },
            lineHeight: Math.ceil(slot.font.size * 1.2), fill: manifest.presentation?.slotColors?.[slot.id] ?? '#111827' })
        }
      }
      for (const graphic of manifest.presentation?.graphics ?? []) {
        const placement = graphic.placements[ratioId]
        const bytes = await sharp(Buffer.from(graphic.dataUrl.split(',')[1], 'base64'))
          .resize(placement.width - 20, placement.height - 20, { fit: 'contain', background: graphic.backgroundColor })
          .extend({ top: 10, bottom: 10, left: 10, right: 10, background: graphic.backgroundColor })
          .flatten({ background: graphic.backgroundColor }).png().toBuffer()
        nodes.push({ id: `graphic-${graphic.id}`, type: 'image', placement, assetId: await addImage(bytes),
          crop: { x: 0, y: 0, width: placement.width, height: placement.height }, sourceWidth: placement.width, sourceHeight: placement.height })
      }
      outputs.push({ outputId: hashCanonical({ versionId: version.id, designId: design.id, ratioId }), designId: design.id,
        ratioId, width: ratio.width, height: ratio.height, referenceAssetId: reference.asset.id,
        scene: { background: manifest.presentation?.backgroundColor ?? '#ffffff', nodes } })
    }
  }
  if (consumedRenders.size !== renderManifest.renders.length || consumedRenders.size !== snapshot.assets.filter(a => a.kind === 'review_png').length) {
    fail('figma_output_mismatch', 'The export does not cover the complete rendered version')
  }
  const pkg = { schemaVersion: 1, versionId: version.id, sourceHash: version.contentHash,
    pageName: (campaignTitle?.trim() || 'Untitled project').slice(0, 200), outputs, sourceAssets: [...sourceAssets.values()] }
  if (pkg.sourceAssets.reduce((size, asset) => size + Buffer.byteLength(asset.base64, 'base64'), 0) > 25 * 1024 * 1024) {
    fail('figma_package_too_large', 'The normalized Figma images exceed 25 MB')
  }
  return figmaPackageSchema.parse({ ...pkg, packageHash: hashFigmaPackage(pkg) })
}
