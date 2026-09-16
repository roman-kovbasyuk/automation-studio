import { useEffect, useState } from 'react'

export function useBriefingCapability(api) {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let active = true
    setEnabled(false)
    if (!api?.getRuntimeConfig) return () => { active = false }
    api.getRuntimeConfig()
      .then(config => { if (active) setEnabled(config?.capabilities?.sourceBriefing === true) })
      .catch(() => { if (active) setEnabled(false) })
    return () => { active = false }
  }, [api])
  return enabled
}
