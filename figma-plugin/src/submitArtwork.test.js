import { expect,test,vi } from 'vitest'
import { captureArtwork } from './submitArtwork.js'

test('captures immutable clones with editable text metadata and cleans temporary nodes',async()=>{
  const removed=vi.fn()
  const original={id:'1:1',type:'FRAME',width:1080,height:1080,children:[{id:'1:2',type:'TEXT',characters:'Reviewed headline'}],
    clone:()=>({id:'copy',width:1080,height:1080,visible:true,children:[],remove:removed,exportAsync:async()=>new Uint8Array([137,80,78,71])})}
  const figma={getNodeByIdAsync:async()=>original}
  const result=await captureArtwork({figma,mappings:[{outputId:'o',frameId:'1:1',width:1080,height:1080}]})
  expect(result[0]).toMatchObject({outputId:'o',frameId:'1:1',texts:[{layerId:'1:2',characters:'Reviewed headline'}]})
  expect(result[0].bytes).toEqual(new Uint8Array([137,80,78,71]))
  expect(removed).toHaveBeenCalledOnce()
})
test('rejects resized mapped frames before capture',async()=>{
  const clone=vi.fn()
  await expect(captureArtwork({figma:{getNodeByIdAsync:async()=>({type:'FRAME',width:20,height:20,clone})},
    mappings:[{outputId:'o',frameId:'1:1',width:1080,height:1080}]})).rejects.toThrow(/size/i)
  expect(clone).not.toHaveBeenCalled()
})
