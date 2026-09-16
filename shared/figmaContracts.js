import { z } from 'zod'
import { hashCanonical } from './canonicalJson.js'

const hash = z.string().regex(/^[a-f0-9]{64}$/)
const id = z.string().min(1).max(256)
const positive = z.number().finite().positive().max(16384)
const placement = z.object({ x: z.number().finite(), y: z.number().finite(), width: positive, height: positive }).strict()
const color = z.string().regex(/^#[a-fA-F0-9]{6}$/)
const font = z.object({ family: z.enum(['Inter Display', 'Arimo']), style: z.enum(['Regular', 'Semi Bold', 'Bold']), size: positive }).strict()
const base = { id, placement }
const shape = z.object({ ...base, type: z.enum(['rect', 'ellipse']), fill: color }).strict()
const text = z.object({ ...base, type: z.literal('text'), characters: z.string().max(10000), lines: z.array(z.string()).max(100),
  font, lineHeight: positive, fill: color }).strict()
const image = z.object({ ...base, type: z.literal('image'), assetId: id, crop: placement,
  sourceWidth: positive, sourceHeight: positive }).strict()
export const figmaOutputSchema = z.object({ outputId: hash, designId: id, ratioId: id, width: positive, height: positive,
  referenceAssetId: id, scene: z.object({ background: color, nodes: z.array(z.union([shape, text, image])).max(200) }).strict() }).strict()
export const figmaPackageSchema = z.object({ schemaVersion: z.literal(1), versionId: id, sourceHash: hash,
  pageName: z.string().min(1).max(200), packageHash: hash, outputs: z.array(figmaOutputSchema).min(1).max(100),
  sourceAssets: z.array(z.object({ id, sha256: hash, mimeType: z.literal('image/png'), base64: z.string().max(36_000_000) }).strict()).max(200),
}).strict().superRefine((pkg, ctx) => {
  if (new Set(pkg.outputs.map(o => o.outputId)).size !== pkg.outputs.length) ctx.addIssue({ code: 'custom', message: 'Duplicate outputs' })
  const assets = new Set(pkg.sourceAssets.map(a => a.id))
  if (assets.size !== pkg.sourceAssets.length) ctx.addIssue({ code: 'custom', message: 'Duplicate source assets' })
  for (const output of pkg.outputs) for (const node of output.scene.nodes) {
    if (node.type === 'image' && !assets.has(node.assetId)) ctx.addIssue({ code: 'custom', message: 'Missing image source' })
  }
  if (hashFigmaPackage(pkg) !== pkg.packageHash) ctx.addIssue({ code: 'custom', message: 'Package hash mismatch' })
})

// Display names and transport payloads do not change the creative identity.
export function hashFigmaPackage({ schemaVersion, versionId, sourceHash, outputs, sourceAssets }) {
  return hashCanonical({ schemaVersion, versionId, sourceHash, outputs,
    sourceAssets: sourceAssets.map(({ base64: _bytes, ...asset }) => asset) })
}
