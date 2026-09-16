import { useEffect,useRef,useState } from 'react'
import { AppButton } from "../../../../components/design-system/compatibility.jsx"
import { AsyncStatus } from '../../../../components/design-system/molecules/AsyncStatus.jsx'
import { SelectMenu } from '../../../../components/design-system/molecules/SelectMenu.jsx'
import { useAssetUrl,saveBlob } from '../../../primitives.jsx'

const activePhases=new Set(['queued','submitting','running','retrieving'])
const phaseLabels={queued:'Video queued…',submitting:'Submitting video…',running:'Generating video…',retrieving:'Saving and validating video…'}
function VideoPlayback({asset,assets,title}) {
  const {url,error}=useAssetUrl(assets,asset.id)
  const [downloading,setDownloading]=useState(false),[downloadError,setDownloadError]=useState(null)
  async function download(){
    setDownloading(true);setDownloadError(null)
    try{saveBlob(await assets.getAssetBlob(asset.id),`source-video-${asset.sha256.slice(0,12)}.mp4`)}
    catch{setDownloadError('Video download failed. Try downloading again.')}
    finally{setDownloading(false)}
  }
  return <>{url?<video src={url} controls preload="metadata" aria-label={`${title} video`} style={{width:'100%',maxHeight:320}}/>
    :<p role="status">{error?'Video unavailable. Check its status.':'Loading video…'}</p>}
    <p>{asset.width} × {asset.height} · {asset.durationSeconds}s · {asset.hasAudio?'With audio':'Silent'}</p>
    <p className="bs-visual-guidance">Generated source footage. Review is required before campaign delivery.</p>
    <AppButton busy={downloading} disabled={downloading} onClick={download}>Download source video</AppButton>
    {downloadError&&<p role="alert">{downloadError}</p>}</>
}
export function VideoControls({direction,job,assets,readOnly=false,canManage=false,onPlan,onSubmit,onRefresh,onCancel}) {
  const [plan,setPlan]=useState(null),[localJob,setLocalJob]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(null)
  const [aspectRatio,setAspectRatio]=useState('16:9')
  const intent=useRef(null)
  const source=useRef(direction.prompt)
  useEffect(()=>{if(source.current!==direction.prompt){source.current=direction.prompt;setPlan(null);intent.current=null}},[direction.prompt])
  const current=job??localJob
  const active=activePhases.has(current?.phase),unknown=current?.phase==='unknown'
  async function attempt(action){setBusy(true);setError(null);try{return await action()}catch(error){setError(error.message??'Video request failed. Check its status.')}finally{setBusy(false)}}
  return <div className="bs-video-controls">
    {current?.asset?<VideoPlayback asset={current.asset} assets={assets} title={direction.title}/>:<>
      {active&&<AsyncStatus>{phaseLabels[current.phase]}</AsyncStatus>}
      {unknown&&<p role="status">Submission is unconfirmed. Check this job before trying again.</p>}
      {['failed','blocked','cancelled'].includes(current?.phase)&&<p role="status">{current.phase==='blocked'?'Video generation was blocked.':current.phase==='cancelled'?'Video tracking stopped. An accepted provider request may still finish and incur a charge.':'Video generation failed. Check the saved job before trying again.'}</p>}
      {!active&&!unknown&&!plan&&<>
        <SelectMenu label="Video orientation" value={aspectRatio==='16:9'?'Landscape':'Portrait'} options={['Landscape','Portrait']}
          disabled={readOnly||busy||direction.stale} onChange={value=>setAspectRatio(value==='Landscape'?'16:9':'9:16')}/>
        <AppButton disabled={readOnly||busy||direction.stale||!onPlan||!direction.prompt} busy={busy} onClick={()=>attempt(async()=>{
          const prepared=await onPlan({directionId:direction.id,aspectRatio});setPlan(prepared);intent.current=crypto.randomUUID()
        })}>Prepare video</AppButton>
      </>}
      {plan&&!active&&!unknown&&<div>
        <p>{plan.prompt}</p>
        <p>{plan.durationSeconds} seconds · {plan.resolution} · {plan.aspectRatio} · Audio included</p>
        <p>Estimated cost: ${(plan.estimatedCostMicrounits/1000000).toFixed(2)}. This is not a free-tier request.</p>
        <AppButton variant="primary" busy={busy} disabled={readOnly||busy||direction.stale} onClick={()=>attempt(async()=>{
          const saved=await onSubmit(plan,intent.current);setLocalJob(saved);setPlan(null)
        })}>Generate video · ${(plan.estimatedCostMicrounits/1000000).toFixed(2)} estimate</AppButton>
        <AppButton disabled={busy} onClick={()=>setPlan(null)}>Dismiss plan</AppButton>
      </div>}
    </>}
    {current&&<AppButton disabled={busy} onClick={()=>attempt(()=>onRefresh?.())}>Check video status</AppButton>}
    {(active||unknown)&&canManage&&<AppButton disabled={busy} onClick={()=>attempt(async()=>setLocalJob(await onCancel(current.id)))}>Stop tracking video</AppButton>}
    {error&&<p role="alert">{error}</p>}
  </div>
}
