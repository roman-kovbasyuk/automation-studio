import { useEffect, useRef } from 'react'
import { Dialog } from "../compatibility.jsx"

/** Mount-when-open adapter; package owns modal rendering, app restores its opener. */
export function PreviewDialog({ title, onClose, children }) {
  const opener = useRef(document.activeElement)
  useEffect(() => () => {
    requestAnimationFrame(() => { if (opener.current?.isConnected) opener.current.focus() })
  }, [])
  return <Dialog open title={title} closeLabel="Close preview" onOpenChange={open => { if (!open) onClose() }}>{children}</Dialog>
}
