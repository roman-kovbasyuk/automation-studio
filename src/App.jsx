import { lazy, Suspense } from 'react'
import { LauncherPage } from './launcher/LauncherPage.jsx'
import { StudioApp } from './studio/StudioApp.jsx'

const ApplicationDesignSystemPage = lazy(() => import('./screens/ApplicationDesignSystemPage.jsx'))
const DevModulePlayground = import.meta.env.DEV
  ? lazy(() => import('./studio/campaign/testing/ModulePlayground.jsx'))
  : null

export default function App() {
  if (/^\/mvp\/?$/.test(location.pathname)) {
    history.replaceState(history.state, '', `/${location.search}${location.hash}`)
  }
  if (/^\/launcher\/?$/.test(location.pathname)) {
    return <LauncherPage />
  }
  if (import.meta.env.DEV && DevModulePlayground && /^\/mvp\/dev\/modules(?:\/[^/]+)?\/?$/.test(location.pathname)) {
    return <Suspense fallback={<p role="status">Loading fixture module playground…</p>}><DevModulePlayground /></Suspense>
  }
  if (/^\/design-system\/?$/.test(location.pathname)) {
    return <Suspense fallback={<p role="status">Loading application design system…</p>}>
      <ApplicationDesignSystemPage />
    </Suspense>
  }
  return <StudioApp />
}
