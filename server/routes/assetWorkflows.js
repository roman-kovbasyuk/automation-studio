import { z } from 'zod'
import {
  createAssetWorkflowSchema,
  saveAssetWorkflowSchema,
  revisionRequestSchema,
  simulateAssetWorkflowSchema,
  publishAssetWorkflowSchema,
  activateAssetWorkflowSchema,
  assetWorkflowDetailSchema,
  validationResultSchema,
  simulationResultSchema,
  referenceSchema,
} from '../../shared/assetWorkflowContracts.js'
import { parse, strictResponse } from './support.js'

const params = z.strictObject({ id: z.uuid() })
const referenceParams = params.extend({ versionId: z.uuid() })
const envelope = (schema) => schema.extend({ requestId: z.string() })
const catalogSchema = z.strictObject({
  items: z.array(
    z.strictObject({
      key: z.string(),
      version: z.number().int(),
      title: z.string(),
      description: z.string(),
      availability: z.literal('simulation_only'),
      liveEnabled: z.literal(false),
      inputContract: z.array(z.string()),
      requiredBindings: z.array(z.string()),
      outputContract: z.string(),
    }),
  ),
})

export function registerAssetWorkflowRoutes(
  app,
  { requireRole, assetWorkflowService: service },
) {
  const options = { preHandler: requireRole('admin'), bodyLimit: 250000 }
  const root = '/api/v1/admin/asset-workflows'
  const respond = (schema, request, value) =>
    strictResponse(envelope(schema), request, value)
  app.get(root, options, async (request) => {
    parse(z.strictObject({}), request.query)
    return respond(
      z.strictObject({ items: z.array(assetWorkflowDetailSchema) }),
      request,
      await service.list({ actor: request.actor }),
    )
  })
  app.get(
    '/api/v1/admin/asset-workflow-capabilities',
    options,
    async (request) => {
      parse(z.strictObject({}), request.query)
      return respond(
        catalogSchema,
        request,
        await service.catalog({ actor: request.actor }),
      )
    },
  )
  app.post(root, options, async (request, reply) => {
    const input = parse(createAssetWorkflowSchema, request.body)
    const result = await service.create({ actor: request.actor, input })
    reply.code(201)
    return respond(assetWorkflowDetailSchema, request, result)
  })
  app.get(`${root}/:id`, options, async (request) =>
    respond(
      assetWorkflowDetailSchema,
      request,
      await service.get({
        actor: request.actor,
        ...parse(params, request.params),
      }),
    ),
  )
  for (const [method, path, name, inputSchema, outputSchema] of [
    [
      'put',
      'draft',
      'save',
      saveAssetWorkflowSchema,
      assetWorkflowDetailSchema,
    ],
    [
      'post',
      'validate',
      'validate',
      revisionRequestSchema,
      validationResultSchema,
    ],
    [
      'post',
      'simulations',
      'simulate',
      simulateAssetWorkflowSchema,
      simulationResultSchema,
    ],
    [
      'post',
      'publish',
      'publish',
      publishAssetWorkflowSchema,
      assetWorkflowDetailSchema,
    ],
    [
      'post',
      'activate',
      'activate',
      activateAssetWorkflowSchema,
      assetWorkflowDetailSchema,
    ],
  ])
    app[method](`${root}/:id/${path}`, options, async (request) =>
      respond(
        outputSchema,
        request,
        await service[name]({
          actor: request.actor,
          ...parse(params, request.params),
          input: parse(inputSchema, request.body),
        }),
      ),
    )
  app.get(
    `${root}/:id/versions/:versionId/reference`,
    options,
    async (request) =>
      respond(
        referenceSchema,
        request,
        await service.reference({
          actor: request.actor,
          ...parse(referenceParams, request.params),
        }),
      ),
  )
}
