import { figmaPackageSchema } from '../../shared/figmaContracts.js'
import { hashCanonical } from '../../shared/canonicalJson.js'

export const mappingKey = 'banner-studio-output'
const pageKey = 'banner-studio-version'
const color = hex => ({ r: parseInt(hex.slice(1,3),16)/255, g: parseInt(hex.slice(3,5),16)/255, b: parseInt(hex.slice(5,7),16)/255 })
const solid = hex => [{ type: 'SOLID', color: color(hex) }]
const geometry = (node,p) => { node.resize(p.width,p.height); node.x=p.x; node.y=p.y }

// images contains checksum-verified bytes decoded by the plugin UI before this call.
// All asynchronous preflight happens before native frames are mutated.
export async function importPackage({ figma, pkg: input, images, onProgress = () => {} }) {
  const pkg=figmaPackageSchema.parse(input)
  const fonts=new Map()
  for (const output of pkg.outputs) for (const node of output.scene.nodes) if (node.type==='text') {
    const font={ family:node.font.family, style:node.font.style }
    fonts.set(JSON.stringify(font),font)
  }
  const available=new Set((await figma.listAvailableFontsAsync()).map(f=>JSON.stringify(f.fontName)))
  for (const [key,font] of fonts) {
    if (!available.has(key)) throw new Error(`Install the required font: ${font.family} ${font.style}`)
    await figma.loadFontAsync(font)
  }
  for (const asset of pkg.sourceAssets) if (!(images.get(asset.id) instanceof Uint8Array)) throw new Error('Missing verified image bytes')
  const imageHashes=new Map(pkg.sourceAssets.map(a=>[a.id,figma.createImage(images.get(a.id)).hash]))
  let page=figma.root.children.find(p=>p.getPluginData(pageKey)===pkg.versionId)
  if (!page) { page=figma.createPage(); page.name=pkg.pageName; page.setPluginData(pageKey,pkg.versionId) }
  await figma.setCurrentPageAsync(page)
  const existing=new Map()
  for (const child of page.children) {
    const encoded=child.getPluginData(mappingKey)
    if (!encoded) continue
    let mapping
    try { mapping=JSON.parse(encoded) } catch { throw new Error('A saved frame mapping is invalid') }
    if (existing.has(mapping.outputId)) throw new Error('Duplicate mapped frames need resolution before importing')
    existing.set(mapping.outputId,{ mapping,frame:child })
  }
  const mappings=[]
  const columnWidth=Math.max(...pkg.outputs.map(o=>o.width))+120
  const rowHeight=Math.max(...pkg.outputs.map(o=>o.height))+160
  for (const [index,output] of pkg.outputs.entries()) {
    const prior=existing.get(output.outputId)
    const sceneHash=hashCanonical(output.scene)
    if (prior) {
      if (prior.mapping.packageHash!==pkg.packageHash || prior.mapping.sceneHash!==sceneHash || prior.frame.type!=='FRAME') {
        throw new Error('An existing frame belongs to a different source package')
      }
      mappings.push(prior.mapping)
    } else {
      const frame=figma.createFrame()
      try {
        frame.name=`${output.designId} · ${output.ratioId} · ${output.width}×${output.height}`
        page.appendChild(frame)
        geometry(frame,{ x:(index%3)*columnWidth,y:Math.floor(index/3)*rowHeight,width:output.width,height:output.height })
        frame.clipsContent=true
        frame.fills=solid(output.scene.background)
        for (const source of output.scene.nodes) {
          const node=source.type==='text' ? figma.createText() : source.type==='ellipse' ? figma.createEllipse() : figma.createRectangle()
          frame.appendChild(node)
          node.name=source.id
          if (source.type==='text') {
            node.fontName={ family:source.font.family,style:source.font.style }
            node.fontSize=source.font.size
            node.lineHeight={ unit:'PIXELS',value:source.lineHeight }
            node.characters=source.lines.join('\n')
            node.textAutoResize='NONE'
            node.fills=solid(source.fill)
          } else if (source.type==='image') {
            node.fills=[{ type:'IMAGE', imageHash:imageHashes.get(source.assetId), scaleMode:'CROP', imageTransform:[
              [source.crop.width/source.sourceWidth,0,source.crop.x/source.sourceWidth],
              [0,source.crop.height/source.sourceHeight,source.crop.y/source.sourceHeight],
            ] }]
          } else node.fills=solid(source.fill)
          geometry(node,source.placement)
        }
        const mapping={ outputId:output.outputId,frameId:frame.id,width:output.width,height:output.height,sceneHash,packageHash:pkg.packageHash }
        frame.setPluginData(mappingKey,JSON.stringify(mapping))
        mappings.push(mapping)
      } catch(error) {
        // No await occurs during frame creation: only this unfinished frame is removed.
        frame.remove()
        throw error
      }
    }
    await onProgress({ completed:mappings.length,total:pkg.outputs.length })
  }
  figma.viewport.scrollAndZoomIntoView(page.children.filter(n=>mappings.some(m=>m.frameId===n.id)))
  return { pageId:page.id,mappings }
}
