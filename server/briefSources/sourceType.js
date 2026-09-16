import { TextDecoder } from 'node:util'

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const starts = (bytes, hex) => bytes.subarray(0, hex.length / 2).equals(Buffer.from(hex, 'hex'))
function unreadable(message) {
  return Object.assign(new Error(message), { statusCode: 422, code: 'unreadable_brief_file', publicMessage: message, expose: true })
}

// Names are labels, not a format allowlist. Nothing here executes input or follows links.
export function detectSourceType(bytes, declaredMime = '') {
  const declared = declaredMime.split(';')[0].trim().toLowerCase()
  let detected
  if (bytes.subarray(0, 5).toString('ascii') === '%PDF-') detected = { kind: 'pdf', mimeType: 'application/pdf' }
  else if (starts(bytes, '89504e470d0a1a0a')) detected = { kind: 'image', mimeType: 'image/png' }
  else if (starts(bytes, 'ffd8ff')) detected = { kind: 'image', mimeType: 'image/jpeg' }
  else if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') detected = { kind: 'image', mimeType: 'image/webp' }
  else if (starts(bytes, '504b0304') || starts(bytes, '504b0506')) detected = { kind: 'zip', mimeType: 'application/zip' }
  else if (starts(bytes, 'd0cf11e0a1b11ae1')) return { kind: 'native_required', mimeType: declared || 'application/octet-stream' }

  if (detected) {
    const generic = !declared || declared === 'application/octet-stream'
    const compatibleZip = detected.kind === 'zip' && (declared === DOCX || declared.includes('officedocument') || declared === 'application/x-zip-compressed')
    if (!generic && declared !== detected.mimeType && !compatibleZip)
      throw unreadable('The declared file format does not match its contents. Check the file and try again.')
    return detected
  }
  if (declared === 'application/pdf' || declared === DOCX)
    throw unreadable('The declared file format does not match its contents. Check the file and try again.')
  if (/^(image|audio|video)\//.test(declared) || declared === 'application/msword')
    return { kind: 'native_required', mimeType: declared }
  let text
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  catch { throw unreadable('This file cannot be read as text. It needs a compatible AI processor or converter.') }
  if (/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(text))
    throw unreadable('This file cannot be read as text. It needs a compatible AI processor or converter.')
  return { kind: 'text', mimeType: declared || 'text/plain', text }
}

export function nativeProcessingUnavailable() {
  const message = 'This file needs an AI processor or converter that is not connected yet. Try a text-readable version or paste the campaign text.'
  return Object.assign(new Error(message), { statusCode: 415, code: 'brief_format_unavailable', publicMessage: message, expose: true })
}
