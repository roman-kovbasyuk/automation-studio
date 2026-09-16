import { render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { useBriefingCapability } from './useBriefingCapability.js'

function Probe({ api }) {
  return <output>{String(useBriefingCapability(api))}</output>
}

test('reports only an explicit sourceBriefing capability and falls back safely', async () => {
  const api = { getRuntimeConfig: vi.fn(async () => ({ capabilities: { sourceBriefing: true } })) }
  const { rerender } = render(<Probe api={api} />)
  expect(screen.getByRole('status')).toHaveTextContent('false')
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('true'))

  rerender(<Probe api={{ getRuntimeConfig: vi.fn(async () => { throw new Error('offline') }) }} />)
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('false'))
})
