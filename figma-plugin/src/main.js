import './polyfills.js'
import {importPackage} from './importScene.js'
import {captureArtwork} from './submitArtwork.js'

figma.showUI(__html__,{width:420,height:650,themeColors:true})
let busy=false
figma.ui.onmessage=async message=>{
  if(busy)return figma.ui.postMessage({type:'error',message:'Wait for the current operation to finish'})
  busy=true
  try{
    if(message.type==='import'){
      if(figma.fileKey&&figma.fileKey!==message.fileKey)throw new Error('Open the configured destination file before importing')
      const result=await importPackage({figma,pkg:message.pkg,images:new Map(message.images.map(a=>[a.id,new Uint8Array(a.bytes)])),
        onProgress:progress=>figma.ui.postMessage({type:'progress',...progress})})
      figma.ui.postMessage({type:'imported',result})
    }else if(message.type==='capture'){
      const outputs=await captureArtwork({figma,mappings:message.mappings,onProgress:progress=>figma.ui.postMessage({type:'progress',...progress})})
      figma.ui.postMessage({type:'captured',outputs:outputs.map(({bytes,...output})=>({...output,pngBase64:figma.base64Encode(bytes)}))})
    }
  }catch(error){figma.ui.postMessage({type:'error',message:error.message??'Figma operation failed'})}
  finally{busy=false}
}
