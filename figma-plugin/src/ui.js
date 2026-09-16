import {isHostMessage} from './hostMessages.js'
import {sha256Bytes} from '../../shared/canonicalJson.js'
import {createSubmissionTransfer} from './submissionTransfer.js'
import {figmaPackageSchema} from '../../shared/figmaContracts.js'
const base=STUDIO_ORIGIN
const $=id=>document.getElementById(id)
let token=null,handoffs=[],active=null,lease=null,submission=null,role=null,pendingImport=null,busy=false,heartbeat=null,captureRequest=null
const status=text=>{$('status').textContent=text}
async function api(path,{method='GET',body}={}){
  const response=await fetch(`${STUDIO_API_ORIGIN}/api/v1/figma/plugin${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined})
  const result=await response.json()
  if(!response.ok)throw new Error(result.error?.message??result.message??'Studio request failed')
  const {requestId,...data}=result
  return data
}
function setBusy(value){busy=value;for(const node of document.querySelectorAll('button,select,input'))node.disabled=value; $('submit').disabled=value||role!=='designer'}
async function reportImportFailure(){
 stopHeartbeat()
 const job=pendingImport;pendingImport=null
 if(job)try{await api(`/handoffs/${job.active.id}/failed`,{method:'POST',body:{leaseGeneration:job.lease.leaseGeneration}})}catch{/* A replaced or confirmed lease must not be changed. */}
}
function stopHeartbeat(){clearInterval(heartbeat);heartbeat=null}
function run(fn){return async()=>{if(busy)return;setBusy(true);try{status('Working…');await fn()}catch(error){await reportImportFailure();status(error.message)}finally{if(!pendingImport)setBusy(false)}}}
function capture(mappings){return new Promise((resolve,reject)=>{captureRequest={resolve,reject};parent.postMessage({pluginMessage:{type:'capture',mappings}},'*')})}
const commandKey=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('')
function selected(){const value=handoffs.find(h=>h.id===$('handoff').value);if(!value)throw new Error('Select a project');return value}
function verifiedFile(handoff){
  let url;try{url=new URL($('file-link').value)}catch{throw new Error('Paste the current Figma file’s link')}
  if(url.protocol!=='https:'||!['www.figma.com','figma.com'].includes(url.hostname)||url.pathname.split('/')[2]!==handoff.fileKey)throw new Error('This file link does not match the configured destination')
}
async function refresh(){
  const value=await api('/handoffs');handoffs=value.handoffs
  $('handoff').replaceChildren(...handoffs.map(h=>new Option(`${h.projectName??h.campaignId} · ${h.state}`,h.id)))
  if(active&&handoffs.some(h=>h.id===active.id))$('handoff').value=active.id
  showVideos();status(handoffs.length?'Choose a project to continue.':'No projects are waiting for Figma review.')
}
function showVideos(){
  const handoff=handoffs.find(h=>h.id===$('handoff').value)
  $('videos').replaceChildren(...(handoff?.videos??[]).map((video,index)=>{
    const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.dataset.videoId=video.id
    label.append(check,document.createTextNode(`I reviewed source video ${index+1}, including audio, in Studio.`));return label
  }))
}
$('handoff').onchange=()=>{submission=null;showVideos()}
$('pair').onclick=run(async()=>{
  token=null
  const pairing=await api('/pairings',{method:'POST',body:{}});token=pairing.sessionToken
  $('pair-info').hidden=false;$('pair-code').textContent=pairing.code;$('pair-id').textContent=`Session ${pairing.pairingId}`
  $('open-app').href=`${base}/mvp?figmaPairing=${encodeURIComponent(pairing.pairingId)}`
  status('Confirm this session in Studio. The code expires in five minutes.')
})
$('check-pair').onclick=run(async()=>{
  const session=await api('/session');role=session.role;$('connect').hidden=true;$('workspace').hidden=false;$('submit').disabled=role!=='designer'
  await refresh()
  if(role!=='designer')status('Connected as a marketer. A designer must pair this plugin to return artwork for approval.')
})
$('refresh').onclick=run(refresh)
$('import').onclick=run(async()=>{
  active=selected();verifiedFile(active)
  lease=await api(`/handoffs/${active.id}/claim`,{method:'POST',body:{}})
  pendingImport={active,lease}
  const pkg=figmaPackageSchema.parse(await api(`/handoffs/${active.id}/package`)),images=[]
  for(const asset of pkg.sourceAssets){
    const bytes=Uint8Array.from(atob(asset.base64),c=>c.charCodeAt(0))
    const digest=sha256Bytes(bytes)
    if(digest!==asset.sha256)throw new Error('A source image failed its checksum')
    images.push({id:asset.id,bytes})
  }
  pendingImport={active,lease}
  heartbeat=setInterval(async()=>{if(!pendingImport)return;try{pendingImport.lease=await api(`/handoffs/${pendingImport.active.id}/claim`,{method:'POST',body:{}})}catch(error){stopHeartbeat();status(`Connection interrupted: ${error.message}. Finish importing, then retry to confirm.`)}},30000)
  parent.postMessage({pluginMessage:{type:'import',pkg,images,fileKey:active.fileKey}},'*')
})
$('submit').onclick=run(async()=>{
  active=selected();verifiedFile(active)
  if(active.state!=='imported')throw new Error('Import all banners first')
  const checks=Object.fromEntries([...document.querySelectorAll('[data-check]')].map(n=>[n.dataset.check,n.checked]))
  if(!Object.values(checks).every(Boolean))throw new Error('Complete all three designer checks')
  const videos=[...document.querySelectorAll('[data-video-id]')]
  if(videos.some(n=>!n.checked))throw new Error('Review each source video in Studio')
  if(!submission){
    const job=active,input={checklistAnswers:checks,videoAssetIds:videos.map(n=>n.dataset.videoId)}
    submission=createSubmissionTransfer({key:commandKey(),
      begin:({idempotencyKey})=>api(`/handoffs/${job.id}/submissions`,{method:'POST',body:{expectedRevision:job.revision,idempotencyKey}}),
      capture:()=>capture(job.mappings),
      upload:(id,{outputId,...body})=>api(`/submissions/${id}/outputs/${outputId}`,{method:'POST',body}),
      finalize:id=>api(`/submissions/${id}/finalize`,{method:'POST',body:input}),
      onProgress:(done,total)=>status(`Uploading ${done} of ${total} banners…`),
    })
  }
  await submission.run();submission=null;await refresh();status('Artwork returned to Studio for approval.')
})
window.onmessage=async event=>{
  if(!isHostMessage(event,window))return
  const message=event.data.pluginMessage;if(!message)return
  try{
    if(message.type==='error'){if(captureRequest){captureRequest.reject(new Error(message.message));captureRequest=null;return}throw new Error(message.message)}
    if(message.type==='captured'&&captureRequest){captureRequest.resolve(message.outputs);captureRequest=null;return}
    if(message.type==='progress')status(`Processing ${message.completed} of ${message.total} banners…`)
    if(message.type==='imported'&&pendingImport){
      const {active:job,lease:claim}=pendingImport
      const confirmed=await api(`/handoffs/${job.id}/acknowledge`,{method:'POST',body:{leaseGeneration:claim.leaseGeneration,input:{fileKey:job.fileKey,
        pageId:message.result.pageId,packageHash:job.packageHash,mappings:message.result.mappings}}})
      active=confirmed;pendingImport=null;stopHeartbeat();await refresh();setBusy(false);status('Banners added to Figma, design will review shortly')
    }

  }catch(error){await reportImportFailure();setBusy(false);status(error.message)}
}
