import { describe, expect, test, vi } from 'vitest'
import { createVeoProvider } from './veoProvider.js'

const model = 'veo-3.1-lite-generate-preview'
const name = `models/${model}/operations/test-operation`
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
const provider = fetchImpl => createVeoProvider({ apiKey: 'synthetic-private-key', model, fetchImpl, timeoutMs: 100 })

describe('Veo transport boundaries', () => {
  test('checks model access without submitting content', async () => {
    const fetch = vi.fn(async () => json({ name: `models/${model}`, supportedGenerationMethods: ['predictLongRunning'] }))
    expect(await provider(fetch).check()).toEqual({ available: true, model })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${model}`)
    expect(fetch.mock.calls[0][1].method).toBe('GET')
  })
  test('submits exactly one bounded video and returns only operation identity', async () => {
    const fetch = vi.fn(async () => json({ name, metadata: { private: 'ignore' } }))
    expect(await provider(fetch).submit({ prompt: 'A slow camera move around a bottle.', aspectRatio: '16:9' })).toEqual({ operationName: name })
    const [url, request] = fetch.mock.calls[0]
    expect(url).not.toContain('synthetic-private-key')
    expect(request.headers['x-goog-api-key']).toBe('synthetic-private-key')
    expect(JSON.parse(request.body)).toEqual({ instances: [{ prompt: 'A slow camera move around a bottle.' }],
      parameters: { sampleCount: 1, durationSeconds: 4, resolution: '720p', aspectRatio: '16:9' } })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  test.each([429, 403, 500])('does not retry or expose raw provider errors on HTTP %i', async status => {
    const fetch = vi.fn(async () => json({ error: { message: 'synthetic-private-key provider body' } }, status))
    const error = await provider(fetch).submit({ prompt: 'A bottle', aspectRatio: '16:9' }).catch(error => error)
    expect(error.message).not.toContain('synthetic-private-key')
    expect(error.code).toBe(status === 429 ? 'quota_exhausted' : status === 403 ? 'access_denied' : 'outcome_unknown')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  test('transport loss after submission is unknown and never retries', async () => {
    const fetch = vi.fn(async () => { throw new Error('private transport details') })
    await expect(provider(fetch).submit({ prompt: 'A bottle', aspectRatio: '16:9' })).rejects.toMatchObject({ code: 'outcome_unknown' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  test('resumes by operation name using only GET and no submission', async () => {
    const fetch = vi.fn(async () => json({ name, done: false }))
    expect(await provider(fetch).poll(name)).toEqual({ state: 'running', operationName: name })
    expect(fetch.mock.calls[0][1].method).toBe('GET')
    expect(fetch.mock.calls[0][0].endsWith(name)).toBe(true)
  })
  test('validates terminal output and omits provider raw payload', async () => {
    const uri = 'https://generativelanguage.googleapis.com/v1beta/files/video:download?alt=media'
    const fetch = vi.fn(async () => json({ name, done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri } }] } } }))
    expect(await provider(fetch).poll(name)).toEqual({ state: 'retrieving', operationName: name, downloadUri: uri })
  })
  test('filtered output is blocked rather than successful', async () => {
    const fetch = vi.fn(async () => json({ name, done: true, response: { generateVideoResponse: { raiMediaFilteredCount: 1, raiMediaFilteredReasons: ['private reason'] } } }))
    expect(await provider(fetch).poll(name)).toEqual({ state: 'blocked', operationName: name, errorCode: 'provider_blocked' })
  })
  test.each(['https://evil.example/file', 'models/other-model/operations/id', `${name}?key=secret`])('rejects untrusted operation input before network use: %s', async invalid => {
    const fetch = vi.fn()
    await expect(provider(fetch).poll(invalid)).rejects.toMatchObject({ code: 'invalid_operation' })
    expect(fetch).not.toHaveBeenCalled()
  })
  test('bounds downloaded bytes and keeps the API key off redirect requests', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://storage.googleapis.com/video/file.mp4' } }))
      .mockResolvedValueOnce(new Response(bytes))
    expect(await provider(fetch).download('https://generativelanguage.googleapis.com/v1beta/files/video:download?alt=media')).toEqual(Buffer.from(bytes))
    expect(fetch.mock.calls[1][1].headers['x-goog-api-key']).toBeUndefined()
  })
  test('rejects off-origin download and redirects before leaking credentials', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'https://evil.example/download' } }))
    await expect(provider(fetch).download('https://evil.example/file')).rejects.toMatchObject({ code: 'invalid_download' })
    expect(fetch).not.toHaveBeenCalled()
    await expect(provider(fetch).download('https://generativelanguage.googleapis.com/v1beta/files/file:download')).rejects.toMatchObject({ code: 'invalid_download' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
