import { randomUUID } from 'node:crypto'
import { briefSchema, campaignPatchRequestSchema, campaignRecordSchema, createCampaignRequestSchema, createInvitationRequestSchema, createTemplateVersionRequestSchema, settingsPatchRequestSchema } from '../../shared/contracts.js'
import { hashCanonical } from '../../shared/canonicalJson.js'
import { rawBrief } from '../../shared/briefAnalysis.js'
import { initialBriefingState, createBriefingRepository } from '../repositories/briefingRepository.js'
import { sourceProjection } from '../../shared/briefingDependencies.js'
import { withTransaction } from '../db/pool.js'
import { createCampaignRepository } from '../repositories/campaignRepository.js'
import { createSettingsRepository } from '../repositories/settingsRepository.js'
import { createTemplateRepository } from '../repositories/templateRepository.js'
import { createUserRepository } from '../repositories/userRepository.js'
import { createAuditRepository } from '../repositories/auditRepository.js'
import { assertProviderRegistry, generationProviderRegistry, providerTupleAllowed } from '../providers/registry.js'
import { applyArtifactEdit } from '../../shared/workflowRules.js'

const campaignEditors = ['marketer', 'admin']
const invitationTtlMs = 7 * 24 * 60 * 60 * 1000

export class WorkflowServiceError extends Error {
  constructor(statusCode, code, message, details) {
    super(message)
    this.name = 'WorkflowServiceError'
    this.statusCode = statusCode
    this.code = code
    this.publicMessage = message
    this.details = details
    this.expose = true
  }
}

const defaultRepositories = {
  campaign: createCampaignRepository,
  settings: createSettingsRepository,
  template: createTemplateRepository,
  user: createUserRepository,
  audit: createAuditRepository,
}

function validate(schema, value) {
  const parsed = schema.safeParse(value)
  if (parsed.success) return parsed.data
  throw new WorkflowServiceError(400, 'invalid_request', 'Request validation failed', parsed.error.issues.map((issue) => ({
    path: issue.path.join('.'), message: issue.message,
  })))
}

function requireRole(actor, roles) {
  if (!actor || !roles.includes(actor.role) || actor.disabled) {
    throw new WorkflowServiceError(403, 'forbidden', 'This actor cannot perform the requested operation')
  }
}

function revisionConflict() {
  return new WorkflowServiceError(409, 'revision_conflict', 'The resource changed since it was loaded')
}

function missing(name) {
  return new WorkflowServiceError(404, 'not_found', `${name} was not found`)
}

function personalSettings(user) {
  const names = (user.displayName ?? '').trim().split(/\s+/).filter(Boolean)
  return {
    profile: { firstName: user.firstName ?? names[0] ?? user.email.split('@')[0], lastName: user.lastName ?? names.slice(1).join(' '), email: user.email, emailVerified: user.emailVerified ?? null },
    signIn: { googleEmail: user.googleEmail ?? null, passwordConfigured: user.passwordConfigured === true, googleConnected: user.googleConnected !== false },
    ai: { connections: ['anthropic', 'openai', 'google', 'openrouter'].map(provider => ({ provider, status: 'not_connected' })), defaults: { text: null, image: null, video: null } },
    integrations: ['slack', 'discord'].map(platform => ({ platform, status: 'not_connected' })),
  }
}

function campaignUpdateInput(id, campaign, expectedRevision) {
  return {
    id,
    expectedRevision,
    title: campaign.title,
    brief: campaign.brief,
    status: campaign.status,
    selectedCopyId: campaign.selectedCopyId,
    selectedDirectionId: campaign.selectedDirectionId,
    compositionId: campaign.compositionId,
    currentVersionNumber: campaign.currentVersionNumber,
    openVersionId: campaign.openVersionId,
  }
}

function lockedCampaignSnapshot(value) {
  const parsed = campaignRecordSchema.safeParse(value)
  if (!parsed.success) throw new Error('Persistence returned an invalid campaign state')
  return structuredClone(parsed.data)
}

