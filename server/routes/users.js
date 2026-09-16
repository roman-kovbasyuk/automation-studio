import { z } from 'zod'
import { createInvitationRequestSchema, invitationResponseSchema, userResponseSchema, personalAiConnectionRequestSchema, personalAiDefaultsRequestSchema, personalIntegrationRequestSchema, notificationPreferencesRequestSchema } from '../../shared/contracts.js'
import { parse, strictResponse } from './support.js'

const userParamsSchema = z.strictObject({ userId: z.string().trim().min(1) })
const emptyCommandSchema = z.strictObject({})
const profileSchema = z.strictObject({ firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().max(100) })

export function registerUserRoutes(app, { requireRole, workflowService, personalAiService, personalSettingsService, generationReadinessService }) {
  app.get('/api/v1/me/settings', { preHandler: requireRole() }, async (request) => workflowService.getPersonalSettings({ actor: request.actor }))

  app.patch('/api/v1/me/profile', { preHandler: requireRole() }, async (request) => {
    const input = parse(profileSchema, request.body)
    return workflowService.updatePersonalProfile({ actor: request.actor, input })
  })

  app.post('/api/v1/me/sign-in/password/sync', { preHandler: requireRole() }, async (request) => {
    parse(emptyCommandSchema, request.body ?? {})
    return workflowService.syncPasswordAuth({ actor: request.actor })
  })

  app.post('/api/v1/me/sign-in/google/disconnect', { preHandler: requireRole() }, async (request) => {
    parse(emptyCommandSchema, request.body ?? {})
    return workflowService.disconnectGoogle({ actor: request.actor })
  })

  if (generationReadinessService) {
    app.get('/api/v1/me/ai/readiness', { preHandler: requireRole() }, async (request) => generationReadinessService.getReadiness({ actor: request.actor }))
  }

  if (personalAiService) {
    app.get('/api/v1/me/ai', { preHandler: requireRole() }, async (request) => personalAiService.getSettings({ actor: request.actor }))
    app.put('/api/v1/me/ai/connections', { preHandler: requireRole() }, async (request) => {
      const input = parse(personalAiConnectionRequestSchema, request.body)
      return personalAiService.saveConnection({ actor: request.actor, ...input })
    })
    app.post('/api/v1/me/ai/connections/:provider/check', { preHandler: requireRole() }, async (request) => {
      return personalAiService.checkConnection({ actor: request.actor, provider: request.params?.provider })
    })
    app.delete('/api/v1/me/ai/connections/:provider', { preHandler: requireRole() }, async (request) => {
      const provider = request.params?.provider
      return personalAiService.removeConnection({ actor: request.actor, provider })
    })
    app.patch('/api/v1/me/ai/defaults', { preHandler: requireRole() }, async (request) => {
      const input = parse(personalAiDefaultsRequestSchema, request.body)
      return personalAiService.updateDefaults({ actor: request.actor, ...input })
    })
  }

  if (personalSettingsService) {
    app.get('/api/v1/me/integrations', { preHandler: requireRole() }, async (request) => personalSettingsService.getSettings({ actor: request.actor }))
    app.put('/api/v1/me/integrations/:platform', { preHandler: requireRole() }, async (request) => {
      const input = parse(personalIntegrationRequestSchema, request.body)
      return personalSettingsService.connectIntegration({ actor: request.actor, platform: request.params?.platform, ...input })
    })
    app.post('/api/v1/me/integrations/:platform/test', { preHandler: requireRole() }, async (request) => personalSettingsService.testIntegration({ actor: request.actor, platform: request.params?.platform }))
    app.delete('/api/v1/me/integrations/:platform', { preHandler: requireRole() }, async (request) => personalSettingsService.disconnectIntegration({ actor: request.actor, platform: request.params?.platform }))
    app.patch('/api/v1/me/notifications', { preHandler: requireRole() }, async (request) => {
      const input = parse(notificationPreferencesRequestSchema, request.body)
      return personalSettingsService.updateNotifications({ actor: request.actor, input })
    })
  }

  app.post('/api/v1/users/invitations', { preHandler: requireRole('admin') }, async (request, reply) => {
    const actor = request.actor
    const input = parse(createInvitationRequestSchema, request.body)
    reply.code(201)
    return strictResponse(invitationResponseSchema, request, await workflowService.createInvitation({ actor, input }))
  })

  app.post('/api/v1/users/:userId/disable', { preHandler: requireRole('admin') }, async (request) => {
    const actor = request.actor
    const { userId } = parse(userParamsSchema, request.params)
    parse(emptyCommandSchema, request.body ?? {})
    return strictResponse(userResponseSchema, request, await workflowService.disableUser({ actor, userId }))
  })
}
