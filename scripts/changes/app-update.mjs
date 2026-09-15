import { createHash, randomUUID } from 'node:crypto'
import { link, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
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

function sameFileIdentity(left, right) {
  return Boolean(left && right && left.exists === right.exists && left.size === right.size && left.integrity === right.integrity)
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  return JSON.stringify(value)
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

async function publishOwner(path, owner) {
  const temporary = `${path}.${process.pid}.${randomUUID()}.owner`
  try {
    await writeFile(temporary, JSON.stringify(owner), { flag: 'wx', mode: 0o600 })
    try {
      await link(temporary, path)
      return true
    } catch (error) {
      if (error.code === 'EEXIST') return false
      throw error
    }
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error })
  }
}

async function readOwner(path, detail) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const owner = JSON.parse(await readFile(path, 'utf8'))
      if (!Number.isInteger(owner?.pid) || owner.pid <= 0 || typeof owner?.token !== 'string' || !owner.token) throw new Error('invalid owner')
      return owner
    } catch (error) {
      if (error.code === 'ENOENT') return null
      if (attempt === 9) throw coded('APP_LOCK_AMBIGUOUS', detail)
      await delay(5)
    }
  }
}

async function acquireAppLock(path) {
  await mkdir(dirname(path), { recursive: true })
  const reclaimPath = `${path}.reclaim`
  for (;;) {
    const guard = await readOwner(reclaimPath, 'application lock reclamation ownership is unreadable')
    if (guard) {
      const guardAlive = pidAlive(guard?.pid)
      if (guardAlive === false) throw coded('APP_LOCK_AMBIGUOUS', 'application lock has an abandoned reclamation guard')
      if (guardAlive === null) throw coded('APP_LOCK_AMBIGUOUS', 'application lock reclamation ownership is ambiguous')
      await delay(20)
      continue
    }
    const owner = { pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() }
    if (await publishOwner(path, owner)) return owner
    {
      const existing = await readOwner(path, 'application lock ownership is unreadable')
      if (!existing) continue
      const alive = pidAlive(existing?.pid)
      if (alive === null) throw coded('APP_LOCK_AMBIGUOUS', 'application lock ownership is ambiguous')
      if (alive) { await delay(20); continue }
      const reclaim = { pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() }
      if (!await publishOwner(reclaimPath, reclaim)) {
        const winner = await readOwner(reclaimPath, 'application lock reclamation ownership is unreadable')
        if (!winner) continue
        if (pidAlive(winner.pid) === false) throw coded('APP_LOCK_AMBIGUOUS', 'application lock has an abandoned reclamation guard')
        await delay(20)
        continue
      }
      try {
        const current = await readOwner(path, 'application lock changed during reclamation')
        if (!current) continue
        if (current.pid !== existing.pid || current.token !== existing.token) continue
        if (pidAlive(current.pid) !== false) continue
        await unlink(path)
      } finally {
        const currentGuard = await readOwner(reclaimPath, 'application lock reclamation ownership changed before release')
        if (currentGuard?.token === reclaim.token) await unlink(reclaimPath).catch(() => {})
      }
    }
  }
}

async function releaseAppLock(path, owner) {
  const existing = await readOwner(path, 'application lock changed before release')
  if (!existing) return
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
  return declarations[0]
}

function artifactPath(spec, appPath) {
  if (typeof spec !== 'string' || !spec.startsWith('file:')) return null
  return resolve(appPath, spec.slice(5))
}

function sameArtifactSpec(left, right, appPath) {
  const leftPath = artifactPath(left, appPath)
  const rightPath = artifactPath(right, appPath)
  return Boolean(leftPath && rightPath && leftPath === rightPath)
}

function tarText(bytes) {
  return bytes.subarray(0, bytes.indexOf(0) < 0 ? bytes.length : bytes.indexOf(0)).toString('utf8')
}

