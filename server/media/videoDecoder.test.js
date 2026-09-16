// @vitest-environment node
import { beforeAll, afterAll, describe, expect, test } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { decodeGeneratedVideo } from './videoDecoder.js'

let directory, bytes
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'video-decoder-test-'))
  execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=teal:s=1280x720:r=24',
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-movflags', '+faststart', join(directory, 'video.mp4')], { timeout: 15000 })
  bytes = await readFile(join(directory, 'video.mp4'))
})
afterAll(async () => { await rm(directory, { recursive: true, force: true }) })

describe('generated MP4 validation', () => {
  test('decodes the complete MP4 and records real metadata and byte identity', async () => {
    expect(await decodeGeneratedVideo(bytes, { width: 1280, height: 720, durationSeconds: 4 })).toMatchObject({
      mimeType: 'video/mp4', width: 1280, height: 720, durationSeconds: 4, frameRate: 24, hasAudio: true,
      byteSize: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    })
  })
  test('rejects a dimension mismatch rather than relabelling the file', async () => {
    await expect(decodeGeneratedVideo(bytes, { width: 720, height: 1280, durationSeconds: 4 })).resolves.toBeNull()
  })
  test('rejects a duration mismatch', async () => {
    await expect(decodeGeneratedVideo(bytes, { durationSeconds: 8 })).resolves.toBeNull()
  })
  test('rejects a truncated MP4 with a valid ftyp signature', async () => {
    await expect(decodeGeneratedVideo(bytes.subarray(0, Math.floor(bytes.length / 2)))).resolves.toBeNull()
  })
  test('rejects non-video and oversized bytes', async () => {
    await expect(decodeGeneratedVideo(Buffer.from('<html>not video</html>'))).resolves.toBeNull()
    await expect(decodeGeneratedVideo(Buffer.alloc(16 * 1024 * 1024 + 1))).resolves.toBeNull()
  })
})
