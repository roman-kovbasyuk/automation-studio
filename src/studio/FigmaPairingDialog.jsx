import {useState} from 'react'
import { TextField } from 'brutalist-design-system'
import { AppButton } from "../components/design-system/compatibility.jsx"
import { PreviewDialog } from '../components/design-system/organisms/PreviewDialog.jsx'

export function FigmaPairingDialog({api,pairingId,onClose}){
  const [code,setCode]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState(null),[done,setDone]=useState(false)
  return <PreviewDialog title="Connect the Figma plugin" onClose={onClose}>
    {done?<><p role="status">Plugin connected. Return to Figma to continue.</p><AppButton onClick={onClose}>Done</AppButton></>:<form onSubmit={async event=>{
      event.preventDefault();setPending(true);setError(null)
      try{await api.confirmFigmaPairing(pairingId,code.trim());setDone(true)}catch(caught){setError(caught.message)}finally{setPending(false)}
    }}><p>Enter the code shown in Automation Studio Review in Figma. This grants that plugin session access for 15 minutes.</p>
      <TextField label="Plugin pairing code" autoFocus autoComplete="off" maxLength={32} value={code} onChange={event=>setCode(event.target.value)} disabled={pending}/>
      {error&&<p role="alert">{error}</p>}<AppButton type="submit" variant="primary" disabled={!code.trim()||pending} busy={pending}>Connect plugin</AppButton>
    </form>}
  </PreviewDialog>
}