function releaseManifest(bytes) {
  let archive
  try { archive = gunzipSync(bytes) } catch (error) { throw coded('PACKAGE_CONTENT_INVALID', `release archive is not a readable gzip stream: ${error.message}`) }
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) break
    const name = [tarText(header.subarray(345, 500)), tarText(header.subarray(0, 100))].filter(Boolean).join('/').replace(/^\.\//, '')
    const sizeText = tarText(header.subarray(124, 136)).trim()
    const size = Number.parseInt(sizeText || '0', 8)
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > archive.length) throw coded('PACKAGE_CONTENT_INVALID', 'release archive has an invalid tar entry')
    if (name === 'package/package.json') {
      try { return JSON.parse(archive.subarray(offset + 512, offset + 512 + size).toString('utf8')) } catch (error) { throw coded('PACKAGE_CONTENT_INVALID', `release package.json is invalid: ${error.message}`) }
    }
    offset += 512 + Math.ceil(size / 512) * 512
  }
  throw coded('PACKAGE_CONTENT_INVALID', 'release archive does not contain package/package.json')
}

async function readReleaseManifest(release) {
  const bytes = await readFile(release.packagePath)
  if (sha512(bytes) !== release.integrity) throw coded('PACKAGE_CHECKSUM_MISMATCH', 'release package changed after validation')
  const manifest = releaseManifest(bytes)
  if (manifest?.name !== PACKAGE_NAME || manifest?.version !== release.version) throw coded('PACKAGE_CONTENT_INVALID', 'release package identity does not match the adoption journal')
  return manifest
}

async function validateCurrentDependency({ manifest, lock, installed, input, appPath }) {
  const declared = dependencyDeclaration(manifest)
  const lockedRoot = lock?.packages?.['']?.[declared.section]?.[PACKAGE_NAME]
  const lockedPackage = lock?.packages?.[`node_modules/${PACKAGE_NAME}`]
  if (lockedPackage?.version !== input.installedVersion || installed?.version !== input.installedVersion || installed?.name !== PACKAGE_NAME) {
    throw coded('CURRENT_VERSION_MISMATCH', `request says ${input.installedVersion}; locked=${lockedPackage?.version ?? 'missing'}, installed=${installed?.version ?? 'missing'}`)
  }
  if (declared.value === input.installedVersion && lockedRoot === input.installedVersion) return
  const declaredPath = artifactPath(declared.value, appPath)
  if (!declaredPath || !sameArtifactSpec(declared.value, lockedRoot, appPath) || !sameArtifactSpec(declared.value, lockedPackage.resolved, appPath)) {
    throw coded('CURRENT_VERSION_MISMATCH', `declared and locked ${PACKAGE_NAME} artifacts do not agree with the request`)
  }
  if (typeof lockedPackage.integrity !== 'string' || !lockedPackage.integrity.startsWith('sha512-')) throw coded('CURRENT_VERSION_MISMATCH', 'locked file dependency has no SHA-512 artifact identity')
  let bytes
  try { bytes = await readFile(declaredPath) } catch (error) { throw coded('CURRENT_VERSION_MISMATCH', `declared dependency artifact could not be read: ${error.message}`) }
  if (sha512(bytes) !== lockedPackage.integrity) throw coded('CURRENT_VERSION_MISMATCH', 'declared dependency artifact does not match the lockfile identity')
}

function snapshotJson(saved, label) {
  if (!saved?.exists || typeof saved.data !== 'string') throw coded('ADOPTION_RECOVERY_FAILED', `${label} backup is unavailable`)
  try { return JSON.parse(Buffer.from(saved.data, 'base64').toString('utf8')) } catch { throw coded('ADOPTION_RECOVERY_FAILED', `${label} backup is invalid`) }
}

