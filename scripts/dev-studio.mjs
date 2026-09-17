import { createFigmaHandoffService } from '../server/services/figmaHandoffService.js'
import { createFigmaPairingService } from '../server/services/figmaPairingService.js'
import { createFigmaSubmissionService } from '../server/services/figmaSubmissionService.js'
import { createVideoGenerationService } from '../server/services/videoGenerationService.js'
import { createVeoProvider } from '../server/providers/veoProvider.js'
import { startVideoWorker } from '../server/services/videoWorker.js'
import { createTemplateBrandService } from '../server/services/templateBrandService.js'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { buildApp } from '../server/app.js'
import { createPool } from '../server/db/pool.js'
import { runMigrations } from '../server/db/migrate.js'
import { createWorkflowService } from '../server/services/workflowService.js'
import { createBriefSourceService } from '../server/services/briefSourceService.js'
import { createBriefingService } from '../server/services/briefingService.js'
import { createGeminiProvider } from '../server/providers/geminiProvider.js'
import { createWorkspaceService } from '../server/services/workspaceService.js'
import { createGenerationService } from '../server/services/generationService.js'
import { createGenerationControlPlane } from '../server/repositories/generationJobRepository.js'
import { createLocalDemoAssetStore } from '../server/storage/localDemoAssetStore.js'
import { createAssetService } from '../server/services/assetService.js'
import { createVisualUploadService } from '../server/services/visualUploadService.js'
import { createVersionService } from '../server/services/versionService.js'
import { createReviewService } from '../server/services/reviewService.js'
import { createDeliveryService } from '../server/services/deliveryService.js'
import { createBrandDesignSystemService } from '../server/services/brandDesignSystemService.js'
import { AuthorizationError, unauthorized } from '../server/auth/authorize.js'
import { createBrandDesignSystemProvider } from '../server/providers/brandDesignSystemProvider.js'
import { createPersonalAiRepository } from '../server/repositories/personalAiRepository.js'
import { createCredentialVault } from '../server/services/credentialVault.js'
import { createPersonalAiService } from '../server/services/personalAiService.js'
import { createPersonalSettingsRepository } from '../server/repositories/personalSettingsRepository.js'
import { createPersonalSettingsService } from '../server/services/personalSettingsService.js'
import { createGenerationProviderRegistry } from '../server/providers/registry.js'
import { createPersonalProvider, createPersonalOpenAiImageProvider } from '../server/providers/personalProvider.js'
import { createEnvironmentGemini } from '../server/providers/environmentGemini.js'
import { createGenerationReadinessService } from '../server/services/generationReadinessService.js'
import { createAdminRepository } from '../server/repositories/adminRepository.js'
import { createAssetWorkflowService } from '../server/assetWorkflows/definitionService.js'
import { createLocalServiceController } from '../server/services/localServiceController.js'
import { createLocalServiceSupervisor, LOCAL_SERVICE_DEFINITIONS } from './local-service-supervisor.mjs'

const databaseUrl = 'postgresql:///banner_studio_demo'
const roles = ['marketer', 'designer', 'admin']
async function checkPersonalCredential({ provider, apiKey }) {
  try {
    const request = provider === 'google'
      ? { url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, headers: { Accept: 'application/json' } }
      : provider === 'anthropic'
        ? { url: 'https://api.anthropic.com/v1/models', headers: { Accept: 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } }
        : provider === 'openrouter'
          ? { url: 'https://openrouter.ai/api/v1/key', headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` } }
          : { url: 'https://api.openai.com/v1/models', headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` } }
    const response = await fetch(request.url, { headers: request.headers })
    if (response.ok) return { ok: true }
    if (response.status === 400 || response.status === 401 || response.status === 403) return { ok: false, code: 'invalid_key', message: 'Google rejected this API key.' }
    if (response.status === 429) return { ok: false, code: 'rate_limited', message: 'Google is rate limiting credential checks. Try again shortly.' }
  } catch { /* The save path reports a provider-unavailable result below. */ }
  return { ok: false, code: 'provider_unavailable', message: 'Google could not validate this key right now.' }
}

