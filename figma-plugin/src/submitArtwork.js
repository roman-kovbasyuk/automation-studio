export async function captureArtwork({figma,mappings,onProgress=()=>{}}){
  if(!Array.isArray(mappings)||!mappings.length||mappings.length>100)throw new Error('A complete mapped banner set is required')
  const originals=[]
  for(const mapping of mappings){
    const node=await figma.getNodeByIdAsync(mapping.frameId)
    if(!node||node.type!=='FRAME'||node.width!==mapping.width||node.height!==mapping.height)throw new Error('A mapped banner is missing or its size changed')
    originals.push({node,mapping})
  }
  const clones=[]
  try{
    // No await between clones: all frames and metadata are frozen in one JS turn.
    for(const {node,mapping} of originals){
      const texts=[]
      function walk(n){if(n.type==='TEXT')texts.push({layerId:n.id,characters:n.characters});for(const child of n.children??[])walk(child)}
      walk(node)
      const clone=node.clone()
      clones.push({clone,mapping,texts})
      clone.x=-100000;clone.y=-100000
    }
    const outputs=[];let total=0
    for(const {clone,mapping,texts} of clones){
      const bytes=await clone.exportAsync({format:'PNG',constraint:{type:'SCALE',value:1},contentsOnly:false})
      total+=bytes.length
      if(bytes.length>25*1024*1024||total>250*1024*1024)throw new Error('The submitted artwork exceeds its byte limit')
      outputs.push({outputId:mapping.outputId,frameId:mapping.frameId,texts,bytes})
      await onProgress({completed:outputs.length,total:clones.length})
    }
    return outputs
  }finally{for(const {clone} of clones)clone.remove()}
}
