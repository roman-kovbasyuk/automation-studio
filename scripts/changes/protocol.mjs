import { isAbsolute, resolve } from 'node:path'

const REQUEST_KEYS = ['requestId', 'installedVersion', 'component', 'change']
const CONFIG_KEYS = ['appPath', 'checkScripts', 'masterBranch', 'agentExecutable', 'agentTimeoutMs']

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`)
}

function text(value, name, max) {
  if (typeof value !== 'string') throw new TypeError(`${name} must be a string`)
  const result = value.trim()
  if (!result || result.length > max) throw new TypeError(`${name} must be non-empty and at most ${max} characters`)
  return result
}

function noUnknown(value, keys, label) {
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new TypeError(`${label} contains unknown field: ${key}`)
}

export function validateRequest(value) {
  object(value, 'request')
  noUnknown(value, REQUEST_KEYS, 'request')
  const requestId = text(value.requestId, 'requestId', 80)
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(requestId)) throw new TypeError('requestId has an invalid format')
  return { requestId, installedVersion: text(value.installedVersion, 'installedVersion', 100), component: text(value.component, 'component', 100), change: text(value.change, 'change', 4000) }
}

export function validateConfig(value, { designSystemPath } = {}) {
  object(value, 'config')
  noUnknown(value, CONFIG_KEYS, 'config')
  const appPath = value.appPath
  if (typeof appPath !== 'string' || !isAbsolute(appPath)) throw new TypeError('appPath must be an absolute path')
  const resolved = resolve(appPath)
  if (designSystemPath && resolved === resolve(designSystemPath)) throw new TypeError('appPath cannot be the design-system checkout')
  if (!Array.isArray(value.checkScripts) || value.checkScripts.length === 0 || value.checkScripts.some((s) => typeof s !== 'string' || !s.trim())) throw new TypeError('checkScripts must contain at least one script name')
  const masterBranch = value.masterBranch ?? 'main'
  if (masterBranch !== 'main') throw new TypeError('masterBranch must be main')
  const agentExecutable = value.agentExecutable ?? 'codex'
  const agentTimeoutMs = value.agentTimeoutMs ?? 1800000
  if (typeof agentExecutable !== 'string' || !agentExecutable.trim()) throw new TypeError('agentExecutable must be a non-empty string')
  if (!Number.isSafeInteger(agentTimeoutMs) || agentTimeoutMs <= 0) throw new TypeError('agentTimeoutMs must be a positive integer')
  return { appPath: resolved, checkScripts: value.checkScripts.map((s) => s.trim()), masterBranch, agentExecutable, agentTimeoutMs }
}

export function canonicalRequest(value) { return JSON.stringify(validateRequest(value)) }

export function publicResult(record) {
  const result = { requestId: record.input.requestId, status: record.status ?? 'working' }
  if (record.version) result.version = record.version
  if (record.packagePath) result.packagePath = record.packagePath
  if (record.summary) result.summary = record.summary
  if (record.error) result.error = record.error
  if (record.adoption) result.adoption = record.adoption
  return result
}
