import { useEffect, useState } from 'react'
import { Alert, AppButton } from "../../components/design-system/compatibility.jsx"
export const human = (value) =>
  String(value || '')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
export const date = (value) => (value ? new Date(value).toLocaleString() : '—')
export const options = (values) =>
  values.map((value) => ({ value, label: human(value) }))
export function AdminLink({ to, onNavigate, children, ...props }) {
  return (
    <a
      href={to}
      {...props}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return
        event.preventDefault()
        onNavigate(to)
      }}
    >
      {children}
    </a>
  )
}
export function RequestState({ loading, error, retry }) {
  if (loading) return <p role="status">Loading records…</p>
  if (!error) return null
  return (
    <Alert tone="danger" title={error.status === 403 ? 'Access denied' : 'Could not load records'}>
      <p>{error.message}</p>
      {retry && <AppButton onClick={retry}>Try again</AppButton>}
    </Alert>
  )
}
export function useAdminResource(load, dependencies) {
  const [state, setState] = useState({ loading: true, data: null, error: null })
  const [retryKey, setRetryKey] = useState(0)
  useEffect(() => {
    let active = true
    setState({ loading: true, data: null, error: null })
    Promise.resolve()
      .then(load)
      .then(
        (data) => {
          if (active) setState({ loading: false, data, error: null })
        },
        (error) => {
          if (active) setState({ loading: false, data: null, error })
        },
      )
    return () => {
      active = false
    }
  }, [...dependencies, retryKey])
  return { ...state, retry: () => setRetryKey((key) => key + 1) }
}
