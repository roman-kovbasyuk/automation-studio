import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { validateConfig } from './protocol.mjs'
import { runCommand } from './process.mjs'

const PACKAGE_NAME = 'brutalist-design-system'
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/
const TERMINAL_PHASES = new Set(['installed', 'failed'])
const CHECK_TIMEOUT_MS = 30 * 60 * 1000

const delay = (ms) => new Promise((done) => setTimeout(done, ms))

function coded(code, detail) {
  return Object.assign(new Error(`${code}: ${detail}`), { code })
}

function errorText(error) {
  return (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').trim().slice(0, 2000) || 'APP_UPDATE_FAILED: Unknown application update failure'
}

function ensureRequestId(value) {
  if (typeof value !== 'string' || !REQUEST_ID.test(value)) throw coded('CONFIG_INVALID', 'requestId has an invalid format')
  return value
}

function sha512(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`
}

async function exists(path) {
  try { await stat(path); return true } catch (error) { if (error.code === 'ENOENT') return false; throw error }
}

async function readJson(path, code, detail) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch (error) { throw coded(code, `${detail}: ${error.message}`) }
}

async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
    await rename(temporary, path)
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error })
  }
}

async function snapshot(path) {
  try {
    const bytes = await readFile(path)
    return { exists: true, data: bytes.toString('base64'), integrity: sha512(bytes) }
  } catch (error) {
    if (error.code === 'ENOENT') return { exists: false, data: null, integrity: null }
    throw error
  }
}

async function fileIdentity(path) {
  try {
    const bytes = await readFile(path)
    return { exists: true, size: bytes.length, integrity: sha512(bytes) }
  } catch (error) {
    if (error.code === 'ENOENT') return { exists: false, size: 0, integrity: null }
    throw error
  }
}

async function dependencyIdentity(appPath) {
  return {
    packageJson: await fileIdentity(join(appPath, 'package.json')),
    packageLock: await fileIdentity(join(appPath, 'package-lock.json')),
  }
}

function sameIdentity(left, right) {
  return Boolean(left && right && JSON.stringify(left) === JSON.stringify(right))
}

async function restoreSnapshot(path, saved) {
  if (!saved || typeof saved.exists !== 'boolean') throw coded('DEPENDENCY_RESTORE_FAILED', 'recovery journal has an invalid file snapshot')
  if (!saved.exists) {
    await unlink(path).catch((error) => { if (error.code !== 'ENOENT') throw error })
    return
  }
  const bytes = Buffer.from(saved.data, 'base64')
  if (sha512(bytes) !== saved.integrity) throw coded('DEPENDENCY_RESTORE_FAILED', 'recovery journal backup checksum does not match')
  const temporary = `${path}.${process.pid}.${randomUUID()}.restore`
  try {
    await writeFile(temporary, bytes, { flag: 'wx' })
    await rename(temporary, path)
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error })
  }
}

function journalPath(dataDir, requestId) {
  return join(resolve(dataDir), 'app-updates', ensureRequestId(requestId), 'journal.json')
}

async function saveJournal(path, journal, patch) {
  const next = { ...journal, ...patch, updatedAt: new Date().toISOString() }
  await atomicJson(path, next)
  Object.assign(journal, next)
  return journal
}

function lockPath(dataDir, appPath) {
  const key = createHash('sha256').update(resolve(appPath)).digest('hex')
  return join(resolve(dataDir), 'app-locks', `${key}.lock`)
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null
  try { process.kill(pid, 0); return true } catch (error) { if (error.code === 'ESRCH') return false; return null }
}

async function acquireAppLock(path) {
  await mkdir(dirname(path), { recursive: true })
  for (;;) {
    const owner = { pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() }
    try {
      const handle = await open(path, 'wx', 0o600)
      try { await handle.writeFile(JSON.stringify(owner)) } finally { await handle.close() }
      return owner
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      let existing
      try { existing = JSON.parse(await readFile(path, 'utf8')) } catch { throw coded('APP_LOCK_AMBIGUOUS', 'application lock ownership is unreadable') }
      const alive = pidAlive(existing?.pid)
      if (alive === null) throw coded('APP_LOCK_AMBIGUOUS', 'application lock ownership is ambiguous')
      if (alive) { await delay(20); continue }
      const stale = `${path}.stale.${process.pid}.${randomUUID()}`
      try { await rename(path, stale); await unlink(stale) } catch (race) { if (race.code !== 'ENOENT') await delay(5) }
    }
  }
}

async function releaseAppLock(path, owner) {
  let existing
  try { existing = JSON.parse(await readFile(path, 'utf8')) } catch (error) { if (error.code === 'ENOENT') return; throw coded('APP_LOCK_AMBIGUOUS', 'application lock changed before release') }
  if (existing.token !== owner.token) throw coded('APP_LOCK_AMBIGUOUS', 'application lock changed before release')
  await unlink(path)
}

async function withAppLock(dataDir, appPath, fn) {
  const path = lockPath(dataDir, appPath)
  const owner = await acquireAppLock(path)
  try { return await fn() } finally { await releaseAppLock(path, owner) }
}

function dependencyDeclaration(manifest) {
  const declarations = ['dependencies', 'devDependencies', 'optionalDependencies']
    .flatMap((section) => typeof manifest?.[section]?.[PACKAGE_NAME] === 'string' ? [{ section, value: manifest[section][PACKAGE_NAME] }] : [])
  if (declarations.length !== 1) throw coded('CURRENT_VERSION_MISMATCH', `${PACKAGE_NAME} must have exactly one dependency declaration`)
  return declarations[0].value
}

async function requestInput(dataDir, requestId) {
  const record = await readJson(join(resolve(dataDir), 'requests', `${requestId}.json`), 'CONFIG_INVALID', 'request record could not be read')
  if (record?.input?.requestId !== requestId || typeof record.input.installedVersion !== 'string') throw coded('CONFIG_INVALID', 'request record does not contain the installed version')
  return record.input
}

function validateRelease(release) {
  if (!release || typeof release !== 'object') throw coded('CONFIG_INVALID', 'release is required')
  if (typeof release.version !== 'string' || !release.version) throw coded('CONFIG_INVALID', 'release version is required')
  if (typeof release.packagePath !== 'string' || !isAbsolute(release.packagePath)) throw coded('CONFIG_INVALID', 'release packagePath must be absolute')
  if (typeof release.integrity !== 'string' || !release.integrity.startsWith('sha512-')) throw coded('CONFIG_INVALID', 'release integrity must be SHA-512')
}

async function verifyPreconditions({ config, release, dataDir, requestId, run }) {
  let checkedConfig
  try { checkedConfig = validateConfig(config) } catch (error) { throw coded('CONFIG_INVALID', error.message) }
  validateRelease(release)
  const input = await requestInput(dataDir, requestId)
  const packageFile = join(checkedConfig.appPath, 'package.json')
  const lockFile = join(checkedConfig.appPath, 'package-lock.json')
  const installedFile = join(checkedConfig.appPath, 'node_modules', PACKAGE_NAME, 'package.json')
  const initialIdentity = await dependencyIdentity(checkedConfig.appPath)
  const manifest = await readJson(packageFile, 'CONFIG_INVALID', 'application package.json could not be read')
  const lock = await readJson(lockFile, 'UNSUPPORTED_PACKAGE_MANAGER', 'application package-lock.json could not be read')
  for (const script of checkedConfig.checkScripts) {
    if (typeof manifest?.scripts?.[script] !== 'string' || !manifest.scripts[script].trim()) throw coded('CHECK_SCRIPT_MISSING', `application check script is missing: ${script}`)
  }
  const declared = dependencyDeclaration(manifest)
  const locked = lock?.packages?.[`node_modules/${PACKAGE_NAME}`]?.version
  const installed = (await readJson(installedFile, 'CURRENT_VERSION_MISMATCH', `installed ${PACKAGE_NAME} metadata could not be read`))?.version
  if (declared !== input.installedVersion || locked !== input.installedVersion || installed !== input.installedVersion) {
    throw coded('CURRENT_VERSION_MISMATCH', `request says ${input.installedVersion}; declared=${declared}, locked=${locked ?? 'missing'}, installed=${installed ?? 'missing'}`)
  }
  const status = (await run('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', 'package.json', 'package-lock.json'], { cwd: checkedConfig.appPath })).stdout.trim()
  if (status) throw coded('DEPENDENCY_FILES_DIRTY', 'package.json or package-lock.json has local changes')
  let packageBytes
  try { packageBytes = await readFile(release.packagePath) } catch (error) { throw coded('PACKAGE_CHECKSUM_MISMATCH', `release package could not be read: ${error.message}`) }
  if (sha512(packageBytes) !== release.integrity) throw coded('PACKAGE_CHECKSUM_MISMATCH', 'release package SHA-512 does not match its manifest')
  const verifiedIdentity = await dependencyIdentity(checkedConfig.appPath)
  if (!sameIdentity(initialIdentity, verifiedIdentity)) throw coded('ADOPTION_FILE_CONFLICT', 'dependency files changed during application validation')
  return { config: checkedConfig, input, verifiedIdentity }
}

async function restoreJournal({ journal, path, run, recoveredAfterInterruption = false, failure }) {
  const current = await dependencyIdentity(journal.appPath)
  if (!sameIdentity(current, journal.originalIdentity) && !sameIdentity(current, journal.currentIdentity)) {
    const text = 'ADOPTION_FILE_CONFLICT: dependency files changed outside this transaction; backups were retained'
    await saveJournal(path, journal, { phase: 'conflict', error: text })
    return { status: 'failed', error: text }
  }
  try {
    await saveJournal(path, journal, { phase: 'restoring', error: errorText(failure) })
    if (!sameIdentity(current, journal.originalIdentity)) {
      await restoreSnapshot(join(journal.appPath, 'package.json'), journal.previous.packageJson)
      await restoreSnapshot(join(journal.appPath, 'package-lock.json'), journal.previous.packageLock)
    }
    if (!sameIdentity(await dependencyIdentity(journal.appPath), journal.originalIdentity)) throw coded('DEPENDENCY_RESTORE_FAILED', 'restored dependency file bytes do not match the journal')
    await run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: journal.appPath, timeoutMs: CHECK_TIMEOUT_MS })
    if (!sameIdentity(await dependencyIdentity(journal.appPath), journal.originalIdentity)) throw coded('DEPENDENCY_RESTORE_FAILED', 'npm ci changed the restored dependency files')
    const text = errorText(failure)
    await saveJournal(path, journal, { phase: 'failed', error: text, recoveredAfterInterruption })
    return { status: 'failed', error: text }
  } catch (error) {
    const text = error.message.startsWith('DEPENDENCY_RESTORE_FAILED:') ? error.message : `DEPENDENCY_RESTORE_FAILED: ${errorText(error)}`
    await saveJournal(path, journal, { phase: 'restore_failed', error: text, originalFailure: errorText(failure) })
    return { status: 'failed', error: text }
  }
}

async function incompleteJournals(dataDir, appPath) {
  const root = join(resolve(dataDir), 'app-updates')
  let entries
  try { entries = await readdir(root, { withFileTypes: true }) } catch (error) { if (error.code === 'ENOENT') return []; throw error }
  const journals = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !REQUEST_ID.test(entry.name)) continue
    const path = join(root, entry.name, 'journal.json')
    let journal
    try { journal = JSON.parse(await readFile(path, 'utf8')) } catch (error) { if (error.code === 'ENOENT') continue; throw coded('ADOPTION_RECOVERY_FAILED', `recovery journal ${entry.name} is unreadable`) }
    if (resolve(journal.appPath ?? '') === appPath && !TERMINAL_PHASES.has(journal.phase)) journals.push({ journal, path })
  }
  return journals.sort((a, b) => String(a.journal.createdAt).localeCompare(String(b.journal.createdAt)))
}

async function recoverInterrupted(dataDir, appPath, run) {
  for (const item of await incompleteJournals(dataDir, appPath)) {
    const failure = item.journal.originalFailure || item.journal.error || 'APP_UPDATE_INTERRUPTED: previous application update was interrupted'
    const result = await restoreJournal({ ...item, run, failure, recoveredAfterInterruption: true })
    if (result.error.startsWith('DEPENDENCY_RESTORE_FAILED:') || result.error.startsWith('ADOPTION_FILE_CONFLICT:')) throw new Error(result.error)
  }
}

export async function updateApplication({ config, release, dataDir, requestId, run = runCommand }) {
  const id = ensureRequestId(requestId)
  let appPath
  try { appPath = validateConfig(config).appPath } catch (error) { return { status: 'failed', error: `CONFIG_INVALID: ${error.message}` } }
  return withAppLock(dataDir, appPath, async () => {
    const path = journalPath(dataDir, id)
    let ownJournal = null
    if (await exists(path)) {
      try { ownJournal = JSON.parse(await readFile(path, 'utf8')) } catch { return { status: 'failed', error: 'ADOPTION_RECOVERY_FAILED: current request journal is unreadable' } }
      if (ownJournal.phase === 'installed' && ownJournal.release?.version === release?.version && ownJournal.release?.integrity === release?.integrity) return { status: 'installed' }
      if (ownJournal.phase === 'failed' && ownJournal.release?.version === release?.version && ownJournal.release?.integrity === release?.integrity) return { status: 'failed', error: ownJournal.error }
    }
    try { await recoverInterrupted(dataDir, appPath, run) } catch (error) { return { status: 'failed', error: errorText(error) } }
    if (ownJournal) {
      const recovered = JSON.parse(await readFile(path, 'utf8'))
      if (recovered.phase === 'installed' && recovered.release?.version === release?.version && recovered.release?.integrity === release?.integrity) return { status: 'installed' }
      if (recovered.phase === 'failed' && recovered.release?.version === release?.version && recovered.release?.integrity === release?.integrity) return { status: 'failed', error: recovered.error }
    }

    let checked
    try { checked = await verifyPreconditions({ config, release, dataDir, requestId: id, run }) } catch (error) { return { status: 'failed', error: errorText(error) } }
    const previous = {
      packageJson: await snapshot(join(appPath, 'package.json')),
      packageLock: await snapshot(join(appPath, 'package-lock.json')),
    }
    const originalIdentity = await dependencyIdentity(appPath)
    if (!sameIdentity(originalIdentity, checked.verifiedIdentity)) return { status: 'failed', error: 'ADOPTION_FILE_CONFLICT: dependency files changed before the recovery journal was written' }
    const journal = {
      schemaVersion: 1,
      requestId: id,
      appPath,
      release: { version: release.version, packagePath: release.packagePath, integrity: release.integrity },
      previous,
      originalIdentity,
      currentIdentity: originalIdentity,
      phase: 'prepared',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await atomicJson(path, journal)

    await saveJournal(path, journal, { phase: 'installing' })
    try {
      await run('npm', ['install', '--save-exact', '--ignore-scripts', '--no-audit', '--no-fund', release.packagePath], { cwd: appPath, timeoutMs: CHECK_TIMEOUT_MS })
    } catch (error) {
      await saveJournal(path, journal, { phase: 'restoring', currentIdentity: await dependencyIdentity(appPath), originalFailure: `APP_INSTALL_FAILED: ${errorText(error)}` })
      return restoreJournal({ journal, path, run, failure: journal.originalFailure })
    }

    await saveJournal(path, journal, { phase: 'checking', currentIdentity: await dependencyIdentity(appPath) })
    try {
      const installed = await readJson(join(appPath, 'node_modules', PACKAGE_NAME, 'package.json'), 'INSTALLED_VERSION_MISMATCH', `installed ${PACKAGE_NAME} metadata could not be read`)
      if (installed?.version !== release.version) throw coded('INSTALLED_VERSION_MISMATCH', `expected ${release.version}, found ${installed?.version ?? 'missing'}`)
      for (const script of checked.config.checkScripts) {
        if (!sameIdentity(await dependencyIdentity(appPath), journal.currentIdentity)) throw coded('ADOPTION_FILE_CONFLICT', 'dependency files changed before an application check')
        try { await run('npm', ['run', script], { cwd: appPath, timeoutMs: CHECK_TIMEOUT_MS }) }
        catch (error) {
          if (!sameIdentity(await dependencyIdentity(appPath), journal.currentIdentity)) throw coded('ADOPTION_FILE_CONFLICT', 'dependency files changed while an application check was running')
          throw coded('APP_CHECK_FAILED', `${script}: ${errorText(error)}`)
        }
        if (!sameIdentity(await dependencyIdentity(appPath), journal.currentIdentity)) throw coded('ADOPTION_FILE_CONFLICT', `dependency files changed while running ${script}`)
      }
      await saveJournal(path, journal, { phase: 'installed', error: undefined })
      return { status: 'installed' }
    } catch (error) {
      if (error.code === 'ADOPTION_FILE_CONFLICT') {
        const text = errorText(error)
        await saveJournal(path, journal, { phase: 'conflict', error: text })
        return { status: 'failed', error: text }
      }
      return restoreJournal({ journal, path, run, failure: error })
    }
  }).catch((error) => ({ status: 'failed', error: errorText(error) }))
}
