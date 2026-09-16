import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import {
  createAssetWorkflowSchema,
  saveAssetWorkflowSchema,
  revisionRequestSchema,
  simulateAssetWorkflowSchema,
  publishAssetWorkflowSchema,
  activateAssetWorkflowSchema,
} from '../../shared/assetWorkflowContracts.js'
import { withTransaction } from '../db/pool.js'
import { PublicApiError, parse, notFound } from '../routes/support.js'
import { createDefinitionRepository } from './definitionRepository.js'
import { capabilityCatalog } from './catalog.js'
import {
  semanticHash,
  hashValue,
  validateDefinition,
  simulateDefinition,
  seedDefinitions,
} from './simulation.js'

function authorize(actor) {
  if (
    !actor ||
    actor.role !== 'admin' ||
    actor.disabled === true ||
    actor.disabledAt != null
  )
    throw new PublicApiError(
      403,
      'forbidden',
      'An enabled administrator is required',
    )
}
function revision(row, input) {
  if (row.draft_revision !== input.expectedRevision)
    throw new PublicApiError(
      409,
      'stale_revision',
      'The saved recipe has changed; reload before retrying',
    )
}
function valid(draft) {
  const result = validateDefinition(draft)
  if (!result.valid)
    throw new PublicApiError(
      422,
      'invalid_definition',
      'Recipe is not valid',
      result.issues,
    )
}
const uuid = z.uuid()
export function createAssetWorkflowService({ pool }) {
  async function locked(actor, id, operation) {
    authorize(actor)
    parse(uuid, id)
    return withTransaction(pool, async (client) => {
      const repository = createDefinitionRepository(client),
        row = await repository.find(id, true)
      if (!row) notFound('Recipe')
      return operation(repository, row)
    })
  }
  return {
    async list({ actor }) {
      authorize(actor)
      const r = createDefinitionRepository(pool)
      return {
        items: await Promise.all((await r.list()).map((row) => r.detail(row))),
      }
    },
    async catalog({ actor }) {
      authorize(actor)
      return { items: capabilityCatalog }
    },
    async create({ actor, input }) {
      authorize(actor)
      input = parse(createAssetWorkflowSchema, input)
      try {
        return await withTransaction(pool, async (client) => {
          const r = createDefinitionRepository(client)
          return r.detail(
            await r.create({
              id: randomUUID(),
              input,
              hash: semanticHash(input.draft),
            }),
          )
        })
      } catch (error) {
        if (error.code === '23505')
          throw new PublicApiError(
            409,
            'duplicate_key',
            'A recipe with this key already exists',
          )
        throw error
      }
    },
    async get({ actor, id }) {
      return locked(actor, id, (r, row) => r.detail(row))
    },
    async save({ actor, id, input }) {
      authorize(actor)
      input = parse(saveAssetWorkflowSchema, input)
      return locked(actor, id, async (r, row) => {
        revision(row, input)
        return r.detail(
          await r.save(id, input.draft, semanticHash(input.draft)),
        )
      })
    },
    async validate({ actor, id, input }) {
      authorize(actor)
      input = parse(revisionRequestSchema, input)
      return locked(actor, id, async (r, row) => {
        revision(row, input)
        return validateDefinition(row.draft)
      })
    },
    async simulate({ actor, id, input }) {
      authorize(actor)
      input = parse(simulateAssetWorkflowSchema, input)
      return locked(actor, id, async (r, row) => {
        revision(row, input)
        if (row.draft_hash !== input.draftHash)
          throw new PublicApiError(
            409,
            'stale_hash',
            'Simulation must use the exact saved draft hash',
          )
        return simulateDefinition(row.draft, input.fixture)
      })
    },
    async publish({ actor, id, input }) {
      authorize(actor)
      input = parse(publishAssetWorkflowSchema, input)
      return locked(actor, id, async (r, row) => {
        const requestHash = hashValue(input),
          existing = await r.publication(id, input.idempotencyKey)
        if (existing) {
          if (existing.request_hash !== requestHash)
            throw new PublicApiError(
              409,
              'idempotency_conflict',
              'Publication key was used with different content',
            )
          return r.detail(row)
        }
        revision(row, input)
        valid(row.draft)
        await r.publish({
          id,
          versionId: randomUUID(),
          row,
          input,
          requestHash,
        })
        return r.detail(row)
      })
    },
    async activate({ actor, id, input }) {
      authorize(actor)
      input = parse(activateAssetWorkflowSchema, input)
      return locked(actor, id, async (r, row) => {
        const version = await r.version(id, input.versionId)
        if (!version) notFound('Recipe version')
        valid(version.definition)
        return r.detail(await r.activate(id, version.id))
      })
    },
    async reference({ actor, id, versionId }) {
      authorize(actor)
      parse(uuid, versionId)
      return locked(actor, id, async (r) => {
        const v = await r.version(id, versionId)
        if (!v) notFound('Recipe version')
        return {
          id,
          versionId: v.id,
          version: v.version,
          hash: v.hash,
          definition: v.definition,
        }
      })
    },
  }
}
// Explicit initialization only. Existing definitions and drafts are never overwritten.
export async function seedAssetWorkflows({ pool, actor }) {
  authorize(actor)
  return withTransaction(pool, async (client) => {
    const r = createDefinitionRepository(client),
      created = []
    for (const seed of seedDefinitions()) {
      const input = parse(createAssetWorkflowSchema, seed),
        row = await r.create({
          id: randomUUID(),
          input,
          hash: semanticHash(input.draft),
          ignoreDuplicate: true,
        })
      if (row) created.push(row.id)
    }
    return { created }
  })
}
