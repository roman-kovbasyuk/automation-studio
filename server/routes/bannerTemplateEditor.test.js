import { afterEach, describe, expect, test, vi } from 'vitest'
import Fastify from 'fastify'
import sharp from 'sharp'
import { registerBannerTemplateEditorRoutes } from './bannerTemplateEditor.js'
import { createAuthorizer } from '../auth/authorize.js'
import { studioTemplates } from '../../shared/studioTemplates.js'

const template = { id: studioTemplates[0].id, version: studioTemplates[0].version, manifest: studioTemplates[0] }
const draft = { templateId: template.id, templateVersion: template.version,
  values: { caption: '', headline: 'Made for today.', body: 'A fresh perspective.', cta: 'Explore' }, ratioIds: ['square'] }
const apps = []
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())) })
function setup(role = 'marketer', render) {
  const app = Fastify()
  const workflowService = { listTemplates: vi.fn(async () => [template]), getTemplateVersion: vi.fn(async () => template) }
  registerBannerTemplateEditorRoutes(app, { ...createAuthorizer(async () => role ? { id: 'test-actor', role } : null), workflowService, ...(render ? { render } : {}) })
  apps.push(app)
  return { app, workflowService }
}
describe('banner template draft adapter', () => {
  test('requires authentication and exposes honest capabilities', async () => {
    const anon = setup(null)
    expect((await anon.app.inject('/api/v1/banner-template-editor/capabilities')).statusCode).toBe(401)
    const { app } = setup()
    expect((await app.inject('/api/v1/banner-template-editor/capabilities')).json().capabilities).toEqual({
      imageGeneration: false, imageToVideo: false, figmaReview: false, pngDownload: true,
    })
  })
  test('renders real PNG sizes into a draft archive', async () => {
    const { app } = setup()
    const png = await sharp({ create: { width: 1080, height: 1080, channels: 3, background: '#159f94' } }).png().toBuffer()
    const response = await app.inject({ method: 'POST', url: '/api/v1/banner-template-editor/exports',
      payload: { ...draft, ratioIds: ['square', 'landscape'], image: { mimeType: 'image/png', base64: png.toString('base64') } } })
    expect(response.statusCode, response.body.slice(0, 200)).toBe(200)
    expect(response.headers['content-type']).toContain('application/zip')
    const bytes = response.rawPayload
    const entries = []
    let offset = 0
    while (bytes.readUInt32LE(offset) === 0x04034b50) {
      const size = bytes.readUInt32LE(offset + 18), nameLength = bytes.readUInt16LE(offset + 26), extra = bytes.readUInt16LE(offset + 28)
      const name = bytes.subarray(offset + 30, offset + 30 + nameLength).toString()
      const start = offset + 30 + nameLength + extra
      entries.push({ name, bytes: bytes.subarray(start, start + size) })
      offset = start + size
    }
    expect(entries.map(entry => entry.name)).toEqual(['banner-1-1080x1080.png', 'banner-2-1200x628.png', 'draft.json'])
    expect(await sharp(entries[0].bytes).metadata()).toMatchObject({ width: 1080, height: 1080, format: 'png' })
    expect(await sharp(entries[1].bytes).metadata()).toMatchObject({ width: 1200, height: 628 })
    expect(JSON.parse(entries[2].bytes)).toMatchObject({ status: 'not-reviewed', values: draft.values })
  })
  test('rejects unsupported formats, malformed images and duplicate outputs before rendering', async () => {
    const render = vi.fn()
    const { app } = setup('marketer', render)
    for (const ratioIds of [['fake'], ['square', 'square'], []]) {
      const result = await app.inject({ method: 'POST', url: '/api/v1/banner-template-editor/exports',
        payload: { ...draft, ratioIds, image: { mimeType: 'image/png', base64: 'AAAA' } } })
      expect(result.statusCode).toBe(400)
    }
    expect(render).not.toHaveBeenCalled()
  })
  test('does not resolve templates outside the actor catalog', async () => {
    const { app, workflowService } = setup()
    workflowService.listTemplates.mockResolvedValue([])
    const result = await app.inject({ method: 'POST', url: '/api/v1/banner-template-editor/actions', payload: { ...draft, action: 'figma-review' } })
    expect(result.statusCode).toBe(404)
    expect(workflowService.getTemplateVersion).not.toHaveBeenCalled()
  })
  test('never reports generation or review as submitted in scaffold mode', async () => {
    const { app } = setup()
    for (const action of ['generate-image', 'image-to-video', 'figma-review']) {
      const result = await app.inject({ method: 'POST', url: '/api/v1/banner-template-editor/actions', payload: { ...draft, action, imageSource: 'upload' } })
      expect(result.statusCode).toBe(501)
    }
  })
})
