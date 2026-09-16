import { expect, test } from 'vitest'
import { detectSourceType } from './sourceType.js'

test('detects PDF and images without a file extension', () => {
  expect(detectSourceType(Buffer.from('%PDF-1.7'), 'application/octet-stream').kind).toBe('pdf')
  expect(detectSourceType(Buffer.from('89504e470d0a1a0a','hex'), '').mimeType).toBe('image/png')
})
test('keeps arbitrary valid UTF-8 text without interpreting markup', () => {
  const text='<script>doNotExecute()</script>\r\nOslo students'
  expect(detectSourceType(Buffer.from(text), 'application/custom')).toMatchObject({kind:'text',text})
})
test('rejects contradictory binary MIME and binary disguised as text', () => {
  expect(()=>detectSourceType(Buffer.from('hello'), 'application/pdf')).toThrow(/match/)
  expect(()=>detectSourceType(Buffer.from([0,1,65]), 'text/plain')).toThrow(/read/)
  expect(()=>detectSourceType(Buffer.from('89504e470d0a1a0a','hex'), 'image/jpeg')).toThrow(/match/)
})
test('identifies native-processing inputs without pretending they contain text', () => {
  expect(detectSourceType(Buffer.from('d0cf11e0a1b11ae1','hex'), 'application/msword').kind).toBe('native_required')
  expect(detectSourceType(Buffer.from('audio bytes'), 'audio/mpeg').kind).toBe('native_required')
})
