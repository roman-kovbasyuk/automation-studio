import { useEffect, useState } from 'react'
import { AppButton, Alert } from "../components/design-system/compatibility.jsx"
import { safeErrorMessage } from './safeErrorMessage.js'

export function Button({ children, primary=false, busy=false, ...props }) {
  return <AppButton {...props} variant={primary ? 'primary' : 'secondary'} busy={busy}>{children}</AppButton>
}
export function ErrorNotice({error, onRetry}) {
  if (!error) return null
  const settingsRequired = ['generation_unavailable', 'provider_unavailable', 'not_connected', 'provider_configuration', 'credential_version_changed', 'provider_configuration_missing']
    .some(code => code === error.code || code === error.reasonCode)
  return <Alert tone="danger" title={error.status === 409 ? 'This campaign has changed' : 'Something needs attention'}><p>{safeErrorMessage(error)}</p>{settingsRequired && <p><a href="/mvp/settings">Open Settings</a> to configure a personal AI provider.</p>}{error.details && <ul>{(Array.isArray(error.details)?error.details:[]).map((detail,index)=><li key={index}>{detail.path}: {detail.message}</li>)}</ul>}{onRetry && <Button onClick={onRetry}>Reload campaign</Button>}</Alert>
}
export function SectionHeading({ title, children, action, as: Heading = 'h2' }) {
  return <header className="bs-section-heading"><div><Heading>{title}</Heading>{children && <p>{children}</p>}</div>{action}</header>
}
export function useAssetUrl(reader, assetId) {
  const [state,setState]=useState({url:null,error:null})
  useEffect(()=>{
    let active=true, objectUrl
    const controller = new AbortController()
    setState({url:null,error:null})
    if(assetId) reader.getAssetBlob(assetId, { signal: controller.signal }).then(blob=>{if(active){objectUrl=URL.createObjectURL(blob);setState({url:objectUrl,error:null})}}).catch(error=>{if(active)setState({url:null,error})})
    return ()=>{active=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl)}
  },[reader,assetId])
  return state
}
export function AssetImage({api, assets, assetId, alt, ...props}) {
  const {url,error}=useAssetUrl(assets ?? api,assetId)
  return url ? <img src={url} alt={alt} {...props}/> : <div className="bs-asset-placeholder" role="status">{error ? 'Image unavailable. Reload the campaign.' : assetId ? 'Loading image…' : 'Generate an image to preview it.'}</div>
}
export function saveBlob(blob, filename) {
  const url=URL.createObjectURL(blob), link=document.createElement('a')
  link.href=url; link.download=filename; link.click(); setTimeout(()=>URL.revokeObjectURL(url),10000)
}


export function AssetVideo({ assets, asset, label }) {
  const { url, error } = useAssetUrl(assets, asset.id)
  return <figure>{url ? <video src={url} controls preload="metadata" aria-label={label} style={{ width: '100%', maxHeight: 320 }} />
    : <p role="status">{error ? 'Video could not be loaded.' : 'Loading video…'}</p>}
    <figcaption>{asset.width} × {asset.height} · {asset.durationSeconds}s · {asset.hasAudio ? 'With audio' : 'Silent'}</figcaption>
  </figure>
}
