import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LauncherPage } from './LauncherPage.jsx'

const statusResponse = {
  services: [
    { id: 'studio', online: true, message: 'Online' },
    { id: 'admin', online: true, message: 'Online' },
    { id: 'docs', online: true, message: 'Online' },
    { id: 'orchestrator', online: true, message: 'Online' },
  ],
}

function mockFetch({ restart = { ok: true }, status = statusResponse } = {}) {
  return vi.fn(async (url, options = {}) => {
    if (url === '/api/v1/local-services/status') return new Response(JSON.stringify(status), { status: 200 })
    if (url === '/api/v1/local-services/restart-all') return new Response(JSON.stringify({ results: status.services.map(service => ({ id: service.id, ok: restart.ok, message: restart.ok ? 'Restart requested' : 'Restart failed' })) }), { status: restart.ok ? 200 : 500 })
    if (url.startsWith('/api/v1/local-services/') && options.method === 'POST') return new Response(JSON.stringify({ id: url.split('/').at(-2), ok: restart.ok, message: restart.ok ? 'Restart requested' : 'Restart failed' }), { status: restart.ok ? 200 : 500 })
    throw new Error(`Unexpected request: ${url}`)
  })
}

describe('LauncherPage', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('renders the local service cards with exact destinations', async () => {
    vi.stubGlobal('fetch', mockFetch())
    render(<LauncherPage />)

    expect(screen.getByRole('heading', { name: /local launchpad/i })).toBeInTheDocument()
    for (const button of screen.getAllByRole('button', { name: /restart/i })) {
      expect(button).toHaveClass('c-button')
    }
    for (const link of screen.getAllByRole('link', { name: /open/i })) {
      expect(link).toHaveClass('c-text-action')
    }
    expect(screen.getByRole('link', { name: /open main application/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /open admin/i })).toHaveAttribute('href', 'http://127.0.0.1:5181/mvp/admin/projects')
    expect(screen.getByRole('link', { name: /open documentation/i })).toHaveAttribute('href', 'http://127.0.0.1:5180')
    expect(screen.getByRole('link', { name: /open orchestrator/i })).toHaveAttribute('href', 'http://127.0.0.1:3010')
    await waitFor(() => expect(screen.getAllByText('Online')).toHaveLength(4))
  })

  it('keeps navigation available when status control is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    render(<LauncherPage />)

    expect(await screen.findByRole('status')).toHaveTextContent(/service status unavailable/i)
    expect(screen.getByRole('link', { name: /open documentation/i })).toBeInTheDocument()
  })

  it('restarts one service and ignores duplicate clicks while pending', async () => {
    let resolveRestart
    const fetch = vi.fn(async (url, options = {}) => {
      if (url === '/api/v1/local-services/status') return new Response(JSON.stringify(statusResponse))
      if (url === '/api/v1/local-services/admin/restart') {
        await new Promise(resolve => { resolveRestart = resolve })
        return new Response(JSON.stringify({ id: 'admin', ok: true, message: 'Restart requested' }))
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetch)
    render(<LauncherPage />)

    const button = await screen.findByRole('button', { name: /restart admin/i })
    fireEvent.click(button)
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(button)
    expect(fetch.mock.calls.filter(([url]) => url.includes('/admin/restart'))).toHaveLength(1)
    resolveRestart()
    await waitFor(() => expect(screen.getAllByText(/restart requested/i).length).toBeGreaterThanOrEqual(1))
    expect(button).not.toBeDisabled()
    expect(button).not.toHaveAttribute('aria-busy', 'true')
  })

  it('confirms restart all and renders per-service results', async () => {
    vi.stubGlobal('fetch', mockFetch())
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<LauncherPage />)

    fireEvent.click(await screen.findByRole('button', { name: /restart all/i }))
    await waitFor(() => expect(screen.getByText(/all services restart requested/i)).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledWith('/api/v1/local-services/restart-all', expect.objectContaining({ method: 'POST' }))
  })
})
