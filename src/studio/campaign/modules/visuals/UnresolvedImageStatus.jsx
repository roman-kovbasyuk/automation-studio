import { useRef, useState } from 'react'
import { TextAction } from 'brutalist-design-system'
import { generationBlockFor } from '../../generationStatus.js'
import { useGenerationResolvable } from '../../useGenerationResolvable.js'
import { safeErrorMessage } from '../../../safeErrorMessage.js'

/** An image whose generation outcome is unknown: its reason, Check again and, after the wait, Mark as failed. */
export function UnresolvedImageStatus({ generation, onCheck, onResolve, disabled = false, now }) {
  const block = generationBlockFor({ ...generation, step: 'image' })
  const resolvable = useGenerationResolvable(block?.resolvableAt, now)
  const [error, setError] = useState(null)
  const running = useRef(false)
  async function resolve() {
    if (running.current || !onResolve) return
    running.current = true
    setError(null)
    try {
      const result = await onResolve(block.jobId)
      if (result?.ok === false) setError(result)
    } catch (failure) { setError(failure) }
    finally { running.current = false }
  }
  if (!block) return null
  return <>
    <p role="status">{resolvable ? 'We could not confirm the result.' : 'Checking whether the image was created.'} {block.reason}</p>
    {onCheck && <TextAction onClick={onCheck}>Check image status</TextAction>}
    {resolvable && onResolve && <TextAction disabled={disabled} onClick={resolve}>Mark as failed</TextAction>}
    {error && <p role="alert">{safeErrorMessage(error)}</p>}
  </>
}
