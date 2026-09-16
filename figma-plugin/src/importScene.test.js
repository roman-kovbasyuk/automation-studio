import { describe, expect, test, vi } from 'vitest'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { hashFigmaPackage } from '../../shared/figmaContracts.js'
import { importPackage } from './importScene.js'

function fixture() {
  const pkg = { schemaVersion: 1, versionId: 'v1', sourceHash: 'a'.repeat(64), pageName: 'Launch', sourceAssets: [
    { id: 'photo', sha256: 'b'.repeat(64), mimeType: 'image/png', base64: 'AQ==' },
  ], outputs: Array.from({ length: 9 }, (_, i) => ({ outputId: hashCanonical(i), designId: `design-${Math.floor(i/3)}`,
    ratioId: `ratio-${i%3}`, width: 1080, height: 1080, referenceAssetId: `reference-${i}`, scene: { background: '#ffffff', nodes: [
      { id: 'title', type: 'text', characters: 'Start here', lines: ['Start', 'here'], font: { family: 'Inter Display', style: 'Bold', size: 40 },
        lineHeight: 48, fill: '#112233', placement: { x: 20, y: 40, width: 300, height: 150 } },
      { id: 'photo', type: 'image', assetId: 'photo', sourceWidth: 1200, sourceHeight: 900, crop: { x: 390, y: 0, width: 420, height: 900 },
        placement: { x: 576, y: 0, width: 504, height: 1080 } },
    ] } })) }
  return { ...pkg, packageHash: hashFigmaPackage(pkg) }
}
function fakeFigma() {
  let counter = 0
  const all = new Map(), loaded = new Set()
  const create = type => {
    const data = new Map()
    const node = { id: `node-${++counter}`, type, name: '', children: [], width: 100, height: 100,
      resize(w,h) { this.width=w; this.height=h },
      appendChild(child) { child.parent?.children.splice(child.parent.children.indexOf(child),1); this.children.push(child); child.parent=this },
      setPluginData(k,v) { data.set(k,v) }, getPluginData(k) { return data.get(k) ?? '' },
      async loadAsync() {}, remove() { this.parent?.children.splice(this.parent.children.indexOf(this),1); all.delete(this.id) },
    }
    if (type === 'TEXT') Object.defineProperty(node, 'characters', { get() { return this.value }, set(value) {
      if (!loaded.has(JSON.stringify(this.fontName))) throw new Error('unloaded font')
      this.value=value
    } })
    all.set(node.id,node)
    return node
  }
  const root = create('DOCUMENT')
  const figma = { root, all,
    createPage() { const p=create('PAGE'); root.appendChild(p); return p },
    createFrame: () => create('FRAME'), createText: () => create('TEXT'),
    createRectangle: () => create('RECTANGLE'), createEllipse: () => create('ELLIPSE'),
    createImage: vi.fn(() => ({ hash: 'figma-photo' })),
    loadFontAsync: vi.fn(async name => { loaded.add(JSON.stringify(name)) }),
    listAvailableFontsAsync: async () => [{ fontName: { family: 'Inter Display', style: 'Bold' } }],
    getNodeByIdAsync: async id => all.get(id),
    async setCurrentPageAsync(page) { this.currentPage=page },
    viewport: { scrollAndZoomIntoView: vi.fn() },
  }
  return figma
}
describe('native Figma importer', () => {
  test('creates a project page and nine editable frames; resume preserves designer changes', async () => {
    const figma=fakeFigma(), pkg=fixture()
    const input={ figma, pkg, images: new Map([['photo', new Uint8Array([1])]]) }
    const imported=await importPackage(input)
    expect(imported.mappings).toHaveLength(9)
    expect(figma.root.children[0].name).toBe('Launch')
    const frame=figma.all.get(imported.mappings[0].frameId)
    expect(frame.children[0]).toMatchObject({ type: 'TEXT', characters: 'Start\nhere', fontName: { family: 'Inter Display', style: 'Bold' } })
    expect(frame.children[1].fills[0]).toMatchObject({ type: 'IMAGE', scaleMode: 'CROP', imageTransform: [[0.35,0,0.325],[0,1,0]] })
    frame.children[0].characters='Designer edit'
    const second=await importPackage(input)
    expect(second.mappings).toEqual(imported.mappings)
    expect(frame.children[0].characters).toBe('Designer edit')
    expect([...figma.all.values()].filter(n => n.type==='FRAME')).toHaveLength(9)
  })
  test('preflights fonts before creating anything', async () => {
    const figma=fakeFigma()
    figma.listAvailableFontsAsync=async()=>[]
    await expect(importPackage({ figma, pkg:fixture(), images:new Map([['photo', new Uint8Array([1])]]) })).rejects.toThrow(/font/i)
    expect(figma.root.children).toHaveLength(0)
  })
  test('resumes a partially completed import without duplicating frames', async () => {
    const figma=fakeFigma(), pkg=fixture(), images=new Map([['photo', new Uint8Array([1])]])
    await expect(importPackage({ figma,pkg,images,onProgress: ({ completed })=>{ if(completed===3) throw new Error('interrupted') } })).rejects.toThrow('interrupted')
    const result=await importPackage({ figma,pkg,images })
    expect(result.mappings).toHaveLength(9)
    expect([...figma.all.values()].filter(n=>n.type==='FRAME')).toHaveLength(9)
  })
  test('rejects a package changed after its hash was calculated', async () => {
    const pkg=fixture(); pkg.outputs[0].scene.nodes[0].characters='tampered'
    const figma=fakeFigma()
    await expect(importPackage({ figma,pkg,images:new Map() })).rejects.toThrow()
    expect(figma.root.children).toHaveLength(0)
  })
})
