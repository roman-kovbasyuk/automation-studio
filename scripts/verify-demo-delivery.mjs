import { createHash } from 'node:crypto'
import { inflateRawSync } from 'node:zlib'
import sharp from 'sharp'

export class DemoDeliveryVerificationError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'DemoDeliveryVerificationError'
    this.code = code
  }
}

function fail(code, message) {
  throw new DemoDeliveryVerificationError(code, message)
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function readJson(bytes, code) {
  try {
    const text = bytes.toString('utf8')
    if (!Buffer.from(text, 'utf8').equals(bytes)) throw new Error('invalid UTF-8')
    return JSON.parse(text)
  } catch {
    fail(code, 'Delivery manifest is not valid JSON')
  }
}

function extractZipEntries(zipBytes) {
  if (!Buffer.isBuffer(zipBytes) || zipBytes.length < 22) fail('invalid_zip', 'Delivery bytes are not a ZIP archive')
  const entries = new Map()
  let foundCentralDirectory = false
  for (let offset = 0; offset + 46 <= zipBytes.length; offset += 1) {
    if (zipBytes.readUInt32LE(offset) !== 0x02014b50) continue
    foundCentralDirectory = true
    const compression = zipBytes.readUInt16LE(offset + 10)
    const compressedSize = zipBytes.readUInt32LE(offset + 20)
    const uncompressedSize = zipBytes.readUInt32LE(offset + 24)
    const filenameLength = zipBytes.readUInt16LE(offset + 28)
    const extraLength = zipBytes.readUInt16LE(offset + 30)
    const commentLength = zipBytes.readUInt16LE(offset + 32)
    const localOffset = zipBytes.readUInt32LE(offset + 42)
    const nameStart = offset + 46
    const nameEnd = nameStart + filenameLength
    if (nameEnd + extraLength + commentLength > zipBytes.length || localOffset + 30 > zipBytes.length) fail('invalid_zip', 'ZIP directory entry is truncated')
    const name = zipBytes.subarray(nameStart, nameEnd).toString('utf8')
    if (!name || entries.has(name)) fail('duplicate_archive_file', `ZIP contains duplicate entry ${name}`)
    if (compression !== 0 && compression !== 8) fail('unsupported_zip_compression', `ZIP entry ${name} uses unsupported compression`)
    if (zipBytes.readUInt32LE(localOffset) !== 0x04034b50) fail('invalid_zip', `ZIP local entry for ${name} is invalid`)
    const localNameLength = zipBytes.readUInt16LE(localOffset + 26)
    const localExtraLength = zipBytes.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const dataEnd = dataStart + compressedSize
    if (dataEnd > zipBytes.length) fail('invalid_zip', `ZIP entry ${name} is truncated`)
    const compressed = zipBytes.subarray(dataStart, dataEnd)
    let bytes
    try { bytes = compression === 8 ? inflateRawSync(compressed) : Buffer.from(compressed) } catch { fail('invalid_zip', `ZIP entry ${name} cannot be decompressed`) }
    if (bytes.length !== uncompressedSize) fail('invalid_zip', `ZIP entry ${name} has an invalid size`)
    entries.set(name, bytes)
  }
  if (!foundCentralDirectory || entries.size === 0) fail('invalid_zip', 'ZIP central directory is missing')
  return entries
}

function sameDimensions(actual, expected) {
  const sort = values => [...values].sort((left, right) => left.width - right.width || left.height - right.height)
  return JSON.stringify(sort(actual)) === JSON.stringify(sort(expected))
}

export async function verifyDemoDelivery({ zipBytes, expectedVersionId, expectedPngCount, expectedDimensions } = {}) {
  if (typeof expectedVersionId !== 'string' || expectedVersionId.length < 1) throw new TypeError('expectedVersionId is required')
  if (!Number.isSafeInteger(expectedPngCount) || expectedPngCount < 1) throw new TypeError('expectedPngCount must be a positive integer')
  if (!Array.isArray(expectedDimensions) || expectedDimensions.length !== expectedPngCount
    || expectedDimensions.some(value => !Number.isSafeInteger(value?.width) || value.width < 1 || !Number.isSafeInteger(value?.height) || value.height < 1)) {
    throw new TypeError('expectedDimensions must match the expected PNG count')
  }
  const entries = extractZipEntries(zipBytes)
  const deliveryBytes = entries.get('delivery-manifest.json')
  if (!deliveryBytes?.length) fail('missing_delivery_manifest', 'Delivery manifest is missing or empty')
  const manifest = readJson(deliveryBytes, 'invalid_delivery_manifest')
  if (manifest?.versionId !== expectedVersionId) fail('version_mismatch', 'Delivery manifest does not match the expected version')
  if (!Array.isArray(manifest.files) || manifest.files.length < 1) fail('invalid_delivery_manifest', 'Delivery manifest has no files')
  if (manifest.files.some(file => !file || typeof file.filename !== 'string' || typeof file.sha256 !== 'string' || !Number.isSafeInteger(file.byteSize) || file.byteSize < 1)) {
    fail('invalid_delivery_manifest', 'Delivery manifest contains invalid file metadata')
  }
  const listedNames = manifest.files.map(file => file.filename)
  if (new Set(listedNames).size !== listedNames.length) fail('invalid_delivery_manifest', 'Delivery manifest contains duplicate files')
  const archiveNames = [...entries.keys()].sort()
  const expectedArchiveNames = [...listedNames, 'delivery-manifest.json'].sort()
  if (archiveNames.some((name, index) => name !== expectedArchiveNames[index]) || archiveNames.length !== expectedArchiveNames.length) {
    const missing = expectedArchiveNames.find(name => !entries.has(name))
    fail(missing ? 'missing_archive_file' : 'unexpected_archive_file', missing ? `Listed file ${missing} is missing from the archive` : 'Archive contains an unlisted file')
  }
  const pngDimensions = []
  for (const file of manifest.files) {
    const bytes = entries.get(file.filename)
    if (!bytes?.length) fail('empty_archive_file', `Listed file ${file.filename} is empty`)
    if (bytes.length !== file.byteSize || sha256(bytes) !== file.sha256) fail('file_hash_mismatch', `Listed file ${file.filename} does not match its manifest hash`)
    if (file.mimeType === 'image/png') {
      let metadata
      try { metadata = await sharp(bytes).metadata() } catch { fail('png_decode_failed', `Listed PNG ${file.filename} cannot be decoded`) }
      if (metadata.format !== 'png' || metadata.width !== file.width || metadata.height !== file.height) fail('png_dimensions_mismatch', `Listed PNG ${file.filename} dimensions do not match its manifest`)
      pngDimensions.push({ width: metadata.width, height: metadata.height })
    }
  }
  if (pngDimensions.length !== expectedPngCount) fail('png_count_mismatch', `Expected ${expectedPngCount} PNGs but found ${pngDimensions.length}`)
  if (!sameDimensions(pngDimensions, expectedDimensions)) fail('png_dimensions_mismatch', 'PNG dimensions do not match the expected delivery formats')
  return { versionId: manifest.versionId, pngCount: pngDimensions.length, zipSha256: sha256(zipBytes) }
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  throw new Error('The verifier is a library; pass ZIP bytes from a delivery check.')
}
