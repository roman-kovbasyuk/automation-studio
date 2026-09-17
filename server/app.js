import { registerFigmaRoutes } from './routes/figma.js'
import { registerVideoRoutes } from './routes/video.js'
import { randomUUID } from 'node:crypto'
import Fastify from 'fastify'
import { registerCampaignRoutes } from './routes/campaigns.js'
import { registerTemplateRoutes } from './routes/templates.js'
import { registerUserRoutes } from './routes/users.js'
import { registerSettingsRoutes } from './routes/settings.js'
import { registerSessionRoute } from './routes/session.js'
import { registerGenerationRoutes } from './routes/generation.js'
import { registerAssetRoutes } from './routes/assets.js'
import { registerVersionRoutes } from './routes/versions.js'
import { registerReviewRoutes } from './routes/review.js'
import { registerDeliveryRoutes } from './routes/delivery.js'
import { registerWorkspaceRoutes } from './routes/workspace.js'
import { registerBriefFileRoutes } from './routes/briefFiles.js'
import { registerBriefingRoutes } from './routes/briefing.js'
import { registerVisualRoutes } from './routes/visuals.js'
import { registerBrandDesignSystemRoutes } from './routes/brandDesignSystems.js'
import { registerAdminRoutes } from './routes/admin.js'
import { registerAssetWorkflowRoutes } from './routes/assetWorkflows.js'
import { apiErrorResponseSchema } from '../shared/contracts.js'
import { createAuthorizer } from './auth/authorize.js'
import { registerStaticFiles } from './staticFiles.js'
import { registerLocalServiceRoutes } from './routes/localServices.js'

const safeRequestId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

function requestIdFrom(request) {
  const inboundId = request.headers['x-request-id']
  if (typeof inboundId === 'string' && safeRequestId.test(inboundId)) {
    return inboundId
  }

  return randomUUID()
}

function errorEnvelope(code, message, requestId, details) {
  return {
    code,
    message,
    ...(details === undefined ? {} : { details }),
    requestId,
  }
}

export function buildApp({ readiness = async () => true, resolveActor, workflowService, personalAiService, personalSettingsService, generationReadinessService, generationService, videoGenerationService, assetService, visualUploadService, versionService, reviewService, figmaHandoffService, figmaPairingService, figmaSubmissionService, deliveryService, workspaceService, briefSourceService, briefingService, brandDesignSystemService, templateBrandService, adminRepository, assetWorkflowService, localServiceController, staticRoot, staticBuild, logger = false, runtimeConfig = { firebase: {} } } = {}) {
  const app = Fastify({
    logger,
    requestIdHeader: false,
    genReqId: requestIdFrom,
  })

  app.addHook('onSend', (request, reply, payload, done) => {
    reply.header('x-request-id', request.id)
    done(null, payload)
  })

  app.addHook('preSerialization', (request, _reply, payload, done) => {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      done(null, { ...payload, requestId: request.id })
      return
    }

    done(null, payload)
  })

  app.get('/healthz', async () => ({ status: 'ok' }))

  app.get('/api/v1/runtime-config', async () => runtimeConfig)

  app.get('/readyz', async (request, reply) => {
    if (await readiness()) return { status: 'ready' }

    return reply.code(503).send(errorEnvelope(
      'DEPENDENCY_UNAVAILABLE',
      'Dependencies are not ready',
      request.id,
    ))
  })

  if ((resolveActor && !workflowService) || (!resolveActor && workflowService)) {
    throw new TypeError('resolveActor and workflowService must be injected together')
  }
  if (resolveActor && workflowService) {
    const { requireRole } = createAuthorizer(resolveActor)
    const dependencies = { requireRole, workflowService }
    registerSessionRoute(app, dependencies)
    registerCampaignRoutes(app, dependencies)
    registerBriefFileRoutes(app, { requireRole })
    if (briefSourceService || briefingService) registerBriefingRoutes(app,{requireRole,briefSourceService,briefingService})
    if (workspaceService) registerWorkspaceRoutes(app, { requireRole, workspaceService })
    registerTemplateRoutes(app, dependencies)
    registerUserRoutes(app, { ...dependencies, personalAiService, personalSettingsService, generationReadinessService })
    registerSettingsRoutes(app, dependencies)
    if (videoGenerationService) registerVideoRoutes(app, { requireRole, videoGenerationService })
    if (generationService) registerGenerationRoutes(app, { requireRole, generationService })
    if (assetService) registerAssetRoutes(app, { requireRole, assetService })
    if (visualUploadService) registerVisualRoutes(app, { requireRole, visualUploadService })
    if (versionService) registerVersionRoutes(app, { requireRole, versionService })
    if (figmaHandoffService && figmaPairingService) registerFigmaRoutes(app, { requireRole, figmaHandoffService, figmaPairingService, figmaSubmissionService })
    if (reviewService) registerReviewRoutes(app, { requireRole, reviewService })
    if (deliveryService) registerDeliveryRoutes(app, { requireRole, deliveryService })
    if (brandDesignSystemService) registerBrandDesignSystemRoutes(app, { requireRole, brandDesignSystemService, templateBrandService })
    if (adminRepository) registerAdminRoutes(app, { requireRole, adminRepository })
    if (assetWorkflowService) registerAssetWorkflowRoutes(app, { requireRole, assetWorkflowService })
  }

  if (staticRoot !== undefined || staticBuild !== undefined) {
    registerStaticFiles(app, { staticRoot, staticBuild })
  }

  if (localServiceController) registerLocalServiceRoutes(app, { controller: localServiceController })

  app.setNotFoundHandler((request, reply) => reply.code(404).send(apiErrorResponseSchema.parse(errorEnvelope(
    'NOT_FOUND',
    'Route not found',
    request.id,
  ))))

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500

    const exposed = error.expose === true && statusCode !== 500
    reply.code(statusCode).send(apiErrorResponseSchema.parse(errorEnvelope(
      exposed ? error.code : (statusCode === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
      exposed ? error.publicMessage : (statusCode === 500 ? 'An unexpected error occurred' : 'Request could not be processed'),
      request.id,
      exposed ? error.details : undefined,
    )))
  })

  return app
}
