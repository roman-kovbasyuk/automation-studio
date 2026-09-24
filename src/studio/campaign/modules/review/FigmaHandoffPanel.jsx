import {useEffect,useState} from 'react'
import { TextField } from 'brutalist-design-system'
import { AppButton } from "../../../../components/design-system/compatibility.jsx"

const defaultDestination='https://www.figma.com/design/DYRe17Xrx20gbKU2Widv5A/Banner-Flow'
export function FigmaHandoffPanel({figma,phase,canSend,pending,send,refresh}){
  const [destination,setDestination]=useState(defaultDestination)
  const [error,setError]=useState(null)
  const handoff=figma?.handoff
  useEffect(()=>{
    if(phase!=='in_review'||!handoff||!refresh)return
    let stopped=false,timer
    const schedule=()=>{timer=setTimeout(async()=>{
      if(stopped)return
      if(document.visibilityState!=='hidden')try{await refresh()}catch{/* Runtime displays refresh errors. */}
      if(!stopped)schedule()
    },handoff.state==='imported'?30000:10000)}
    schedule();return()=>{stopped=true;clearTimeout(timer)}
  },[phase,handoff?.id,handoff?.state,refresh])
  if(!figma?.loaded)return <p role="status">Checking Figma handoff…</p>
  return <section className="bs-figma-handoff" aria-label="Figma handoff">
    {!handoff&&phase==='in_review'&&canSend&&<form onSubmit={async event=>{
      event.preventDefault();setError(null)
      try{
        const url=new URL(destination)
        const fileKey=url.pathname.split('/')[2]
        if(url.protocol!=='https:'||!['figma.com','www.figma.com'].includes(url.hostname)||!['design','file'].includes(url.pathname.split('/')[1])||!/^[\w-]{6,128}$/.test(fileKey))throw new Error('Enter a Figma design file link.')
        const result=await send({fileKey});if(result?.ok===false)setError(result.message)
      }catch(caught){setError(caught.message)}
    }}>
      <h3>Design help in Figma</h3><p>Optional. Send this version as editable text, images and layouts so a designer can improve it.</p>
      <TextField label="Figma destination" type="url" required value={destination} onChange={event=>setDestination(event.target.value)} disabled={pending}/>
      <AppButton type="submit" disabled={pending} busy={pending}>Send banners to Figma</AppButton>
    </form>}
    {handoff&&<div className="bs-info"><div>
      <strong role="status">{handoff.state==='imported'?'Banners added to Figma, design will review shortly':handoff.state==='importing'?'Adding banners to Figma…':handoff.state==='import_failed'?'The Figma import needs to be resumed.':'Ready to import into Figma'}</strong>
      {handoff.state!=='imported'&&<p>Open the Figma plugin “Automation Studio Review” in the destination file, connect it to Studio, and import this project.</p>}
      {handoff.figmaUrl&&<a href={handoff.figmaUrl} target="_blank" rel="noreferrer">Open Figma</a>}
      {refresh&&<AppButton onClick={refresh} disabled={pending}>Refresh Figma status</AppButton>}
    </div></div>}
    {error&&<p role="alert">{error}</p>}
  </section>
}
