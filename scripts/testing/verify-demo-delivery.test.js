// @vitest-environment node
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import sharp from 'sharp'
import { buildDeterministicDeliveryArchiveFile } from '../../server/services/deliveryArchive.js'
import { verifyDemoDelivery } from '../verify-demo-delivery.mjs'

const hash = bytes => createHash('sha256').update(bytes).digest('hex')

async function fixture({ versionId = 'version-1', pngCount = 1, includeMissing = false, dimensions = [{ width: 2, height: 3 }] } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'banner-demo-delivery-'))
  const entries = []
  const files = []
  for (let index = 0; index < pngCount; index += 1) {
    const size = dimensions[index] ?? dimensions.at(-1)
    const bytes = await sharp({ create: { width: size.width, height: size.height, channels: 4, background: '#159f94' } }).png().toBuffer()
    const path = join(directory, `banner-${index + 1}.png`)
    await writeFile(path, bytes)
    const filename = `banners/banner-${String(index + 1).padStart(3, '0')}.png`
    entries.push({ filename, path, byteSize: bytes.length })
    files.push({ filename, assetId: `asset-${index + 1}`, mimeType: 'image/png', byteSize: bytes.length, width: size.width, height: size.height, sha256: hash(bytes) })
  }
  const renderBytes = Buffer.from('{"schemaVersion":1,"renders":[]}', 'utf8')
  const renderPath = join(directory, 'render-manifest.json')
  await writeFile(renderPath, renderBytes)
  entries.push({ filename: 'render-manifest.json', path: renderPath, byteSize: renderBytes.length })
  files.push({ filename: 'render-manifest.json', assetId: 'manifest-1', mimeType: 'application/json', byteSize: renderBytes.length, width: null, height: null, sha256: hash(renderBytes) })
  if (includeMissing) files.push({ filename: 'banners/banner-999.png', assetId: 'missing', mimeType: 'image/png', byteSize: 1, width: 1, height: 1, sha256: '0'.repeat(64) })
  files.sort((left, right) => left.filename.localeCompare(right.filename))
  const manifest = Buffer.from(JSON.stringify({ schemaVersion: 1, campaignId: 'campaign-1', versionId, versionNumber: 1, contentHash: 'a'.repeat(64), approval: { actorId: 'marketer-1', at: '2026-09-14T00:00:00.000Z' }, files }), 'utf8')
  const outputPath = join(directory, 'delivery.zip')
  await buildDeterministicDeliveryArchiveFile({ entries, deliveryManifestBytes: manifest, timestamp: new Date('2026-09-14T00:00:00.000Z'), maxBytes: 1_000_000, outputPath })
  return { directory, bytes: await readFile(outputPath), manifest, files }
}

describe('verifyDemoDelivery', () => {
  test('accepts a versioned archive with the expected PNG count, dimensions and hashes', async () => {
    const value = await fixture({ pngCount: 2, dimensions: [{ width: 2, height: 3 }, { width: 4, height: 5 }] })
    try {
      await expect(verifyDemoDelivery({ zipBytes: value.bytes, expectedVersionId: 'version-1', expectedPngCount: 2, expectedDimensions: [{ width: 2, height: 3 }, { width: 4, height: 5 }] })).resolves.toMatchObject({ versionId: 'version-1', pngCount: 2, zipSha256: hash(value.bytes) })
    } finally { await rm(value.directory, { recursive: true, force: true }) }
  })

  test.each([
    ['corrupt ZIP', { zipBytes: Buffer.from('not a zip') }, 'invalid_zip'],
    ['wrong version', { expectedVersionId: 'version-2' }, 'version_mismatch'],
    ['wrong PNG count', { expectedPngCount: 2, expectedDimensions: [{ width: 2, height: 3 }, { width: 2, height: 3 }] }, 'png_count_mismatch'],
    ['wrong dimensions', { expectedDimensions: [{ width: 9, height: 9 }] }, 'png_dimensions_mismatch'],
    ['missing listed file', { includeMissing: true }, 'missing_archive_file'],
  ])('rejects %s', async (_label, options, expected) => {
    const value = options.zipBytes ? { directory: null, bytes: options.zipBytes } : await fixture(options)
    try {
      await expect(verifyDemoDelivery({ zipBytes: value.bytes, expectedVersionId: options.expectedVersionId ?? 'version-1', expectedPngCount: options.expectedPngCount ?? 1, expectedDimensions: options.expectedDimensions ?? [{ width: 2, height: 3 }] })).rejects.toMatchObject({ code: expected })
    } finally { if (value.directory) await rm(value.directory, { recursive: true, force: true }) }
  })
})
