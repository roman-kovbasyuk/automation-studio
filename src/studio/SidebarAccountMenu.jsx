import { useEffect, useRef, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import './sidebar-account-menu.css'

function initials(label) {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? parts.slice(0, 2) : parts.slice(0, 2)).map(part => part[0]).join('').toUpperCase() || '?'
}

export function SidebarAccountMenu({ label, actions = [], onAction }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsidePointer = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return <div className="bs-sidebar-account" ref={rootRef}>
    <button
      type="button"
      className="bs-sidebar-account__trigger"
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={() => setOpen(value => !value)}
    >
      <span className="bs-sidebar-account__avatar" data-profile-avatar aria-hidden="true">{initials(label)}</span>
      <span className="bs-sidebar-account__name">{label}</span>
      <ChevronUp className="bs-sidebar-account__chevron" data-profile-chevron aria-hidden="true" size={18} strokeWidth={1.75} />
    </button>
    {open && <div className="bs-sidebar-account__menu" role="menu" aria-label={`${label} menu`}>
      {actions.map(action => <button
        key={action.id}
        type="button"
        role="menuitem"
        className="bs-sidebar-account__item"
        disabled={action.disabled}
        onClick={() => {
          onAction?.(action.id)
          setOpen(false)
        }}
      >{action.label}</button>)}
    </div>}
  </div>
}
