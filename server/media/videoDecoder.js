import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { MAX_VIDEO_BYTES } from '../providers/veoProvider.js'

const run = promisify(execFile)
const limits = { timeout: 20_000, killSignal: 'SIGKILL', maxBuffer: 128 * 1024, windowsHide: true }
const fraction = value => { const [n, d] = String(value).split('/').map(Number); return n / d }

export async function videoToolsAvailable() {
  try { await Promise.all(['ffprobe','ffmpeg'].map(tool=>run(tool,['-version'],{...limits,timeout:3000})));return true } catch { return false }
}

// Probe and decode a private temporary file, never a provider URL. Full decode
// catches valid headers with missing/corrupt frames before publishing an asset.
export async function decodeGeneratedVideo(value, expected = {}) {
  if (!(value instanceof Uint8Array) || value.byteLength < 12 || value.byteLength > MAX_VIDEO_BYTES) return null
  const bytes = Buffer.from(value)
  if (bytes.toString('ascii', 4, 8) !== 'ftyp') return null
  let directory
  try {
    directory = await mkdtemp(join(tmpdir(), 'studio-video-'))
    const path = join(directory, 'input.mp4')
    await writeFile(path, bytes, { mode: 0o600, flag: 'wx' })
    const input = ['-protocol_whitelist', 'file', '-f', 'mov', '-i', path]
    const { stdout } = await run('ffprobe', ['-v', 'error', ...input, '-show_entries',
      'format=duration:stream=codec_type,codec_name,width,height,pix_fmt,avg_frame_rate,duration', '-of', 'json'], limits)
    const metadata = JSON.parse(stdout)
    const videos = metadata.streams?.filter(stream => stream.codec_type === 'video') ?? []
    const audios = metadata.streams?.filter(stream => stream.codec_type === 'audio') ?? []
    if (videos.length !== 1 || audios.length > 1 || metadata.streams.length !== videos.length + audios.length) return null
    const video = videos[0]
    const frameRate = fraction(video.avg_frame_rate)
    const durationSeconds = Number(metadata.format?.duration)
    if (video.codec_name !== 'h264' || video.pix_fmt !== 'yuv420p' || audios.some(audio => audio.codec_name !== 'aac')
      || ![video.width, video.height].every(size => Number.isInteger(size) && size >= 64 && size <= 1920)
      || !Number.isFinite(frameRate) || frameRate < 1 || frameRate > 60
      || !Number.isFinite(durationSeconds) || durationSeconds < 1 || durationSeconds > 12) return null
    if (expected.width != null && video.width !== expected.width || expected.height != null && video.height !== expected.height
      || expected.durationSeconds != null && Math.abs(durationSeconds - expected.durationSeconds) > 0.15) return null
    await run('ffmpeg', ['-nostdin', '-v', 'error', '-xerror', ...input, '-map', '0:v:0', '-map', '0:a?', '-f', 'null', '-'], limits)
    return { bytes, mimeType: 'video/mp4', width: video.width, height: video.height, durationSeconds, frameRate,
      hasAudio: audios.length > 0, byteSize: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
  } catch {
    return null
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true })
  }
}
