import { Component, lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Button, AtomsRoot as DesignSystemRoot } from 'brutalist-design-system'
import 'brutalist-design-system/styles.css'
import './styles/global.css'

class EntryBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return <DesignSystemRoot><main role="alert" aria-labelledby="entry-error-title"><h1 id="entry-error-title">Banner Studio could not start</h1><p>{this.state.error.message || 'Reload this page to try again.'}</p><Button type="button" variant="primary" onClick={() => window.location.reload()}>Reload prototype</Button></main></DesignSystemRoot>
    return this.props.children
  }
}

const App = lazy(() => import.meta.env.MODE === 'prototype'
  ? import('./prototype/PrototypeApp.jsx')
  : import('./App.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EntryBoundary><Suspense fallback={<p role="status">Loading application…</p>}><App /></Suspense></EntryBoundary>
  </StrictMode>,
)
