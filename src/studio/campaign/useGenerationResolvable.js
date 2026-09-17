import { useEffect, useState } from 'react'

/** Whether an unknown outcome may be marked as failed yet; flips when its wait ends. */
export function useGenerationResolvable(resolvableAt, now = Date.now) {
  const due = () => Boolean(resolvableAt) && now() >= resolvableAt
  const [resolvable, setResolvable] = useState(due)
  useEffect(() => {
    setResolvable(Boolean(resolvableAt) && now() >= resolvableAt)
    if (!resolvableAt || now() >= resolvableAt) return undefined
    const timer = setTimeout(() => setResolvable(true), resolvableAt - now())
    return () => clearTimeout(timer)
  }, [resolvableAt, now])
  return resolvable
}
