import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { UnresolvedImageStatus } from './UnresolvedImageStatus.jsx'

const generation = { id: 'image-job', status: 'unknown', errorCode: null, unknownReason: 'asset_upload_timeout', timeoutAt: '2026-09-17T10:00:00.000Z' }
const due = Date.parse('2026-09-17T10:00:40.000Z')

afterEach(() => vi.useRealTimers())

describe('unresolved image status', () => {
  test('explains the reason and offers Mark as failed only after the wait', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let clock = due - 5_000
    const onResolve = vi.fn(async () => ({ ok: true }))
    render(<UnresolvedImageStatus generation={generation} onCheck={vi.fn()} onResolve={onResolve} now={() => clock} />)
    expect(screen.getByRole('status')).toHaveTextContent('Checking whether the image was created. The result arrived but could not be saved.')
    expect(screen.getByRole('button', { name: 'Check image status' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Mark as failed' })).not.toBeInTheDocument()
    clock = due
    await act(async () => { vi.advanceTimersByTime(5_000) })
    expect(screen.getByRole('status')).toHaveTextContent('We could not confirm the result.')
    vi.useRealTimers()
    await userEvent.click(screen.getByRole('button', { name: 'Mark as failed' }))
    expect(onResolve).toHaveBeenCalledExactlyOnceWith('image-job')
  })

  test('shows a refused resolution without leaving the tile', async () => {
    const onResolve = vi.fn(async () => ({ ok: false, code: 'forbidden', message: 'Only the person who started this generation or an admin can mark it as failed' }))
    render(<UnresolvedImageStatus generation={generation} onResolve={onResolve} now={() => due + 1} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mark as failed' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Only the person who started this generation or an admin can mark it as failed'))
  })
})
