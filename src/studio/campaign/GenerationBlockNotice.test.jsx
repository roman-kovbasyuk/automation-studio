import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { GenerationBlockNotice } from './GenerationBlockNotice.jsx'

const reason = 'The AI service did not answer within the time limit, so we cannot tell whether it finished.'
const unknown = { jobId: 'job-1', status: 'unknown', step: 'copy', name: 'Copy generation', reason, resolvableAt: 100_000 }

afterEach(() => vi.useRealTimers())

describe('generation block notice', () => {
  test('a running job offers only Check again', () => {
    render(<GenerationBlockNotice block={{ ...unknown, status: 'pending', reason: null, resolvableAt: null }} onCheck={vi.fn()} onResolve={vi.fn()} />)
    expect(screen.getByText('Copy generation is running. You can continue when it finishes.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Mark as failed' })).not.toBeInTheDocument()
  })

  test('an unknown outcome shows its reason and offers Mark as failed once the wait has passed', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let clock = 60_000
    render(<GenerationBlockNotice block={unknown} onCheck={vi.fn()} onResolve={vi.fn()} now={() => clock} />)
    expect(screen.getByRole('region', { name: 'Checking the result' })).toHaveTextContent(`Checking whether copy generation finished. ${reason}`)
    expect(screen.queryByRole('button', { name: 'Mark as failed' })).not.toBeInTheDocument()
    clock = 100_000
    await act(async () => { vi.advanceTimersByTime(40_000) })
    expect(screen.getByRole('region', { name: 'We could not confirm the result' })).toHaveTextContent(reason)
    expect(screen.getByRole('button', { name: 'Mark as failed' })).toBeEnabled()
  })

  test('marking as failed calls the resolver once and shows a refusal without raw text', async () => {
    const onResolve = vi.fn(async () => ({ ok: false, code: 'generation_resolution_too_early', message: 'The outcome may still arrive. Check again shortly.' }))
    render(<GenerationBlockNotice block={unknown} onCheck={vi.fn()} onResolve={onResolve} now={() => 200_000} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mark as failed' }))
    expect(onResolve).toHaveBeenCalledExactlyOnceWith('job-1')
    await waitFor(() => expect(screen.getByText('The outcome may still arrive. Check again shortly.')).toBeVisible())
  })
})
