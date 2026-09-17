import { useRef, useState } from 'react'
import { AppButton } from '../../components/design-system/compatibility.jsx'
import { DecisionNotice } from '../../components/design-system/molecules/DecisionNotice.jsx'
import { ErrorNotice } from '../primitives.jsx'
import { useGenerationResolvable } from './useGenerationResolvable.js'

/**
 * Explains the generation that blocks editing (D33): a running job, an outcome still being
 * checked with its reason, and, 40 seconds after the job's timeout, Mark as failed.
 */
export function GenerationBlockNotice({ block, onCheck, onResolve, disabled = false, now = Date.now }) {
  const resolvable = useGenerationResolvable(block?.resolvableAt, now)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const running = useRef(false)
  if (!block) return null

  async function run(kind, action) {
    if (running.current || !action) return
    running.current = true
    setBusy(kind); setError(null)
    try {
      const result = await action(block.jobId)
      if (result?.ok === false) setError(result)
    } catch (failure) { setError(failure) }
    finally { running.current = false; setBusy(null) }
  }

  const actions = <>
    {onCheck && <AppButton disabled={disabled || !!busy} busy={busy === 'check'} onClick={() => run('check', onCheck)}>Check again</AppButton>}
    {block.status === 'unknown' && resolvable && onResolve && <AppButton disabled={disabled || !!busy} busy={busy === 'resolve'}
      onClick={() => run('resolve', onResolve)}>Mark as failed</AppButton>}
  </>
  if (block.status === 'pending') {
    return <DecisionNotice label="Generation in progress" busy={!!busy} actions={actions}>
      {`${block.name} is running. You can continue when it finishes.`}
    </DecisionNotice>
  }
  return <>
    <DecisionNotice label={resolvable ? 'We could not confirm the result' : 'Checking the result'} busy={!!busy} actions={actions}>
      {resolvable
        ? `${block.name} did not return a confirmed result. ${block.reason ?? ''} Check again, or mark it as failed to continue.`.replace(/\s+/g, ' ').trim()
        : `Checking whether ${block.name.toLowerCase()} finished. ${block.reason ?? ''}`.trim()}
    </DecisionNotice>
    <ErrorNotice error={error} />
  </>
}
