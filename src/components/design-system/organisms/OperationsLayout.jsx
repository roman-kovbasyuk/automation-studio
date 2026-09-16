import { useEffect, useRef } from 'react'
import { Table as ExternalTable, Pagination, TextArea, Checkbox as CheckboxField } from 'brutalist-design-system'
import { SelectField, Drawer as ExternalDrawer, Dialog } from "../compatibility.jsx"
import './operations-layout.css'

// App-owned layout: upstream retired AppLayout. Shared controls stay upstream.
export function OperationsLayout({ className = '', navigation, header, inspector, feedback, children }) {
  return <div className={`app-operations-layout ${className}`}>
    {navigation && <aside className="app-operations-layout__navigation">{navigation}</aside>}
    <div className="app-operations-layout__main">{header && <header>{header}</header>}{children}</div>
    {inspector && <aside>{inspector}</aside>}
    {feedback && <div role="status">{feedback}</div>}
  </div>
}
export function OperationsNavigation({ title, children, ...props }) {
  return (
    <nav {...props} className="v2-operations-navigation">
      <div className="v2-operations-navigation__title">{title}</div>
      {children}
    </nav>
  )
}
export function InspectorPanel({ children, className = '', ...props }) {
  return (
    <aside {...props} className={`v2-inspector-panel ${className}`}>
      {children}
    </aside>
  )
}
export function DataTable({ className, columns, getRowId, rowKey, ...props }) {
  return (
    <div className={className}><ExternalTable {...props} rowKey={rowKey ?? getRowId} columns={columns.map(column => ({ ...column, render: column.render ?? column.cell }))} /></div>
  )
}
export function Drawer({ children, returnFocusRef, ...props }) {
  const wasOpen = useRef(props.open)
  useEffect(() => {
    if (wasOpen.current && !props.open && returnFocusRef)
      requestAnimationFrame(() => returnFocusRef.current?.focus())
    wasOpen.current = props.open
  }, [props.open, returnFocusRef])
  return (
    <ExternalDrawer {...props}>
      <div className="v2-drawer-content">{children}</div>
    </ExternalDrawer>
  )
}
export { Pagination, TextArea, SelectField, CheckboxField, Dialog }
