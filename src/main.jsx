import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import 'brutalist-design-system/styles.css'
import './styles/global.css'

const App = lazy(() => import.meta.env.MODE === 'prototype'
  ? import('./prototype/PrototypeApp.jsx')
  : import('./App.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<p role="status">Loading application…</p>}><App /></Suspense>
  </StrictMode>,
)