async function testPersonalIntegration({ webhookUrl, secret }) {
  try {
    const response = await fetch(webhookUrl, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` }, body: JSON.stringify({ text: 'Banner Studio test notification' }) })
    return response.ok ? { ok: true } : { ok: false, code: response.status === 429 ? 'rate_limited' : 'delivery_failed', message: 'The destination rejected the test notification.' }
  } catch { return { ok: false, code: 'provider_unavailable', message: 'The destination could not be reached.' } }
}

const isLoopback = (value) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(value)
function localUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !url.username && !url.password
  } catch { return false }
}

export async function initializeDemoGenerationSettings(workflowService, actor) {
  const settings = await workflowService.getSettings({ actor })
  // Startup must never re-enable paid requests or overwrite a saved spending
  // allowance. These safety controls belong to the operator, not the launcher.
  return workflowService.updateSettings({ actor, expectedRevision: settings.revision, patch: {
    provider: 'gemini', model: 'gemini-3.5-flash', region: 'eu',
    perStepRegenerationLimit: 20,
  } })
}

export async function startDemoServer({ port = 3010 } = {}) {
  if (process.env.NODE_ENV === 'production' || process.env.K_SERVICE) throw new Error('The local demo cannot run in production')
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new TypeError('Invalid demo port')
  const environmentGemini = createEnvironmentGemini()
  // Projects are created through the AI briefing, which runs only on managed Vertex AI EU (D37).
  // Mock generation stays available through npm run dev:prototype and the isolated studio launcher.
  const vertexProject=process.env.VERTEX_AI_PROJECT_ID?.trim()
  if(!vertexProject || process.env.VERTEX_AI_LOCATION!=='eu') throw new Error('The local API needs Vertex AI EU: set VERTEX_AI_PROJECT_ID and VERTEX_AI_LOCATION=eu. Use npm run dev:prototype for mock generation.')
  const managedBriefingProvider=createGeminiProvider({project:vertexProject,location:'eu',textModel:'gemini-3.5-flash',imageModel:'gemini-3.1-flash-image'})
  const maintenance = createPool({ connectionString: 'postgresql:///postgres' })
  try {
    const exists = await maintenance.query('SELECT 1 FROM pg_database WHERE datname = $1', ['banner_studio_demo'])
    if (!exists.rowCount) await maintenance.query('CREATE DATABASE banner_studio_demo')
  } finally { await maintenance.end() }
  const pool = createPool({ connectionString: databaseUrl })
  let app
  try {
    await runMigrations({ pool })
    for (const role of roles) {
      await pool.query(`INSERT INTO users (id, email, role, display_name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [`studio-demo-${role}`, `${role}@studio.local`, role, `Demo ${role[0].toUpperCase()}${role.slice(1)}`])
    }
    const personalCredentialVault = createCredentialVault({ key: process.env.PERSONAL_CREDENTIAL_ENCRYPTION_KEY ?? '6c6f63616c2d64656d6f2d706572736f6e616c2d61692d6b65792d7631000000' })
    const personalAiService = createPersonalAiService({
      repository: createPersonalAiRepository(pool), vault: personalCredentialVault, testCredential: checkPersonalCredential,
    })
    const personalSettingsService = createPersonalSettingsService({
      repository: createPersonalSettingsRepository(pool),
      vault: personalCredentialVault,
      testDelivery: testPersonalIntegration,
    })
    const notificationTimer = setInterval(() => {
      personalSettingsService.deliverPending({ limit: 25 }).catch(() => {})
    }, 30_000)
    notificationTimer.unref?.()
    const providerRegistry = createGenerationProviderRegistry({ provider: 'gemini', textModel: 'gemini-3.5-flash', imageModel: 'gemini-3.1-flash-image', region: 'eu' })
    const workflowService = createWorkflowService({ pool, providerRegistry, personalAiService, personalSettingsService })
    const admin = { id: 'studio-demo-admin', role: 'admin' }
    await initializeDemoGenerationSettings(workflowService, admin)
    const { legacyStudioTemplates, taggedStudioTemplates, studioTemplates } = await import('../shared/studioTemplates.js')
    for (const manifest of [...legacyStudioTemplates, ...taggedStudioTemplates, ...studioTemplates]) {
      const existing = await workflowService.getTemplateVersion({ actor: admin, templateId: manifest.id, version: manifest.version })
      if (!existing) await workflowService.createTemplateVersion({ actor: admin, input: { id: manifest.id, name: manifest.name, version: manifest.version, manifest } })
    }
    const assetStore = await createLocalDemoAssetStore({ directory: fileURLToPath(new URL('../.studio-demo-assets', import.meta.url)) })
    const brandProvider = createBrandDesignSystemProvider({
      provider: 'mock',
      model: 'mock-v1',
      region: 'europe-west6',
    })
    const templateBrandService = createTemplateBrandService({ pool, assetStore })
    const brandDesignSystemService = createBrandDesignSystemService({
      pool,
      provider: brandProvider,
      assetStore,
      onPublish: templateBrandService.refresh,
    })
    const resolveActor = async (request) => {
      const role = request.headers['x-studio-demo-role']
      if (!roles.includes(role)) throw unauthorized()
      const result = await pool.query('SELECT id, email, role, display_name, disabled, disabled_at FROM users WHERE id = $1', [`studio-demo-${role}`])
      const user = result.rows[0]
      return user && { id: user.id, email: user.email, role: user.role, workspaceId: 'default', displayName: user.display_name, disabled: user.disabled, disabledAt: user.disabled_at }
    }
    const videoGenerationService = createVideoGenerationService({ pool, assetStore, providerFactory: () => process.env.GEMINI_MEDIA_API_KEY
      ? createVeoProvider({ apiKey: process.env.GEMINI_MEDIA_API_KEY, model: process.env.GEMINI_VIDEO_MODEL }) : null })
    app = buildApp({
      runtimeConfig:{firebase:{}},
      briefSourceService:createBriefSourceService({pool,assetStore}),briefingService:createBriefingService({pool}),
      localServiceController: createLocalServiceController({
        services: LOCAL_SERVICE_DEFINITIONS,
        supervisor: createLocalServiceSupervisor({
          root: fileURLToPath(new URL('../', import.meta.url)),
          serviceRoots: {
            observatory: process.env.LOCAL_OBSERVATORY_ROOT || resolve(fileURLToPath(new URL('../', import.meta.url)), '../../../../../ChatGPT/project-x'),
            'design-system': process.env.LOCAL_DESIGN_SYSTEM_ROOT || resolve(fileURLToPath(new URL('../', import.meta.url)), '../../../../tools/brutalist-design-system'),
          },
        }),
      }),
      videoGenerationService,
      resolveActor, workflowService, personalAiService, personalSettingsService, workspaceService: createWorkspaceService({ pool }),
      generationReadinessService: createGenerationReadinessService({ workflowService, personalAiService }),
      readiness: async () => { await pool.query('SELECT 1'); return true },
      generationService: createGenerationService({
        pool, assetStore, notificationService: personalSettingsService,
        controlPlane: createGenerationControlPlane({ pool, providerRegistry, personalSettingsResolver: ({ actor, step }) => environmentGemini.enabled ? environmentGemini.selection(step) : personalAiService.getGenerationSelection({ actor, step }) }),
        providers: { gemini: managedBriefingProvider },
        personalProviderFactory: async ({ actor, provider, model, region, step, credentialVersion }) => {
          if (environmentGemini.enabled) return environmentGemini.provider({ provider, model, region, step, credentialVersion })
          const credentialProvider = provider === 'gemini' ? 'google' : provider
          const apiKey = await personalAiService.getCredential({ actor, provider: credentialProvider, credentialVersion })
          if (!apiKey) return null
          if (provider === 'gemini') return (await import('../server/providers/geminiProvider.js')).createGeminiProvider({ apiKey, location: region, textModel: model === 'gemini-3.1-flash-image' ? 'gemini-3.5-flash' : model, imageModel: model === 'gemini-3.1-flash-image' ? model : 'gemini-3.1-flash-image' })
          if (provider === 'openai' && model === 'gpt-image-1') return createPersonalOpenAiImageProvider({ apiKey, model, region })
          if (model === 'gpt-image-1') return null
          return createPersonalProvider({ provider, model, apiKey, region })
        },
      }),
      assetService: createAssetService({ pool, assetStore }), versionService: createVersionService({ pool, assetStore }),
      visualUploadService: createVisualUploadService({ pool, assetStore }),
      figmaHandoffService: createFigmaHandoffService({pool,assetStore}),
      figmaPairingService: createFigmaPairingService({pool}),
      figmaSubmissionService: createFigmaSubmissionService({pool,assetStore,reviewService:createReviewService({pool,notificationService:personalSettingsService})}),
      reviewService: createReviewService({ pool, notificationService: personalSettingsService }), deliveryService: createDeliveryService({ pool, assetStore }),
      brandDesignSystemService,
      templateBrandService,
      adminRepository: createAdminRepository(pool),
      assetWorkflowService: createAssetWorkflowService({ pool }),
    })
    const stopVideoWorker = startVideoWorker(videoGenerationService)
    app.addHook('onClose', stopVideoWorker)
    // This guard and demo identity resolver exist only in this launcher. Firebase production startup is unchanged.
    app.addHook('onRequest', async (request) => {
      const pluginRequest=request.url.startsWith('/api/v1/figma/plugin/')
      const pluginOrigin=pluginRequest && ['null','https://www.figma.com','https://figma.com'].includes(request.headers.origin)
      if (!isLoopback(request.socket.remoteAddress) || !localUrl(`http://${request.headers.host}`)
        || (request.headers.origin !== undefined && !localUrl(request.headers.origin) && !pluginOrigin)
        || (request.headers['sec-fetch-site'] === 'cross-site' && !pluginOrigin)) {
        throw new AuthorizationError(403, 'local_demo_only', 'The demo accepts local browser requests only')
      }
    })
    app.get('/api/v1/dev/session-info', async (_request, reply) => {
      reply.header('Cache-Control', 'no-store')
      return { demo: true, roles, provider: 'gemini', assets: 'local-files' }
    })
    await app.listen({ host: '127.0.0.1', port })
    const address = app.server.address()
    return { app, pool, url: `http://127.0.0.1:${address.port}`, close: async () => { clearInterval(notificationTimer); await app.close(); await assetStore.close(); await pool.end() } }
  } catch (error) {
    await app?.close().catch(() => {})
    await pool.end()
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url))) }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('Could not load the local server environment file') }
  const runtime = await startDemoServer({ port: Number(process.env.STUDIO_DEMO_PORT ?? 3010) })
  console.log(`Studio demo API: ${runtime.url} (PostgreSQL: banner_studio_demo; Gemini personal provider; persistent local assets)`)
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await runtime.close(); process.exit(0) })
}
