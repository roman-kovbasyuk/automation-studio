import { useEffect, useState } from 'react'

export function BrandAssetPreview({ asset, onReadAsset, alt = '' }) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!onReadAsset || !asset?.id || !asset.mimeType?.startsWith('image/')) return undefined
    const controller = new AbortController()
    let objectUrl
    onReadAsset(asset.id, { signal: controller.signal }).then((blob) => {
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch((error) => { if (error?.name !== 'AbortError') setFailed(true) })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [asset?.id, asset?.mimeType, onReadAsset])
  if (url) return <img src={url} alt={alt} />
  return <span className="bs-brand-asset-placeholder" role={failed ? 'alert' : undefined}>{failed ? 'Preview unavailable' : asset.name}</span>
}

export async function downloadBrandAsset(asset, onReadAsset) {
  const blob = await onReadAsset(asset.id)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = asset.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
