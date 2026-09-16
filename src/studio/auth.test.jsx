import { afterEach, expect, test, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStudioAuth } from './auth.js'

afterEach(() => {
  sessionStorage.clear()
  history.replaceState({}, '', '/mvp')
  vi.unstubAllGlobals()
})

test('retains an explicitly selected local demo role after opening a normal link', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ demo: true }) })))
  history.replaceState({}, '', '/mvp/system?demoRole=admin')
  const first = renderHook(() => useStudioAuth())
  await waitFor(() => expect(first.result.current.demo).toBe(true))
  expect(sessionStorage.getItem('studio-demo-role')).toBe('admin')
  first.unmount()
  history.replaceState({}, '', '/mvp/system')
  const next = renderHook(() => useStudioAuth())
  await waitFor(() => expect(next.result.current.demo).toBe(true))
  expect(next.result.current.role).toBe('admin')
})
