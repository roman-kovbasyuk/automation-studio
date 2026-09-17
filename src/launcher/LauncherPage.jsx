import { ArrowUpRight, BookOpen, Boxes, RefreshCw, Server, Settings2, Telescope } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppButton } from '../components/design-system/atoms/AppButton.jsx'
import { AtomsRoot as DesignSystemRoot } from 'brutalist-design-system'
import { ActionCard, StatusBadge } from "../components/design-system/compatibility.jsx"
import './launcher.css'

export const LAUNCHER_SERVICES = Object.freeze([
  Object.freeze({ id: 'observatory', label: 'Observatory', description: 'Track implementation tasks and connector status.', port: 6002, href: 'http://127.0.0.1:6002/', icon: Telescope }),
  Object.freeze({ id: 'design-system', label: 'Design System', description: 'Browse shared foundations, components and UI blocks.', port: 5178, href: 'http://127.0.0.1:5178/', icon: Boxes }),
  Object.freeze({ id: 'studio', label: 'Main application', description: 'Create, review and deliver campaigns.', port: 5176, href: '/', icon: Boxes }),
  Object.freeze({ id: 'admin', label: 'Admin', description: 'Manage users, projects and product recipes.', port: 5181, href: 'http://127.0.0.1:5181/mvp/admin/projects', icon: Settings2 }),
  Object.freeze({ id: 'docs', label: 'Documentation', description: 'Read workflows, decisions and team guidance.', port: 5180, href: 'http://127.0.0.1:5180', icon: BookOpen }),
  Object.freeze({ id: 'orchestrator', label: 'Orchestrator / API', description: 'Inspect the local service control surface.', port: 3010, href: 'http://127.0.0.1:3010', icon: Server }),
])

const statusPath = '/api/v1/local-services/status'

async function readResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'The local service control surface is unavailable.')
  return data
}

export function LauncherPage() {
  const [statuses, setStatuses] = useState({})
  const [statusMessage, setStatusMessage] = useState('Checking local services…')
  const [busy, setBusy] = useState(() => new Set())
  const [results, setResults] = useState({})
  const [notice, setNotice] = useState('')
  const services = useMemo(() => LAUNCHER_SERVICES, [])

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch(statusPath)
      const data = await readResponse(response)
      setStatuses(Object.fromEntries((data.services || []).map(service => [service.id, service])))
      setStatusMessage('Service status updated.')
    } catch (error) {
      setStatusMessage(`Service status unavailable. ${error.message}`)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
    const timer = window.setInterval(refreshStatus, 10_000)
    return () => window.clearInterval(timer)
  }, [refreshStatus])

  const markBusy = (id, value) => setBusy(current => {
    const next = new Set(current)
    if (value) next.add(id)
    else next.delete(id)
    return next
  })

  async function restart(service) {
    if (busy.has(service.id)) return
    markBusy(service.id, true)
    try {
      const response = await fetch(`/api/v1/local-services/${service.id}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: `launcher-${service.id}-${Date.now()}` }),
      })
      const data = await readResponse(response)
      setResults(current => ({ ...current, [service.id]: data.message || 'Restart requested.' }))
      setNotice(`${service.label} restart requested.`)
      window.setTimeout(refreshStatus, 900)
    } catch (error) {
      setResults(current => ({ ...current, [service.id]: error.message }))
      setNotice(`${service.label} restart failed.`)
    } finally {
      markBusy(service.id, false)
    }
  }

  async function restartAll() {
    if (busy.has('all') || !window.confirm('Restart all local services?')) return
    markBusy('all', true)
    try {
      const response = await fetch('/api/v1/local-services/restart-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: `launcher-all-${Date.now()}` }),
      })
      const data = await readResponse(response)
      setResults(Object.fromEntries((data.results || []).map(result => [result.id, result.message || (result.ok ? 'Restart requested.' : 'Restart failed.')])) )
      setNotice('All services restart requested.')
      window.setTimeout(refreshStatus, 1_200)
    } catch (error) {
      setNotice(`Restart all failed. ${error.message}`)
    } finally {
      markBusy('all', false)
    }
  }

  return (
    <DesignSystemRoot><main className="launcher" id="launcher-services">
      <header className="launcher__header">
        <div>
          <p className="launcher__eyebrow">Automation Studio / local workspace</p>
          <h1>Local launchpad</h1>
          <p className="launcher__lede">Open the tools that run the studio, keep the surfaces close, and restart the local stack when it needs a clean start.</p>
        </div>
        <AppButton variant="danger" onClick={restartAll} busy={busy.has('all')}>
          <RefreshCw size={18} aria-hidden="true" />
          {busy.has('all') ? 'Restarting…' : 'Restart all'}
        </AppButton>
      </header>

      <p className="launcher__status" role="status" aria-live="polite">{notice || statusMessage}</p>

      <section className="launcher__grid" aria-label="Local tools">
        {services.map(service => {
          const Icon = service.icon
          const status = statuses[service.id]
          const message = results[service.id]
          return (
            <ActionCard key={service.id} label={service.label}>
              <div className="launcher-card-content">
              <div className="launcher-card__topline">
                <span className="launcher-card__icon" aria-hidden="true"><Icon size={20} /></span>
                <StatusBadge tone={status?.online ? 'success' : status?.online === false ? 'danger' : 'neutral'}>{status ? (status.online ? 'Online' : 'Offline') : 'Checking'}</StatusBadge>
              </div>
              <p>{service.description}</p>
              <code>127.0.0.1:{service.port}</code>
              {message && <small className="launcher-card__result">{message}</small>}
              <div className="launcher-card__actions">
                <AppButton as="a" variant="primary" href={service.href} aria-label={`Open ${service.label}`}>
                  Open <ArrowUpRight size={16} aria-hidden="true" />
                </AppButton>
                <AppButton variant="danger" aria-label={`Restart ${service.label}`} onClick={() => restart(service)} busy={busy.has(service.id)} disabled={busy.has('all')}>
                  <RefreshCw size={16} aria-hidden="true" />
                  {busy.has(service.id) ? 'Restarting…' : 'Restart'}
                </AppButton>
              </div>
              </div>
            </ActionCard>
          )
        })}
      </section>
    </main></DesignSystemRoot>
  )
}
