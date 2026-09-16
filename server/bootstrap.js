import { createFigmaSubmissionService } from './services/figmaSubmissionService.js'
import { createFigmaHandoffService } from './services/figmaHandoffService.js'
import { createFigmaPairingService } from './services/figmaPairingService.js'
import { createVideoGenerationService } from './services/videoGenerationService.js'
import { createVeoProvider } from './providers/veoProvider.js'
import { startVideoWorker } from './services/videoWorker.js'
import { createTemplateBrandService } from './services/templateBrandService.js'
import { buildApp } from './app.js'
import { createAuthenticator, createFirebaseTokenVerifier } from './auth/verifyToken.js'
import { loadConfig } from './config.js'
import { runMigrations } from './db/migrate.js'
import { createPool } from './db/pool.js'
import { createWorkflowService } from './services/workflowService.js'
import { createBriefSourceService } from './services/briefSourceService.js'
import { createBriefingService } from './services/briefingService.js'
import { createGenerationService } from './services/generationService.js'
import { createGenerationControlPlane } from './repositories/generationJobRepository.js'
import { createMockProvider } from './providers/mockProvider.js'
import { createGeminiProvider } from './providers/geminiProvider.js'
import { createPersonalProvider, createPersonalOpenAiImageProvider } from './providers/personalProvider.js'
import { createGenerationProviderRegistry } from './providers/registry.js'
import { reconcileGenerationSettings } from './services/generationSettingsService.js'
import { createMemoryAssetStore } from './storage/memoryAssetStore.js'
import { createGcsAssetStore } from './storage/gcsAssetStore.js'
import { createAssetService } from './services/assetService.js'
import { createVisualUploadService } from './services/visualUploadService.js'
import { createVersionService } from './services/versionService.js'
import { createReviewService } from './services/reviewService.js'
import { createDeliveryService } from './services/deliveryService.js'
import { createWorkspaceService } from './services/workspaceService.js'
import { createBrandDesignSystemService } from './services/brandDesignSystemService.js'
import { createBrandDesignSystemProvider } from './providers/brandDesignSystemProvider.js'
import { createPersonalAiRepository } from './repositories/personalAiRepository.js'
import { createCredentialVault } from './services/credentialVault.js'
import { createPersonalAiService } from './services/personalAiService.js'
import { createPersonalSettingsRepository } from './repositories/personalSettingsRepository.js'
import { createPersonalSettingsService } from './services/personalSettingsService.js'
import { openStaticBuild } from './staticFiles.js'
import { createAdminRepository } from './repositories/adminRepository.js'
import { createAssetWorkflowService } from './assetWorkflows/definitionService.js'
import { createGenerationReadinessService } from './services/generationReadinessService.js'

async function checkPersonalCredential({ provider, apiKey }) {
  const request = provider === 'google'
    ? { url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, headers: { Accept: 'application/json' } }
    : provider === 'anthropic'
      ? { url: 'https://api.anthropic.com/v1/models', headers: { Accept: 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } }
      : provider === 'openrouter'
        ? { url: 'https://openrouter.ai/api/v1/key', headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` } }
        : { url: 'https://api.openai.com/v1/models', headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` } }
  const response = await fetch(request.url, { headers: request.headers })
  if (response.ok) return { ok: true }
  const label = provider === 'google' ? 'Google' : provider === 'openrouter' ? 'OpenRouter' : provider === 'anthropic' ? 'Anthropic' : 'OpenAI'
  if (response.status === 400 || response.status === 401 || response.status === 403) return { ok: false, code: 'invalid_key', message: `${label} rejected this API key.` }
  if (response.status === 429) return { ok: false, code: 'rate_limited', message: `${label} is rate limiting credential checks. Try again shortly.` }
  return { ok: false, code: 'provider_unavailable', message: `${label} could not validate this key right now.` }
}

async function testPersonalIntegration({ platform, webhookUrl, secret, eventType, payload }) {
  const eventLabel = typeof eventType === 'string'
    ? eventType.replaceAll('_', ' ')
    : 'test notification'
  const campaignLabel = payload?.campaignId ? ` · campaign ${payload.campaignId}` : ''
  const message = `Banner Studio: ${eventLabel}${campaignLabel}`
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(platform === 'discord' ? { content: message } : { text: message }),
  })
  if (response.ok) return { ok: true }
  if (response.status === 429) return { ok: false, code: 'rate_limited', message: 'The destination is rate limiting requests.' }
  return { ok: false, code: 'delivery_failed', message: 'The destination rejected the test notification.' }
}

