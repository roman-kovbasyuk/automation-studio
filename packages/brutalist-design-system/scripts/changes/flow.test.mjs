import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { dispatch } from './cli.mjs'
import { runCommand } from './process.mjs'
import { openStore } from './store.mjs'
import { drainQueue } from './worker.mjs'

const PACKAGE_NAME = 'brutalist-design-system'
const INITIAL_VERSION = '0.1.0'
const REQUEST = {
  requestId: 'app-change-184',
  installedVersion: INITIAL_VERSION,
  component: 'Button',
  change: 'Change the exported Button label to Busy button.',
}

function sha512(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`
}

async function write(path, contents) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, contents)
}

async function writeJson(path, value) {
  await write(path, `${JSON.stringify(value, null, 2)}\n`)
}

function fixtureRunner(root) {
  return (file, args, options = {}) => runCommand(file, args, {
    ...options,
    env: {
      ...process.env,
      ...options.env,
      npm_config_cache: join(root, 'npm-cache'),
      TMPDIR: join(root, 'tmp'),
    },
  })
}

async function initializeGit(directory, message, run) {
  await run('git', ['init', '-b', 'main'], { cwd: directory })
  await run('git', ['config', 'user.name', 'Flow Test'], { cwd: directory })
  await run('git', ['config', 'user.email', 'flow-test@example.invalid'], { cwd: directory })
  await run('git', ['add', '.'], { cwd: directory })
  await run('git', ['commit', '-m', message], { cwd: directory })
}

async function createInitialPackage(root, run) {
  const source = join(root, 'initial-package')
  const destination = join(root, 'initial-artifact')
  await mkdir(destination, { recursive: true })
  await writeJson(join(source, 'package.json'), {
    name: PACKAGE_NAME,
    version: INITIAL_VERSION,
    type: 'module',
    exports: './index.js',
  })
  await write(join(source, 'index.js'), 'export const label = "Button"\n')
  const packed = JSON.parse((await run('npm', [
    'pack', '--json', '--ignore-scripts', '--pack-destination', destination, source,
  ], { cwd: root })).stdout)[0]
  return join(destination, packed.filename)
}

async function createMaster(repositoryDir, run) {
  await writeJson(join(repositoryDir, 'package.json'), {
    name: 'design-system-flow-fixture',
    version: INITIAL_VERSION,
    private: true,
    type: 'module',
    scripts: { verify: 'node verify-source.mjs' },
  })
  await writeJson(join(repositoryDir, 'package-lock.json'), {
    name: 'design-system-flow-fixture',
    version: INITIAL_VERSION,
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': { name: 'design-system-flow-fixture', version: INITIAL_VERSION },
    },
  })
  await write(join(repositoryDir, '.gitignore'), 'node_modules/\ndist-atomic-library/\n')
  await write(join(repositoryDir, 'AGENTS.md'), '# Atomic design rules\n\nBasics → Components → UI blocks → Screens/catalog. Keep reusable controls in `src/atomic/components`.\n')
  await write(join(repositoryDir, 'src/atomic/components/Button.mjs'), 'export const label = "Button"\n')
  await write(join(repositoryDir, 'verify-source.mjs'), `
import assert from 'node:assert/strict'
import { label } from './src/atomic/components/Button.mjs'
assert.equal(label, 'Busy button')
`.trimStart())
  await write(join(repositoryDir, 'scripts/atomic/build-library.mjs'), `
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '../..')
const output = resolve(root, 'dist-atomic-library')
const source = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const version = process.env.DS_RELEASE_VERSION ?? \`\${source.version}-atomic.0\`
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp(resolve(root, 'src/atomic/components/Button.mjs'), resolve(output, 'index.js'))
await writeFile(resolve(output, 'package.json'), JSON.stringify({
  name: '${PACKAGE_NAME}', version, type: 'module', exports: './index.js', files: ['index.js'],
}, null, 2) + '\\n')
`.trimStart())
  await write(join(repositoryDir, 'scripts/atomic/verify-consumer.mjs'), `
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const args = process.argv.slice(2)
assert.deepEqual(args.slice(0, 1), ['--tarball'])
const tarball = args[1]
const root = mkdtempSync(join(process.env.TMPDIR, 'release-check-'))
try {
  writeFileSync(join(root, 'package.json'), JSON.stringify({
    name: 'release-check', private: true, type: 'module', dependencies: { '${PACKAGE_NAME}': \`file:\${tarball}\` },
  }))
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: root, env: process.env })
  const installed = JSON.parse(readFileSync(join(root, 'node_modules/${PACKAGE_NAME}/package.json'), 'utf8'))
  assert.equal(installed.name, '${PACKAGE_NAME}')
  const component = await import(pathToFileURL(join(root, 'node_modules/${PACKAGE_NAME}/index.js')).href)
  assert.equal(component.label, 'Busy button')
} finally {
  rmSync(root, { recursive: true, force: true })
}
`.trimStart())
  await initializeGit(repositoryDir, 'initial design system', run)
}