async function validateOwnedPackageMutation(journal) {
  const original = snapshotJson(journal.previous.packageJson, 'package.json')
  const current = await readJson(join(journal.appPath, 'package.json'), 'ADOPTION_FILE_CONFLICT', 'package.json changed to invalid JSON during installation')
  const declaration = dependencyDeclaration(original)
  const currentDeclaration = dependencyDeclaration(current)
  if (currentDeclaration.section !== declaration.section || !sameArtifactSpec(currentDeclaration.value, `file:${journal.release.packagePath}`, journal.appPath)) throw coded('ADOPTION_FILE_CONFLICT', 'package.json does not contain only the expected release adoption')
  current[currentDeclaration.section][PACKAGE_NAME] = declaration.value
  if (canonical(current) !== canonical(original)) throw coded('ADOPTION_FILE_CONFLICT', 'package.json contains changes outside the expected release adoption')
}

function resolveLockedDependency(packages, fromPath, name) {
  let base = fromPath
  for (;;) {
    const candidate = base ? `${base}/node_modules/${name}` : `node_modules/${name}`
    if (packages[candidate]) return candidate
    const parent = base.lastIndexOf('/node_modules/')
    if (parent >= 0) base = base.slice(0, parent)
    else if (base.startsWith('node_modules/')) base = ''
    else break
  }
  return null
}

function lockedDependencyClosure(packages, start) {
  const closure = new Set()
  const pending = [start]
  while (pending.length) {
    const path = pending.pop()
    if (closure.has(path) || !packages[path]) continue
    closure.add(path)
    const entry = packages[path]
    const names = new Set([
      ...Object.keys(entry.dependencies ?? {}),
      ...Object.keys(entry.optionalDependencies ?? {}),
      ...Object.keys(entry.peerDependencies ?? {}),
    ])
    for (const name of names) {
      const dependency = resolveLockedDependency(packages, path, name)
      if (dependency && !closure.has(dependency)) pending.push(dependency)
    }
  }
  return closure
}

const LOCK_GRAPH_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta']

function graphEdges(manifest) {
  const optional = new Set(Object.keys(manifest.optionalDependencies ?? {}))
  return [
    ...Object.keys(manifest.dependencies ?? {}).filter((name) => !optional.has(name)).map((name) => ({ name, optional: false, peer: false })),
    ...[...optional].map((name) => ({ name, optional: true, peer: false })),
    ...Object.keys(manifest.peerDependencies ?? {}).filter((name) => !optional.has(name)).map((name) => ({
      name,
      optional: manifest.peerDependenciesMeta?.[name]?.optional === true,
      peer: true,
    })),
  ]
}

function allowsPlatform(values, current) {
  if (!Array.isArray(values) || values.length === 0) return true
  if (values.includes(`!${current}`)) return false
  const allowed = values.filter((value) => typeof value === 'string' && !value.startsWith('!'))
  return allowed.length === 0 || allowed.includes('any') || allowed.includes(current)
}

function excludedFromCurrentPlatform(entry) {
  return !allowsPlatform(entry?.os, process.platform) || !allowsPlatform(entry?.cpu, process.arch)
}

function validateLockGraphEntry(entry, manifest, path) {
  if (entry?.version !== manifest?.version) throw coded('ADOPTION_FILE_CONFLICT', `package-lock.json version does not match the installed package at ${path}`)
  for (const field of LOCK_GRAPH_FIELDS) {
    if (canonical(entry?.[field] ?? {}) !== canonical(manifest?.[field] ?? {})) {
      throw coded('ADOPTION_FILE_CONFLICT', `package-lock.json ${field} do not match the package at ${path}`)
    }
  }
}

