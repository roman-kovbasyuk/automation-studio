import {build} from 'vite'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {resolve,dirname} from 'node:path'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const pluginConfig=JSON.parse(await readFile(resolve(root,'figma-plugin/plugin.config.json'),'utf8'))
const pluginId=process.env.FIGMA_PLUGIN_ID??pluginConfig.id
if(!/^\d{10,}$/.test(pluginId??''))throw new Error('Set a valid Figma plugin id in figma-plugin/plugin.config.json or FIGMA_PLUGIN_ID before building')
const endpoint=new URL(process.env.STUDIO_ORIGIN??'http://localhost:5175')
// Figma rejects numeric loopback hosts in manifest domain allowlists.
if(endpoint.hostname==='127.0.0.1')endpoint.hostname='localhost'
const origin=endpoint.origin
if(!origin.startsWith('https://')&&!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin))throw new Error('Use HTTPS outside local development')
const apiEndpoint=new URL(process.env.STUDIO_API_ORIGIN??(origin==='http://localhost:5175'?'http://localhost:3010':origin))
if(apiEndpoint.hostname==='127.0.0.1')apiEndpoint.hostname='localhost'
const apiOrigin=apiEndpoint.origin
if(apiEndpoint.protocol!=='https:' && !(apiEndpoint.protocol==='http:' && apiEndpoint.hostname==='localhost'))throw new Error('Use HTTPS for the Studio API outside local development')
const out=resolve(root,'figma-plugin/dist')
await mkdir(out,{recursive:true})
async function bundle(entry,name){
  await build({configFile:false,root,define:{STUDIO_ORIGIN:JSON.stringify(origin),STUDIO_API_ORIGIN:JSON.stringify(apiOrigin)},build:{outDir:out,emptyOutDir:false,target:'es2017',minify:false,
    lib:{entry:resolve(root,entry),name,formats:['iife'],fileName:()=>`${name}.js`}}})
}
await bundle('figma-plugin/src/main.js','main')
await bundle('figma-plugin/src/ui.js','ui')
const script=await readFile(resolve(out,'ui.js'),'utf8')
const html=(await readFile(resolve(root,'figma-plugin/src/ui.html'),'utf8')).replace('/* STUDIO_SCRIPT */',()=>script.replaceAll('</script','<\\/script'))
await writeFile(resolve(out,'ui.html'),html)
const domains=[...new Set([origin,apiOrigin])]
const productionDomains=domains.filter(value=>value.startsWith('https://'))
const developmentDomains=domains.filter(value=>value.startsWith('http://'))
const manifest={name:'Banner Studio Review',api:'1.0.0',editorType:['figma'],main:'main.js',ui:'ui.html',documentAccess:'dynamic-page',
  id:pluginId,networkAccess:{allowedDomains:productionDomains.length?productionDomains:['none'],...(developmentDomains.length?{devAllowedDomains:developmentDomains}:{})}}
await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
console.log('Figma plugin built in figma-plugin/dist')
