import { useEffect, useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { CampaignPage } from './CampaignPage.jsx'
import { createCampaignRuntime } from './campaignRuntime.js'
import { makeScenario } from './testing/workspaceFixtures.js'

const measurements = vi.hoisted(() => ({ mounts: {}, renders: {} }))

vi.mock('./moduleRegistry.js', () => {
  const measured = id => function MeasuredModule({ port }) {
    measurements.renders[id] = (measurements.renders[id] ?? 0) + 1
    const [draft, setDraft] = useState('Saved draft')
    useEffect(() => {
      measurements.mounts[id] = (measurements.mounts[id] ?? 0) + 1
    }, [])
    return id === 'brief'
      ? <input aria-label="Brief draft" value={draft} onChange={event => {
        setDraft(event.target.value)
        port.setDirty(true)
      }} />
      : <p>{id} content</p>
  }
  return { moduleRegistry: Object.fromEntries(
    ['brief', 'copy', 'visuals', 'banners', 'review', 'distribute'].map(id => [id, measured(id)]),
  ) }
})

afterEach(() => {
  delete window.IntersectionObserver
  measurements.mounts = {}
  measurements.renders = {}
})

function installIntersectionObserver() {
  const observers = []
  window.IntersectionObserver = class {
    constructor(callback, options) {
      this.callback = callback
      this.options = options
      this.elements = new Set()
      this.targets = new Set()
      observers.push(this)
    }
    observe(element) { this.elements.add(element); this.targets.add(element) }
    unobserve(element) { this.elements.delete(element) }
    disconnect() { this.elements.clear() }
  }
  return {
    observers,
    intersect(id, isIntersecting = true) {
      const target = document.getElementById(`campaign-module-${id}`)
      const observer = observers.find(item => item.targets.has(target))
      act(() => observer.callback([{ target, isIntersecting }], observer))
    },
  }
}

test('only the active module mounts, even when IntersectionObserver is unavailable', () => {
  const scenario = makeScenario('copy-ready')
  const runtime = createCampaignRuntime({ ...scenario, api: {} })
  render(<CampaignPage runtime={runtime} activeModule="copy" onNavigate={() => {}} />)
  expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
  expect(measurements.mounts).toEqual({ copy: 1 })
  runtime.dispose()
})

test('visited views stay mounted but hidden when navigating to another task', () => {
  installIntersectionObserver()
  const scenario = makeScenario('copy-ready')
  const runtime = createCampaignRuntime({ ...scenario, api: {} })
  const props = { runtime, onNavigate: () => {} }
  const view = render(<CampaignPage {...props} activeModule="copy" />)
  view.rerender(<CampaignPage {...props} activeModule="visuals" />)
  expect(screen.getByText('visuals content')).toBeVisible()
  expect(screen.getByText('copy content')).not.toBeVisible()
  view.rerender(<CampaignPage {...props} activeModule="copy" />)
  expect(screen.getByText('copy content')).toBeVisible()
  expect(measurements.mounts).toEqual({ copy: 1, visuals: 1 })
  runtime.dispose()
})

test('a hidden dirty draft survives navigation and a title-only workspace refresh', async () => {
  const scenario = makeScenario('copy-ready')
  const server = structuredClone(scenario.workspace)
  const api = { getWorkspace: vi.fn(async () => server) }
  const runtime = createCampaignRuntime({ ...scenario, api })
  const props = { runtime, onNavigate: () => {} }
  const view = render(<CampaignPage {...props} activeModule="brief" />)
  const input = screen.getByRole('textbox', { name: 'Brief draft' })
  fireEvent.change(input, { target: { value: 'Keep this draft' } })
  view.rerender(<CampaignPage {...props} activeModule="copy" />)
  server.campaign.title = 'Renamed outside the module'
  server.campaign.revision += 1
  await act(() => runtime.refresh())
  expect(input).not.toBeVisible()
  view.rerender(<CampaignPage {...props} activeModule="brief" />)
  expect(screen.getByRole('textbox', { name: 'Brief draft' })).toBe(input)
  expect(input).toHaveValue('Keep this draft')
  expect(runtime.hasDirty()).toBe(true)
  expect(measurements.mounts.brief).toBe(1)
  runtime.dispose()
})

test('direct navigation activates a requested allowed module but never a locked target', () => {
  installIntersectionObserver()
  const scenario = makeScenario('copy-ready')
  const runtime = createCampaignRuntime({ ...scenario, api: {} })
  const props = { runtime, onNavigate: () => {} }
  const view = render(<CampaignPage {...props} activeModule="copy" />)
  view.rerender(<CampaignPage {...props} activeModule="visuals" />)
  expect(screen.getByText('visuals content')).toBeVisible()
  view.rerender(<CampaignPage {...props} activeModule="banners" />)
  expect(screen.queryByText('banners content')).not.toBeInTheDocument()
  runtime.dispose()
})