async function omittedPackageManifest(entry, appPath, run) {
  let bytes
  const localPath = artifactPath(entry.resolved, appPath)
  if (localPath) {
    bytes = await readFile(localPath)
  } else {
    if (typeof entry.resolved !== 'string' || !/^https?:\/\//.test(entry.resolved)) throw coded('ADOPTION_FILE_CONFLICT', 'omitted dependency has no retrievable package archive')
    const destination = await mkdtemp(join(tmpdir(), 'ds-adoption-package-'))
    try {
      await run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', destination, entry.resolved], { cwd: appPath, timeoutMs: CHECK_TIMEOUT_MS })
      const archives = (await readdir(destination)).filter((name) => name.endsWith('.tgz'))
      if (archives.length !== 1) throw coded('ADOPTION_FILE_CONFLICT', 'omitted dependency archive could not be identified')
      bytes = await readFile(join(destination, archives[0]))
    } finally {
      await rm(destination, { recursive: true, force: true })
    }
  }
  const matches = typeof entry.integrity === 'string' && entry.integrity.split(/\s+/).some((token) => {
    const match = /^(sha512|sha384|sha256|sha1)-([A-Za-z0-9+/]+={0,2})$/.exec(token)
    return match && createHash(match[1]).update(bytes).digest('base64') === match[2]
  })
  if (!matches) throw coded('ADOPTION_FILE_CONFLICT', 'omitted dependency archive checksum does not match the lockfile')
  const manifest = releaseManifest(bytes)
  for (const field of ['os', 'cpu']) {
    if (canonical(entry[field] ?? []) !== canonical(manifest[field] ?? [])) throw coded('ADOPTION_FILE_CONFLICT', `omitted dependency ${field} metadata does not match its archive`)
  }
  return manifest
}

async function releaseDependencyClosure(packages, start, appPath, manifest, run) {
  const closure = new Set()
  const validation = new Map()
  const pending = [{ path: start, manifest }]
  while (pending.length) {
    const item = pending.pop()
    const state = validation.get(item.path)
    if (state === 'installed' || (state === 'omittedOptional' && item.omitted) || !packages[item.path]) continue
    validateLockGraphEntry(packages[item.path], item.manifest, item.path)
    validation.set(item.path, item.omitted ? 'omittedOptional' : 'installed')
    closure.add(item.path)
    for (const edge of graphEdges(item.manifest)) {
      const path = resolveLockedDependency(packages, item.path, edge.name)
      if (!path) {
        const lockPeerOptional = packages[item.path]?.peerDependenciesMeta?.[edge.name]?.optional === true
        if (edge.peer && edge.optional && lockPeerOptional) continue
        throw coded('ADOPTION_FILE_CONFLICT', `package-lock.json is missing ${edge.optional ? 'optional' : 'required'} dependency ${edge.name} from ${item.path}`)
      }
      const state = validation.get(path)
      if (state === 'installed' || (state === 'omittedOptional' && (edge.optional || item.omitted))) continue
      let dependency
      try { dependency = JSON.parse(await readFile(join(appPath, path, 'package.json'), 'utf8')) } catch (error) {
        if (error.code === 'ENOENT' && packages[path]?.optional === true && (item.omitted || (edge.optional && excludedFromCurrentPlatform(packages[path])))) {
          // npm retains an omitted package's entire optional subtree in the lockfile.
          // Its archive supplies the edges that missing installed metadata cannot attest.
          const omittedManifest = await omittedPackageManifest(packages[path], appPath, run)
          pending.push({ path, manifest: omittedManifest, omitted: true })
          continue
        }
        throw coded('ADOPTION_FILE_CONFLICT', `installed dependency metadata is unavailable at ${path}: ${error.message}`)
      }
      pending.push({ path, manifest: dependency })
    }
  }
  return closure
}

async function validateOwnedLockMutation(journal, run) {
  const original = snapshotJson(journal.previous.packageLock, 'package-lock.json')
  const current = await readJson(join(journal.appPath, 'package-lock.json'), 'ADOPTION_FILE_CONFLICT', 'package-lock.json changed to invalid JSON during installation')
  const declaration = dependencyDeclaration(original.packages?.[''] ?? {})
  const currentRoot = current.packages?.['']?.[declaration.section]?.[PACKAGE_NAME]
  const currentPackage = current.packages?.[`node_modules/${PACKAGE_NAME}`]
  if (!sameArtifactSpec(currentRoot, `file:${journal.release.packagePath}`, journal.appPath)
    || currentPackage?.version !== journal.release.version
    || !sameArtifactSpec(currentPackage?.resolved, `file:${journal.release.packagePath}`, journal.appPath)
    || currentPackage?.integrity !== journal.release.integrity) throw coded('ADOPTION_FILE_CONFLICT', 'package-lock.json does not identify the expected release artifact')

  const manifest = await readReleaseManifest(journal.release)

  const originalMetadata = { ...original, packages: undefined }
  const currentMetadata = { ...current, packages: undefined }
  if (canonical(currentMetadata) !== canonical(originalMetadata)) throw coded('ADOPTION_FILE_CONFLICT', 'package-lock.json metadata changed outside the expected release adoption')

  const originalRoot = structuredClone(original.packages[''])
  const normalizedRoot = structuredClone(current.packages[''])
  normalizedRoot[declaration.section][PACKAGE_NAME] = originalRoot[declaration.section][PACKAGE_NAME]
  if (canonical(normalizedRoot) !== canonical(originalRoot)) throw coded('ADOPTION_FILE_CONFLICT', 'package-lock.json root package contains changes outside the expected release adoption')

  const packagePath = `node_modules/${PACKAGE_NAME}`
  const releaseClosure = await releaseDependencyClosure(current.packages, packagePath, journal.appPath, manifest, run)
  const allowed = new Set([
    ...lockedDependencyClosure(original.packages, packagePath),
    ...releaseClosure,
  ])
  for (const path of new Set([...Object.keys(original.packages), ...Object.keys(current.packages)])) {
    if (path === '') continue
    if (canonical(original.packages[path]) !== canonical(current.packages[path]) && !allowed.has(path)) {
      throw coded('ADOPTION_FILE_CONFLICT', `package-lock.json contains an unrelated package change at ${path}`)
    }
  }
}

async function establishMutationOwnership(journal, run) {
  const current = await dependencyIdentity(journal.appPath)
  const validators = { packageJson: validateOwnedPackageMutation, packageLock: validateOwnedLockMutation }
  const owned = { ...journal.currentIdentity }
  for (const key of Object.keys(validators)) {
    if (sameFileIdentity(current[key], journal.originalIdentity[key])) {
      owned[key] ??= current[key]
      continue
    }
    const recorded = journal.currentIdentity?.[key]
    if (recorded && !sameFileIdentity(recorded, journal.originalIdentity[key])) {
      if (!sameFileIdentity(current[key], recorded)) throw coded('ADOPTION_FILE_CONFLICT', `${key} changed after this transaction recorded its installed state`)
      continue
    }
    try { await validators[key](journal, run) }
    catch (error) { throw coded('ADOPTION_FILE_CONFLICT', errorText(error)) }
    owned[key] = current[key]
  }
  journal.currentIdentity = owned
  return current
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
  const installed = await readJson(installedFile, 'CURRENT_VERSION_MISMATCH', `installed ${PACKAGE_NAME} metadata could not be read`)
  await validateCurrentDependency({ manifest, lock, installed, input, appPath: checkedConfig.appPath })
  const status = (await run('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', 'package.json', 'package-lock.json'], { cwd: checkedConfig.appPath })).stdout.trim()
  if (status) throw coded('DEPENDENCY_FILES_DIRTY', 'package.json or package-lock.json has local changes')
  let packageBytes
  try { packageBytes = await readFile(release.packagePath) } catch (error) { throw coded('PACKAGE_CHECKSUM_MISMATCH', `release package could not be read: ${error.message}`) }
  if (sha512(packageBytes) !== release.integrity) throw coded('PACKAGE_CHECKSUM_MISMATCH', 'release package SHA-512 does not match its manifest')
  const packageManifest = releaseManifest(packageBytes)
  if (packageManifest?.name !== PACKAGE_NAME || packageManifest?.version !== release.version) throw coded('PACKAGE_CONTENT_INVALID', 'release package identity does not match its manifest')
  const verifiedIdentity = await dependencyIdentity(checkedConfig.appPath)
  if (!sameIdentity(initialIdentity, verifiedIdentity)) throw coded('ADOPTION_FILE_CONFLICT', 'dependency files changed during application validation')
  return { config: checkedConfig, input, verifiedIdentity }
}

