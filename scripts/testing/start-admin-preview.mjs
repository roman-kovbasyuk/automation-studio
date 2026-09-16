import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const defaultStudio = async () => (await import('./start-isolated-studio.mjs')).startIsolatedStudio()
const defaultFrontend = async config => (await import('vite')).createServer(config)

/** Owns only a disposable test schema, temporary files and its own local server. */
export async function startAdminPreview({ port = 5181, environment = process.env, startStudio = defaultStudio, createFrontend = defaultFrontend } = {}) {
  if (environment.NODE_ENV === 'production' || environment.K_SERVICE) throw new Error('The admin preview is for local development only')
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new TypeError('A valid local port is required')
  let studio, frontend, closing
  function close() {
    if (!closing) closing = (async () => {
      const errors = []
      for (const release of [() => frontend?.close(), () => studio?.close()]) {
        try { await release() } catch (error) { errors.push(error) }
      }
      if (errors.length) throw new AggregateError(errors, 'Could not close the admin preview')
    })()
    return closing
  }
  try {
    studio = await startStudio()
    frontend = await createFrontend({
      root,
      configFile: fileURLToPath(new URL('../../vite.config.js', import.meta.url)),
      server: { host: '127.0.0.1', port, strictPort: true,
        proxy: { '/api': studio.url, '/healthz': studio.url, '/readyz': studio.url } },
    })
    await frontend.listen()
    const address = frontend.httpServer?.address()
    if (!address || typeof address === 'string') throw new Error('The preview did not bind a local port')
    return { url: `http://127.0.0.1:${address.port}/mvp/admin?demoRole=admin`, close }
  } catch (startupError) {
    try {
      await close()
    } catch (cleanupError) {
      throw new AggregateError([startupError, cleanupError], 'Admin preview startup and cleanup failed')
    }
    throw startupError
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const preview = await startAdminPreview({ port: process.env.ADMIN_PREVIEW_PORT ? Number(process.env.ADMIN_PREVIEW_PORT) : 5181 })
  console.log(`Isolated admin preview (synthetic data): ${preview.url}`)
  console.log('Ctrl+C stops the preview and removes its temporary test data.')
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
    try { await preview.close(); process.exit(0) } catch { console.error('Admin preview cleanup failed.'); process.exit(1) }
  })
}