const productionDependencies = {
  buildApp,
  createAuthenticator,
  createFirebaseTokenVerifier,
  createPool,
  createWorkflowService,
  createGenerationControlPlane,
  createGenerationService,
  createMockProvider,
  createGeminiProvider,
  createGenerationProviderRegistry,
  reconcileGenerationSettings,
  createMemoryAssetStore,
  createGcsAssetStore,
  createAssetService,
  createVisualUploadService,
  createVersionService,
  createReviewService,
  createFigmaHandoffService,
  createFigmaPairingService,
  createFigmaSubmissionService,
  createDeliveryService,
  createWorkspaceService,
  createBrandDesignSystemService,
  createBrandDesignSystemProvider,
  createPersonalAiRepository,
  createCredentialVault,
  createPersonalAiService,
  createPersonalSettingsRepository,
  createPersonalSettingsService,
  createAdminRepository,
  createAssetWorkflowService,
  createGenerationReadinessService,
  openStaticBuild,
  runMigrations,
}

export async function createServerRuntime({ environment = process.env, dependencies = {} } = {}) {
  const resolved = { ...productionDependencies, ...dependencies }
  const config = loadConfig(environment)
  const briefingEnabled=environment.BRIEFING_ENABLED==='true'
  if(briefingEnabled && (config.generation.provider!=='gemini' || config.generation.location!=='eu')) throw new Error('Source briefing requires managed Vertex AI EU')
  const staticRoot = config.staticServing.enabled ? config.staticServing.root : undefined
  let app
  let pool
  let staticBuild
  let tokenVerifier
  let generationProvider
  let assetStore
  let personalAiService
  let personalSettingsService
  let notificationTimer
  let stopVideoWorker
  let closePromise

  const close = () => {
    if (!closePromise) {
      closePromise = (async () => {
        const failures = []
        for (const operation of [
          () => stopVideoWorker?.(),
          () => app?.close?.(),
          () => tokenVerifier?.close?.(),
          () => generationProvider?.close?.(),
          () => assetStore?.close?.(),
          () => staticBuild?.close?.(),
          () => { if (notificationTimer) clearInterval(notificationTimer) },
          () => pool?.end?.(),
        ]) {
          try {
            await operation()
          } catch (error) {
            failures.push(error)
          }
        }
        if (failures.length > 0) throw failures[0]
      })()
    }
    return closePromise
  }

  try {
    if (staticRoot !== undefined) staticBuild = await resolved.openStaticBuild(staticRoot)
    pool = resolved.createPool({ connectionString: config.databaseUrl })
    if (config.runMigrationsOnStartup) await resolved.runMigrations({ pool })
    const providerSelection = config.generation.provider === 'gemini'
      ? {
          provider: 'gemini',
          textModel: config.generation.textModel,
          imageModel: config.generation.imageModel,
          region: config.generation.location,
        }
      : { provider: 'mock', textModel: 'mock-v1', imageModel: 'mock-v1', region: 'europe-west6' }
    const providerRegistry = resolved.createGenerationProviderRegistry(providerSelection)
    await resolved.reconcileGenerationSettings({
      pool,
      providerRegistry,
      selected: { provider: providerSelection.provider, model: providerSelection.textModel, region: providerSelection.region },
    })
    if (environment.PERSONAL_CREDENTIAL_ENCRYPTION_KEY) {
      const vault = resolved.createCredentialVault({ key: environment.PERSONAL_CREDENTIAL_ENCRYPTION_KEY, keyVersion: environment.PERSONAL_CREDENTIAL_ENCRYPTION_KEY_VERSION ?? 'v1' })
      personalAiService = resolved.createPersonalAiService({ repository: resolved.createPersonalAiRepository(pool), vault, testCredential: checkPersonalCredential })
      personalSettingsService = resolved.createPersonalSettingsService({ repository: resolved.createPersonalSettingsRepository(pool), vault, testDelivery: testPersonalIntegration })
      notificationTimer = setInterval(() => {
        personalSettingsService?.deliverPending({ limit: 25 }).catch(() => {})
      }, 30_000)
      notificationTimer.unref?.()
    }
    const workflowService = resolved.createWorkflowService({ pool, providerRegistry, ...(briefingEnabled?{briefingEnabled:true}:{}), ...(personalAiService ? { personalAiService } : {}), ...(personalSettingsService ? { personalSettingsService } : {}) })
    const generationReadinessService = resolved.createGenerationReadinessService({ workflowService, ...(personalAiService ? { personalAiService } : {}), sourceBriefing: briefingEnabled })
    generationProvider = config.generation.provider === 'gemini'
      ? resolved.createGeminiProvider({
          project: config.generation.projectId,
          location: config.generation.location,
          textModel: config.generation.textModel,
          imageModel: config.generation.imageModel,
        })
      : resolved.createMockProvider({ model: providerSelection.textModel, region: providerSelection.region })
    const generationControlPlane = resolved.createGenerationControlPlane({
      pool,
      providerRegistry,
      ...(personalAiService ? { personalSettingsResolver: ({ actor, step }) => personalAiService.getGenerationSelection({ actor, step }) } : {}),
    })
    assetStore = config.assetStorage.provider === 'gcs'
      ? resolved.createGcsAssetStore({ bucketName: config.assetStorage.bucket, projectId: config.assetStorage.projectId })
      : resolved.createMemoryAssetStore()
    const videoGenerationService = createVideoGenerationService({ pool, assetStore, providerFactory: () => environment.GEMINI_MEDIA_API_KEY
      ? createVeoProvider({ apiKey: environment.GEMINI_MEDIA_API_KEY, model: environment.GEMINI_VIDEO_MODEL }) : null })
    const assetService = resolved.createAssetService({ pool, assetStore })
    const versionService = resolved.createVersionService({ pool, assetStore })
    const reviewService = resolved.createReviewService({ pool, ...(personalSettingsService ? { notificationService: personalSettingsService } : {}) })
    const deliveryService = resolved.createDeliveryService({ pool, assetStore })
    const workspaceService = resolved.createWorkspaceService({ pool })
    const brandProvider = resolved.createBrandDesignSystemProvider({
      provider: providerSelection.provider,
      model: providerSelection.textModel,
      region: providerSelection.region,
      delegate: generationProvider,
    })
    const templateBrandService = createTemplateBrandService({ pool, assetStore })
    const brandDesignSystemService = resolved.createBrandDesignSystemService({ pool, provider: brandProvider, assetStore, onPublish: templateBrandService.refresh })
    const adminRepository = resolved.createAdminRepository(pool)
    const assetWorkflowService = resolved.createAssetWorkflowService({ pool })
    const generationService = resolved.createGenerationService({
      pool,
      controlPlane: generationControlPlane,
      providers: { [config.generation.provider]: generationProvider },
      assetStore,
      ...(personalSettingsService ? { notificationService: personalSettingsService } : {}),
      ...(personalAiService ? {
        personalProviderFactory: async ({ actor, provider, model, region, step, credentialVersion }) => {
          const credentialProvider = provider === 'gemini' ? 'google' : provider
          const apiKey = await personalAiService.getCredential({ actor, provider: credentialProvider, credentialVersion })
          if (!apiKey) return null
          if (provider === 'gemini') return resolved.createGeminiProvider({
            apiKey, location: region,
            textModel: step === 'image' ? config.generation.textModel : model,
            imageModel: step === 'image' ? model : config.generation.imageModel,
          })
          if (provider === 'openai' && step === 'image') return createPersonalOpenAiImageProvider({ apiKey, model, region })
          if (step === 'image') return null
          return createPersonalProvider({ provider, model, apiKey, region })
        },
      } : {}),
    })
    tokenVerifier = resolved.createFirebaseTokenVerifier({ projectId: config.firebaseProjectId })
    const resolveActor = resolved.createAuthenticator({ pool, tokenVerifier })
    app = resolved.buildApp({
      runtimeConfig: { firebase: config.firebaseWeb,capabilities:{sourceBriefing:briefingEnabled} },
      ...(briefingEnabled?{briefSourceService:createBriefSourceService({pool,assetStore}),briefingService:createBriefingService({pool})}:{}),
      logger: {
        level: config.logLevel,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.token',
            'req.body.accessToken',
            'req.body.refreshToken',
            'req.body.apiKey',
            'req.body.secret',
            'req.body.webhookUrl',
          ],
          censor: '[REDACTED]',
        },
      },
      readiness: async () => {
        await pool.query('SELECT 1')
        return true
      },
      resolveActor,
      workflowService,
      ...(personalAiService ? { personalAiService } : {}),
      ...(personalSettingsService ? { personalSettingsService } : {}),
      generationReadinessService,
      generationService,
      videoGenerationService,
      assetService,
      visualUploadService: resolved.createVisualUploadService({ pool, assetStore }),
      versionService,
      reviewService,
      figmaHandoffService: resolved.createFigmaHandoffService({ pool, assetStore }),
      figmaPairingService: resolved.createFigmaPairingService({ pool }),
      figmaSubmissionService: resolved.createFigmaSubmissionService({ pool, assetStore, reviewService }),
      deliveryService,
      workspaceService,
      brandDesignSystemService,
      templateBrandService,
      adminRepository,
      assetWorkflowService,
      staticBuild,
    })
    if (environment.GEMINI_MEDIA_API_KEY) stopVideoWorker = startVideoWorker(videoGenerationService)
    return { app, close, config }
  } catch (error) {
    await close().catch(() => {})
    throw error
  }
}