function commandCampaignResult(value, lockedId) {
  const parsed = campaignRecordSchema.safeParse(value)
  if (!parsed.success) throw new WorkflowServiceError(409, 'invalid_campaign_result', 'Campaign command returned an invalid state')
  if (parsed.data.id !== lockedId) throw new WorkflowServiceError(409, 'campaign_identity_mismatch', 'Campaign commands cannot change campaign identity')
  return parsed.data
}

export function createWorkflowService({
  pool,
  transaction = withTransaction,
  repositories = defaultRepositories,
  idGenerator = randomUUID,
  clock = () => new Date(),
  providerRegistry = generationProviderRegistry,
  personalAiService,
  personalSettingsService,
} = {}) {
  if (!pool || typeof pool.query !== 'function') throw new TypeError('A PostgreSQL pool is required')
  if (typeof transaction !== 'function') throw new TypeError('A transaction function is required')
  assertProviderRegistry(providerRegistry)

  const audit = async (client, event) => repositories.audit(client).append({
    id: idGenerator(),
    createdAt: clock(),
    ...event,
  })

  const notifyProjectChange = async ({ actor, campaign, action }) => {
    if (!personalSettingsService || !campaign?.id) return
    try {
      await personalSettingsService.enqueueEvent({
        actor,
        eventType: 'project_change',
        dedupeKey: `campaign:${campaign.id}:revision:${campaign.revision}`,
        payload: { actorId: actor.id, campaignId: campaign.id, action, revision: campaign.revision, status: campaign.status },
      })
    } catch { /* Notification failures must not fail committed project changes. */ }
  }

  const executeCampaignCommand = async ({
    actor,
    campaignId,
    expectedRevision,
    action,
    validate: validateCommand = () => true,
    apply,
    afterPersist,
    auditPayload = {},
  }) => {
    requireRole(actor, campaignEditors)
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw new WorkflowServiceError(400, 'invalid_revision', 'Expected revision must be a non-negative integer')
    }
    if (typeof validateCommand !== 'function' || typeof apply !== 'function') {
      throw new TypeError('Campaign commands require validate and apply functions')
    }

    return transaction(pool, async (client) => {
      const campaigns = repositories.campaign(client)
      const current = await campaigns.findByIdForUpdate(campaignId)
      if (!current) throw missing('Campaign')
      const snapshot = lockedCampaignSnapshot(current)
      const lockedId = snapshot.id
      if (snapshot.revision !== expectedRevision) throw revisionConflict()

      const validation = await validateCommand({ campaign: structuredClone(snapshot), actor })
      if (validation !== true) {
        if (validation instanceof Error) throw validation
        throw new WorkflowServiceError(409, 'command_rejected', 'The command is not valid for the current campaign')
      }

      const desired = commandCampaignResult(await apply(structuredClone(snapshot), {client}), lockedId)
      let persisted
      try {
        persisted = commandCampaignResult(
          await campaigns.updateState(campaignUpdateInput(lockedId, desired, expectedRevision)),
          lockedId,
        )
      } catch (error) {
        if (error?.code === 'revision_conflict') throw revisionConflict()
        if (error?.code === 'not_found') throw missing('Campaign')
        throw error
      }

      await afterPersist?.({ client, campaigns, before: snapshot, desired, persisted, actor })

      await audit(client, {
        actorId: actor.id,
        actorRole: actor.role,
        action,
        entityType: 'campaign',
        entityId: lockedId,
        beforeStatus: snapshot.status,
        afterStatus: persisted.status,
        payload: auditPayload,
      })
      return persisted
    })
  }

  return {
    executeCampaignCommand,

    async getPersonalSettings({ actor }) {
      requireRole(actor, ['marketer', 'designer', 'admin'])
      const user = await repositories.user(pool).findById(actor.id)
      if (!user) throw missing('User')
      const base = personalSettings(user)
      base.profile.emailVerified = actor.emailVerified ?? base.profile.emailVerified
      base.signIn.googleEmail = actor.googleEmail ?? base.signIn.googleEmail
      const [ai, personal] = await Promise.all([
        personalAiService ? personalAiService.getSettings({ actor }) : null,
        personalSettingsService ? personalSettingsService.getSettings({ actor }) : null,
      ])
      if (!ai && !personal) return base
      return {
        ...base,
        ...(ai ? { ai: { ...ai, defaults: { ...ai.defaults, video: null } } } : {}),
        ...(personal ? personal : {}),
      }
    },

    async updatePersonalProfile({ actor, input }) {
      requireRole(actor, ['marketer', 'designer', 'admin'])
      const firstName = input.firstName.trim()
      const lastName = input.lastName.trim()
      const displayName = [firstName, lastName].filter(Boolean).join(' ')
      return transaction(pool, async (client) => {
        const user = await repositories.user(client).updateDisplayName({ id: actor.id, displayName, firstName, lastName: lastName || null })
        if (!user) throw missing('User')
        await audit(client, { actorId: actor.id, actorRole: actor.role, action: 'profile.updated', entityType: 'user', entityId: actor.id, payload: { changedFields: ['displayName'] } })
        return personalSettings(user).profile
      })
    },

    async syncPasswordAuth({ actor }) {
      requireRole(actor, ['marketer', 'designer', 'admin'])
      if (actor.authProvider !== 'password') {
        throw new WorkflowServiceError(401, 'recent_password_auth_required', 'Sign in with your new password before continuing')
      }
      return transaction(pool, async (client) => {
        const updated = await repositories.user(client).setAuthMethodState({ id: actor.id, passwordConfigured: true })
        if (!updated) throw missing('User')
        await audit(client, { actorId: actor.id, actorRole: actor.role, action: 'auth.password_configured', entityType: 'user', entityId: actor.id, payload: {} })
        return personalSettings(updated).signIn
      })
    },

    async disconnectGoogle({ actor }) {
      requireRole(actor, ['marketer', 'designer', 'admin'])
      const user = await repositories.user(pool).findById(actor.id)
      if (!user) throw missing('User')
      if (!user.passwordConfigured) {
        throw new WorkflowServiceError(409, 'password_required', 'Create and verify a password before disconnecting Google')
      }
      if (actor.authProvider !== 'password') {
        throw new WorkflowServiceError(401, 'recent_password_auth_required', 'Sign in with your password again before disconnecting Google')
      }
      return transaction(pool, async (client) => {
        const updated = await repositories.user(client).setAuthMethodState({ id: actor.id, googleConnected: false })
        if (!updated) throw missing('User')
        await audit(client, { actorId: actor.id, actorRole: actor.role, action: 'auth.google_disconnected', entityType: 'user', entityId: actor.id, payload: {} })
        return personalSettings(updated).signIn
      })
    },

    async listCampaigns({ actor }) {
      requireRole(actor, ['marketer', 'designer', 'admin'])
      return repositories.campaign(pool).list()
    },

    async getCampaign({ actor, campaignId }) {
      requireRole(actor, ['marketer', 'designer', 'admin'])
      return repositories.campaign(pool).findById(campaignId)
    },

    async createCampaign({ actor, input }) {
      requireRole(actor, campaignEditors)
      const command = validate(createCampaignRequestSchema, input)
      // Banner campaigns always enter the canonical briefing workflow. The
      // client marker is a compatibility hint for older callers, not a
      // permission switch that can select the retired flow.
      if (command.projectType === 'banners' || command.brief.briefing?.schemaVersion === 2) {
        command.brief.briefing=initialBriefingState(command.brief)
      }
      const created = await transaction(pool, async (client) => {
        const created = await repositories.campaign(client).create({
          id: idGenerator(), ...command, createdBy: actor.id,
        })
        await audit(client, {
          actorId: actor.id, actorRole: actor.role, action: 'campaign.created',
          entityType: 'campaign', entityId: created.id, beforeStatus: null,
          afterStatus: created.status, payload: {},
        })
        return created
      })
      await notifyProjectChange({ actor, campaign: created, action: 'campaign.created' })
      return created
    },

    async patchCampaign({ actor, campaignId, expectedRevision, patch }) {
      const command = validate(campaignPatchRequestSchema, patch)
      const changedFields = Object.keys(command).sort()
      const briefChanged = Object.hasOwn(command, 'brief')
      const updated = await executeCampaignCommand({
        actor,
        campaignId,
        expectedRevision,
        action: 'campaign.updated',
        validate: ({ campaign }) => {
          if (!briefChanged) return true
          validate(briefSchema,{...command.brief,...(campaign.brief.briefing?{briefing:campaign.brief.briefing}:{})})
          const edit = applyArtifactEdit(campaign, 'brief')
          if (edit.ok) return true
          return new WorkflowServiceError(edit.status, edit.code, edit.message)
        },
        apply: async (campaign, {client}) => {
          if (!briefChanged) return { ...campaign, ...command }
          const edit = applyArtifactEdit(campaign, 'brief')
          if (!edit.ok) throw new WorkflowServiceError(edit.status, edit.code, edit.message)
          const { stale: _stale, ...editedCampaign } = edit.campaign
          let brief=hashCanonical(rawBrief(campaign.brief)) === hashCanonical(rawBrief(command.brief))
            ? command.brief : {...command.brief,analysis:null}
          if (campaign.brief.briefing?.schemaVersion===2) {
            const sources=await createBriefingRepository(client).listSources(campaign.id)
            const sourceKey=hashCanonical(sourceProjection(command.brief,sources.map(row=>({id:row.id,contentHash:row.content_hash,parserVersion:row.parser_version}))))
            const current=campaign.brief.briefing,changed=current.sourceKey!==sourceKey
            // Raw edits may invalidate server evidence, never author or remove it.
            brief={...command.brief,analysis:changed?null:campaign.brief.analysis,
              briefing:{...current,sourceKey,analysisJobId:changed?null:current.analysisJobId,confirmation:changed?null:current.confirmation}}
          }
          return {
            ...editedCampaign,
            ...command,
            brief,
            selectedCopyId: edit.campaign.selectedCopyId ?? null,
            selectedDirectionId: edit.campaign.selectedDirectionId ?? null,
            compositionId: edit.campaign.compositionId ?? null,
          }
        },
        afterPersist: briefChanged
          ? ({ campaigns, before }) => campaigns.markArtifactsStale(before.id, {
              copy: true,
              directions: true,
              composition: true,
            })
          : undefined,
        auditPayload: { changedFields },
      })
      await notifyProjectChange({ actor, campaign: updated, action: 'campaign.updated' })
      return updated
    },

    async archiveCampaign({ actor, campaignId, expectedRevision }) {
      requireRole(actor, campaignEditors)
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        throw new WorkflowServiceError(400, 'invalid_revision', 'Expected revision must be a non-negative integer')
      }
      const archived = await transaction(pool, async (client) => {
        const campaigns = repositories.campaign(client)
        const current = await campaigns.findByIdForUpdate(campaignId)
        if (!current) throw missing('Campaign')
        const snapshot = lockedCampaignSnapshot(current)
        if (snapshot.revision !== expectedRevision) throw revisionConflict()
        const archivedAt = clock()
        let archived
        try {
          archived = commandCampaignResult(
            await campaigns.archive({ id: snapshot.id, expectedRevision, archivedAt }),
            snapshot.id,
          )
        } catch (error) {
          if (error?.code === 'revision_conflict') throw revisionConflict()
          if (error?.code === 'not_found') throw missing('Campaign')
          throw error
        }
        await audit(client, {
          actorId: actor.id, actorRole: actor.role, action: 'campaign.archived',
          entityType: 'campaign', entityId: snapshot.id, beforeStatus: snapshot.status,
          afterStatus: snapshot.status, payload: {},
        })
        return archived
      })
      await notifyProjectChange({ actor, campaign: archived, action: 'campaign.archived' })
      return archived
    },

    async duplicateCampaign({ actor, campaignId }) {
      requireRole(actor, campaignEditors)
      const duplicated = await transaction(pool, async (client) => {
        const campaigns = repositories.campaign(client)
        const source = await campaigns.findByIdForUpdate(campaignId)
        if (!source) throw missing('Campaign')
        const raw=rawBrief(source.brief)
        // Duplicates start their own canonical briefing, as creation does.
        const canonicalBanner=(source.projectType ?? 'banners') === 'banners' || source.brief.briefing?.schemaVersion === 2
        const created = await campaigns.create({
          id: idGenerator(),
          title: `${source.title} copy`,
          projectType: source.projectType ?? 'banners',
          brief: canonicalBanner ? { ...raw, briefing: initialBriefingState(raw) } : raw,
          createdBy: actor.id,
        })
        await audit(client, {
          actorId: actor.id, actorRole: actor.role, action: 'campaign.duplicated',
          entityType: 'campaign', entityId: created.id, beforeStatus: null,
          afterStatus: created.status, payload: { sourceCampaignId: source.id },
        })
        return created
      })
      await notifyProjectChange({ actor, campaign: duplicated, action: 'campaign.duplicated' })
      return duplicated
    },

    async listTemplates({ actor }) {
      requireRole(actor, ['marketer', 'designer', 'admin'])
      return repositories.template(pool).listLatest()
    },

    async listTemplateVersions({ actor, templateId }) {
      requireRole(actor, ['marketer', 'designer', 'admin'])
      return repositories.template(pool).listVersions(templateId)
    },

    async getTemplateVersion({ actor, templateId, version }) {
      requireRole(actor, ['marketer', 'designer', 'admin'])
      return repositories.template(pool).findVersion(templateId, version)
    },

    async createTemplateVersion({ actor, input }) {
      requireRole(actor, ['admin'])
      const command = validate(createTemplateVersionRequestSchema, input)
      if (command.id !== command.manifest.id || command.version !== command.manifest.version || command.name !== command.manifest.name) {
        throw new WorkflowServiceError(400, 'template_identity_mismatch', 'Template identity must match its manifest')
      }
      return transaction(pool, async (client) => {
        const created = await repositories.template(client).createVersion({
          ...command,
          manifestHash: hashCanonical(command.manifest),
          createdBy: actor.id,
        })
        await audit(client, {
          actorId: actor.id, actorRole: actor.role, action: 'template.version_created',
          entityType: 'template', entityId: command.id, payload: { version: command.version },
        })
        return created
      })
    },

    async getSettings({ actor }) {
      requireRole(actor, ['marketer', 'designer', 'admin'])
      return repositories.settings(pool).get()
    },

    async updateSettings({ actor, expectedRevision, patch }) {
      requireRole(actor, ['admin'])
      const command = validate(settingsPatchRequestSchema, patch)
      return transaction(pool, async (client) => {
        const settings = repositories.settings(client)
        const current = await settings.getForUpdate()
        if (!current) throw missing('Settings')
        if (current.revision !== expectedRevision) throw revisionConflict()
        const desired = { ...current, ...command }
        if (!providerTupleAllowed(providerRegistry, desired)) {
          throw new WorkflowServiceError(400, 'invalid_provider_configuration', 'The selected generation provider configuration is not available')
        }
        let updated
        try {
          updated = await settings.update({ ...desired, expectedRevision, updatedBy: actor.id })
        } catch (error) {
          if (error?.code === 'revision_conflict') throw revisionConflict()
          throw error
        }
        await audit(client, {
          actorId: actor.id, actorRole: actor.role, action: 'settings.updated',
          entityType: 'settings', entityId: 'global', payload: { changedFields: Object.keys(command).sort() },
        })
        return updated
      })
    },

    async createInvitation({ actor, input }) {
      requireRole(actor, ['admin'])
      const command = validate(createInvitationRequestSchema, input)
      return transaction(pool, async (client) => {
        const now = clock()
        const invitation = await repositories.user(client).createInvitation({
          id: idGenerator(),
          email: command.email,
          role: command.role,
          invitedBy: actor.id,
          expiresAt: new Date(now.getTime() + invitationTtlMs),
        })
        await audit(client, {
          actorId: actor.id, actorRole: actor.role, action: 'invitation.created',
          entityType: 'invitation', entityId: invitation.id, payload: { role: invitation.role },
        })
        return invitation
      })
    },

    async disableUser({ actor, userId }) {
      requireRole(actor, ['admin'])
      return transaction(pool, async (client) => {
        const users = repositories.user(client)
        const current = await users.findByIdForUpdate(userId)
        if (!current) throw missing('User')
        if (current.disabled) throw new WorkflowServiceError(409, 'user_already_disabled', 'User is already disabled')
        const disabled = await users.setDisabled({ id: userId, disabled: true })
        await audit(client, {
          actorId: actor.id, actorRole: actor.role, action: 'user.disabled',
          entityType: 'user', entityId: userId, payload: {},
        })
        return disabled
      })
    },
  }
}