async function createApp(appPath, initialPackage, checkFails, run) {
  await writeJson(join(appPath, 'package.json'), {
    name: 'design-system-consumer',
    private: true,
    type: 'module',
    scripts: { check: 'node check.mjs' },
    dependencies: { [PACKAGE_NAME]: `file:${initialPackage}` },
  })
  await write(join(appPath, 'check.mjs'), checkFails
    ? 'throw new Error("fixture app check failed")\n'
    : `import assert from 'node:assert/strict'\nimport { label } from '${PACKAGE_NAME}'\nassert.equal(label, 'Busy button')\n`)
  await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: appPath })
  await initializeGit(appPath, 'initial app', run)
}

async function createFixture({ checkFails = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'design-system-flow-'))
  const repositoryDir = join(root, 'master')
  const appPath = join(root, 'app')
  const dataDir = join(root, 'state')
  const requestPath = join(root, 'request.json')
  await mkdir(join(root, 'tmp'), { recursive: true })
  const run = fixtureRunner(root)
  const initialPackage = await createInitialPackage(root, run)
  await createMaster(repositoryDir, run)
  await createApp(appPath, initialPackage, checkFails, run)
  await writeJson(requestPath, REQUEST)
  await dispatch(['configure', '--app', appPath, '--check', 'check', '--data-dir', dataDir])
  return { root, repositoryDir, appPath, dataDir, requestPath, run }
}

async function submitAndProcess(fixture) {
  const args = ['request', '--input', fixture.requestPath, '--data-dir', fixture.dataDir]
  const first = await dispatch(args)
  const duplicate = await dispatch(args)
  assert.deepEqual(duplicate, first)
  assert.equal(first.status, 'working')

  const store = openStore(fixture.dataDir)
  const results = await drainQueue({
    repositoryDir: fixture.repositoryDir,
    dataDir: fixture.dataDir,
    store,
    run: fixture.run,
    implement: async ({ candidateDir }) => {
      await write(join(candidateDir, 'src/atomic/components/Button.mjs'), 'export const label = "Busy button"\n')
      return { outcome: 'implemented', summary: 'Button exports the Busy button label.', error: null }
    },
  })
  assert.equal(results.length, 1)
  return dispatch(['get', REQUEST.requestId, '--data-dir', fixture.dataDir])
}

test('duplicate delivery produces one promoted release and installs that exact artifact', async () => {
  const fixture = await createFixture()
  try {
    const result = await submitAndProcess(fixture)
    const installedPackage = JSON.parse(await readFile(join(fixture.appPath, 'node_modules', PACKAGE_NAME, 'package.json'), 'utf8'))
    const requestNames = (await readdir(join(fixture.dataDir, 'requests'))).filter((name) => name.endsWith('.json'))
    const requestRecords = await Promise.all(requestNames.map((name) => readFile(join(fixture.dataDir, 'requests', name), 'utf8').then(JSON.parse)))
    const masterHead = (await fixture.run('git', ['rev-parse', 'HEAD'], { cwd: fixture.repositoryDir })).stdout.trim()
    const releaseManifest = JSON.parse(await readFile(join(fixture.dataDir, 'releases', result.version, 'manifest.json'), 'utf8'))
    const actualTarballIntegrity = sha512(await readFile(result.packagePath))
    const installedComponent = await import(`${join(fixture.appPath, 'node_modules', PACKAGE_NAME, 'index.js')}?flow=${Date.now()}`)

    assert.equal(result.status, 'ready')
    assert.equal(result.adoption.status, 'installed')
    assert.equal(installedPackage.version, result.version)
    assert.equal(requestRecords.length, 1)
    assert.equal(requestRecords[0].approvedBy, 'single-app-policy')
    assert.equal(masterHead, releaseManifest.sourceCommit)
    assert.equal(actualTarballIntegrity, releaseManifest.integrity)
    assert.equal(releaseManifest.packagePath, result.packagePath)
    assert.equal(installedComponent.label, 'Busy button')
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('a failed app check restores its dependency files while keeping the release ready', async () => {
  const fixture = await createFixture({ checkFails: true })
  try {
    const previousPackage = await readFile(join(fixture.appPath, 'package.json'))
    const previousLock = await readFile(join(fixture.appPath, 'package-lock.json'))
    const result = await submitAndProcess(fixture)
    const installedPackage = JSON.parse(await readFile(join(fixture.appPath, 'node_modules', PACKAGE_NAME, 'package.json'), 'utf8'))
    const releaseManifest = JSON.parse(await readFile(join(fixture.dataDir, 'releases', result.version, 'manifest.json'), 'utf8'))

    assert.equal(result.status, 'ready')
    assert.equal(result.adoption.status, 'failed')
    assert.match(result.adoption.error, /APP_CHECK_FAILED: check/)
    assert.deepEqual(await readFile(join(fixture.appPath, 'package.json')), previousPackage)
    assert.deepEqual(await readFile(join(fixture.appPath, 'package-lock.json')), previousLock)
    assert.equal(installedPackage.version, INITIAL_VERSION)
    assert.equal(sha512(await readFile(result.packagePath)), releaseManifest.integrity)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})
