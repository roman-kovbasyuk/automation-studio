import { useEffect, useState } from 'react'
import * as StudioModule from '../studio/StudioApp.jsx'
import { AtomsRoot as DesignSystemRoot, Button, StatusBadge } from 'brutalist-design-system'
import { installPrototypeNetworkGuard } from './networkGuard.js'
import { createPrototypeSession } from './session.js'
import './prototype.css'

const ConnectedStudio = StudioModule.ConnectedStudio ?? StudioModule.StudioApp

// Install before rendering so prototype modules cannot accidentally initialize a live client.
installPrototypeNetworkGuard()

export function PrototypeApp() {
  const [session, setSession] = useState(null)
  const [actorRole, setActorRole] = useState('marketer')
  const [error, setError] = useState(null)
  useEffect(() => {
    let active = true
    let current
    createPrototypeSession({ latencyMs: 0 })
      .then(value => { current = value; if (active) { setSession(value); setActorRole(value.scenarios.getActor()) } else value.dispose() })
      .catch(value => { if (active) setError(value) })
    return () => { active = false; void current?.dispose() }
  }, [])
  if (error) return <DesignSystemRoot><main aria-labelledby="prototype-title"><p>Banner Studio</p><h1 id="prototype-title">Offline prototype</h1><p role="alert">The local prototype could not start: {error.message}</p><Button type="button" variant="primary" onClick={() => window.location.reload()}>Reload prototype</Button></main></DesignSystemRoot>
  if (!session) {
    return (
      <main aria-labelledby="prototype-title">
        <p>Banner Studio</p>
        <h1 id="prototype-title">Offline prototype</h1>
        <p>This local prototype runs with bundled data and does not require authentication or services.</p>
        <p role="status">Loading prototype workspace…</p>
      </main>
    )
  }
  return (
    <DesignSystemRoot>
      <div data-prototype-mode="true">
      <div className="bs-prototype-toolbar">
      <div className="bs-prototype-badge"><StatusBadge status="pending">Prototype · local simulation</StatusBadge></div>
      <details className="bs-prototype-controls">
        <summary>Demo controls</summary>
        <div className="bs-prototype-controls__panel">
          <span>Act as</span>
          <div role="group" aria-label="Prototype role">
            {['marketer', 'designer'].map(role => <Button key={role} type="button" size="compact" variant={actorRole === role ? 'primary' : 'secondary'} aria-pressed={actorRole === role} onClick={async () => { await session.scenarios.setActor(role); setActorRole(role) }}>{role}</Button>)}
          </div>
          <Button type="button" size="compact" variant="secondary" onClick={async () => { await session.reset(); window.location.reload() }}>Reset local prototype</Button>
        </div>
      </details>
      </div>
      <ConnectedStudio
        key={actorRole}
        api={session.api}
        demo
        prototypeMode
        authMethods={{
          demo: true,
          role: actorRole,
          setRole: async role => { await session.scenarios.setActor(role); setActorRole(role) },
          signOut: async () => {},
          requestEmailChange: async () => { throw new Error('Email changes are unavailable in the local prototype.') },
          setupPassword: async () => { throw new Error('Password setup is unavailable in the local prototype.') },
          disconnectGoogle: async () => { throw new Error('Google disconnect is unavailable in the local prototype.') },
          getToken: async () => null,
          getHeaders: async () => ({ 'X-Studio-Prototype': 'true' }),
        }}
        onSignOut={() => {}}
      />
      </div>
    </DesignSystemRoot>
  )
}

export default PrototypeApp
