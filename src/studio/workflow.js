export const editableStatuses = new Set(['draft', 'copy_ready', 'direction_selected', 'composed'])
export function routeFromLocation(path, search = '') {
  const adminMatch = path.match(/\/(?:admin)(?:\/([^/]+))?(?:\/([^/]+))?\/?$/)
  if (adminMatch) {
    let section = 'overview', id
    try { section = adminMatch[1] ? decodeURIComponent(adminMatch[1]) : 'overview'; id = adminMatch[2] ? decodeURIComponent(adminMatch[2]) : undefined } catch { return { view: 'admin', section: 'overview' } }
    return { view: 'admin', section, ...(id ? { id } : {}), ...(search ? { search } : {}) }
  }

  if (/\/(?:templates)\/?$/.test(path)) return { view: 'templates' }
  if (/\/(?:new)\/?$/.test(path)) return { view: 'new', asset: new URLSearchParams(search).get('asset') }
  if (/\/(?:system)\/new\/materials\/?$/.test(path)) return { view: 'system', mode: 'new', step: 'materials' }
  const brandMatch = path.match(/\/(?:system)\/([^/]+)(?:\/(materials|review|publish))?\/?$/)
  if (brandMatch) {
    let id
    try { id = decodeURIComponent(brandMatch[1]) } catch { return { view: 'system' } }
    return { view: 'system', id, step: brandMatch[2] ?? 'published' }
  }
  if (/\/(?:system)\/?$/.test(path)) return { view: 'system' }
  if (/\/(?:settings)\/?$/.test(path)) return { view: 'settings' }
  const match = path.match(/\/(?:campaign|review|designer)\/([^/]+)/)
  if (match) {
    let id
    try { id = decodeURIComponent(match[1]) } catch { return { view: 'campaigns' } }
    const raw = new URLSearchParams(search).get('step')
    const step = raw !== null && /^[0-7]$/.test(raw) ? Number(raw) : null
    return { view: 'campaign', id, step }
  }
  return { view: 'campaigns' }
}
export const statusLabel = (status = '') => ({ copy_ready:'Copy ready', direction_selected:'Visual selected', composed:'Banners composed', in_review:'In review', changes_requested:'Changes requested', ready:'Ready for approval', approved:'Approved', delivered:'Delivered', draft:'Draft' }[status] ?? status)
