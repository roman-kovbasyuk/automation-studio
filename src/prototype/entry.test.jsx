import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../studio/StudioApp.jsx', () => ({ StudioApp: () => <main>live studio</main>, ConnectedStudio: () => <main>prototype studio</main> }))

test('prototype entry renders without initializing live authentication or APIs', async () => {
  const { PrototypeApp } = await import('./PrototypeApp.jsx')
  render(<PrototypeApp />)
  expect(screen.getByRole('heading', { name: /offline prototype/i })).toBeInTheDocument()
})

test('normal builds ignore the prototype URL flag', async () => {
  const { default: App } = await import('../App.jsx')
  window.history.replaceState({}, '', '/?prototype=true')
  render(<App />)
  expect(screen.getByText('live studio')).toBeInTheDocument()
  window.history.replaceState({}, '', '/')
})
