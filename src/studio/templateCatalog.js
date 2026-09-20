import { createMsdPresentationTemplates } from '../../shared/msdPresentationTemplates.js'

export const TEMPLATE_GROUPS = Object.freeze([
  { id: 'banners', label: 'Banners', singularLabel: 'Banner', broadCategory: 'ads', ratio: '1 / 1' },
  { id: 'slides', label: 'Slides', singularLabel: 'slide', broadCategory: 'presentations', ratio: '16 / 9' },
])

const groupAliases = new Map([
  ['ads', 'banners'], ['banner', 'banners'], ['banners', 'banners'],
  ['presentations', 'slides'], ['presentation', 'slides'], ['slide', 'slides'], ['slides', 'slides'],
])

const BUILTIN_ENTRIES = Object.freeze({
  folkeuniversitetet: [
    ['fok-banner-variant-1', 'Variant 1', 'banners', 'placeholder', '1 / 1'],
    ['fok-banner-variant-2', 'Variant 1', 'banners', 'placeholder', '1 / 1'],
    ['fok-banner-variant-3', 'Variant 1', 'banners', 'placeholder', '1 / 1'],
    ['fok-slide-about', 'About', 'slides', 'placeholder', '16 / 9'],
    ['fok-slide-opening', 'Opening', 'slides', 'placeholder', '16 / 9'],
    ['fok-slide-thanks-1', 'Thank you page', 'slides', 'placeholder', '16 / 9'],
    ['fok-slide-thanks-2', 'Thank you page', 'slides', 'placeholder', '16 / 9'],
  ],
  novartis: [
    ['novartis-banner', 'Campaign banner', 'banners', 'image', '/assets/novartis/banner-vertical.webp'],
    ['novartis-cover-slide', 'Playbook cover slide', 'slides', 'image', '/assets/novartis/playbook-cover.webp'],
  ],
  msd: createMsdPresentationTemplates().map(item => [item.id, item.name, 'slides', 'manifest', item]),
})

function normalizeText(value) { return String(value ?? '').trim().toLowerCase() }
function systemNames(systemId) {
  return systemId === 'folkeuniversitetet' ? ['folkeuniversitetet', 'fok university', 'fok'] : [normalizeText(systemId)]
}

export function groupIdForTemplate(template) {
  const value = normalizeText(template?.group ?? template?.manifest?.group ?? template?.category ?? template?.manifest?.category ?? template?.manifest?.brand?.group)
  return groupAliases.get(value) ?? (value || 'banners')
}

export function formatLastUsed(lastUsedAt, locale = undefined) {
  if (!lastUsedAt) return 'Usage not recorded'
  const date = new Date(lastUsedAt)
  if (Number.isNaN(date.getTime())) return 'Usage not recorded'
  return `Last used ${new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.max(0, Math.round((Date.now() - date.getTime()) / 86400000)), 'day')}`
}

function belongsToSystem(template, systemId) {
  const values = [template?.brand?.name, template?.manifest?.brand?.name, template?.manifest?.brand?.systemId]
    .filter(Boolean).map(normalizeText)
  if (!values.length) return true
  return values.some(value => systemNames(systemId).includes(value))
}

function entryFromTemplate(template, systemId) {
  const manifest = template.manifest ?? template
  const groupId = groupIdForTemplate(template)
  const ratio = manifest.ratios?.find(item => item.id === 'square') ?? manifest.ratios?.[0]
  return {
    key: `${template.id}@${template.version ?? manifest.version ?? '1.0.0'}`,
    templateId: template.id,
    version: template.version ?? manifest.version ?? '1.0.0',
    name: template.name ?? manifest.name ?? template.id,
    brandId: systemId,
    groupId,
    source: 'published',
    preview: { kind: 'manifest', value: manifest },
    ratio: ratio ? `${ratio.width} × ${ratio.height}` : 'Preview',
    capabilities: { create: true, edit: false, delete: false },
    lastUsedAt: template.lastUsedAt ?? null,
    original: template,
  }
}

function entryFromBuiltin(item, systemId) {
  const [templateId, name, groupId, kind, value] = item
  return {
    key: `${templateId}@1.0.0`, templateId, version: '1.0.0', name, brandId: systemId, groupId,
    source: 'reference', preview: { kind, value }, ratio: groupId === 'banners' ? '1 / 1' : '16 / 9',
    capabilities: { create: true, edit: false, delete: false }, lastUsedAt: null,
  }
}

export function normalizeCatalog({ templates = [], systemId = 'folkeuniversitetet', groups = TEMPLATE_GROUPS } = {}) {
  const dynamicGroups = templates
    .map(groupIdForTemplate)
    .filter(id => !groups.some(group => group.id === id))
    .filter((id, index, values) => values.indexOf(id) === index)
    .map((id, index) => ({ id, label: id.replace(/[-_]+/g, ' ').replace(/\b\w/g, value => value.toUpperCase()), singularLabel: id, broadCategory: 'other', ratio: '4 / 3', order: index + groups.length }))
  const entries = templates.filter(template => belongsToSystem(template, systemId)).map(template => entryFromTemplate(template, systemId))
  // Reference cards keep an empty published catalog useful while allowing API
  // data to be the sole source of truth as soon as a system has entries.
  const builtins = entries.length
    ? []
    : (BUILTIN_ENTRIES[systemId] ?? BUILTIN_ENTRIES.folkeuniversitetet).map(item => entryFromBuiltin(item, systemId))
  const byKey = new Map([...builtins, ...entries].map(entry => [entry.key, entry]))
  return { groups: [...groups, ...dynamicGroups], entries: [...byKey.values()] }
}

export function selectCatalog({ entries = [], groups = TEMPLATE_GROUPS, groupId = 'all', query = '', sort = 'last-used' } = {}) {
  const needle = normalizeText(query)
  const filtered = entries.filter(entry => {
    if (groupId !== 'all' && entry.groupId !== groupId) return false
    if (!needle) return true
    return normalizeText(`${entry.name} ${entry.groupId} ${entry.ratio} ${formatLastUsed(entry.lastUsedAt)}`).includes(needle)
  })
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name) || a.key.localeCompare(b.key)
    const aDate = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : -Infinity
    const bDate = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : -Infinity
    return bDate - aDate || a.name.localeCompare(b.name) || a.key.localeCompare(b.key)
  })
  const visibleGroups = groupId === 'all' ? groups : groups.filter(group => group.id === groupId)
  return visibleGroups.map(group => ({ group, entries: sorted.filter(entry => entry.groupId === group.id) }))
}

export function readCatalogSelection(search = '') {
  const params = new URLSearchParams(search)
  const legacy = { ads: 'banners', banners: 'banners', presentations: 'slides', slides: 'slides', web: 'web', other: 'other' }
  const groupId = params.get('type') ?? legacy[params.get('category')] ?? 'all'
  return { groupId, systemId: params.get('system') ?? 'folkeuniversitetet', query: params.get('q') ?? '', sort: params.get('sort') ?? 'last-used' }
}

export const DESIGN_SYSTEMS = Object.freeze([
  { id: 'novartis', label: 'Novartis', eyebrow: 'NOVARTIS · V1 KIT', description: 'Progress in every heartbeat, carried through the supplied cardiovascular campaign board.' },
  { id: 'folkeuniversitetet', label: 'FOK University', matchNames: ['folkeuniversitetet', 'fok university'], eyebrow: 'FOK UNIVERSITY', description: 'Folkeuniversitetet foundations and approved template assignments.' },
  { id: 'msd', label: 'MSD', eyebrow: 'MSD · CORE DIRECTION', description: 'MSD template layouts assigned to the published brand system.' },
])