async function restoreJournal({ journal, path, run, recoveredAfterInterruption = false, failure }) {
  let current
  try { current = await establishMutationOwnership(journal, run) } catch {
    const text = 'ADOPTION_FILE_CONFLICT: dependency files changed outside this transaction; backups were retained'
    await saveJournal(path, journal, { phase: 'conflict', error: text })
    return { status: 'failed', error: text }
  }
  try {
    await saveJournal(path, journal, {
      phase: 'restoring',
      currentIdentity: journal.currentIdentity ?? current,
      restoreProgress: journal.restoreProgress ?? { packageJson: false, packageLock: false },
      error: errorText(failure),
    })
    const files = [
      ['packageJson', 'package.json'],
      ['packageLock', 'package-lock.json'],
    ]
    for (const [key, name] of files) {
      const identity = await fileIdentity(join(journal.appPath, name))
      if (!sameFileIdentity(identity, journal.originalIdentity[key])) {
        if (!sameFileIdentity(identity, journal.currentIdentity[key])) throw coded('ADOPTION_FILE_CONFLICT', `${name} changed before it could be restored`)
        await restoreSnapshot(join(journal.appPath, name), journal.previous[key])
        if (!sameFileIdentity(await fileIdentity(join(journal.appPath, name)), journal.originalIdentity[key])) throw coded('DEPENDENCY_RESTORE_FAILED', `${name} bytes do not match the journal after restoration`)
      }
      await saveJournal(path, journal, { restoreProgress: { ...journal.restoreProgress, [key]: true } })
    }
    if (!sameIdentity(await dependencyIdentity(journal.appPath), journal.originalIdentity)) throw coded('DEPENDENCY_RESTORE_FAILED', 'restored dependency file bytes do not match the journal')
    await run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: journal.appPath, timeoutMs: CHECK_TIMEOUT_MS })
    if (!sameIdentity(await dependencyIdentity(journal.appPath), journal.originalIdentity)) throw coded('DEPENDENCY_RESTORE_FAILED', 'npm ci changed the restored dependency files')
    const text = errorText(failure)
    await saveJournal(path, journal, { phase: 'failed', error: text, recoveredAfterInterruption })
    return { status: 'failed', error: text }
  } catch (error) {
    if (error.code === 'ADOPTION_FILE_CONFLICT') {
      const text = errorText(error)
      await saveJournal(path, journal, { phase: 'conflict', error: text })
      return { status: 'failed', error: text }
    }
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
      let currentIdentity
      try { currentIdentity = await establishMutationOwnership(journal, run) } catch (ownershipError) {
        const text = errorText(ownershipError)
        await saveJournal(path, journal, { phase: 'conflict', error: text })
        return { status: 'failed', error: text }
      }
      await saveJournal(path, journal, { phase: 'restoring', currentIdentity, originalFailure: `APP_INSTALL_FAILED: ${errorText(error)}` })
      return restoreJournal({ journal, path, run, failure: journal.originalFailure })
    }

    let currentIdentity
    try { currentIdentity = await establishMutationOwnership(journal, run) } catch (ownershipError) {
      const text = errorText(ownershipError)
      await saveJournal(path, journal, { phase: 'conflict', error: text })
      return { status: 'failed', error: text }
    }
    await saveJournal(path, journal, { phase: 'checking', currentIdentity })
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
