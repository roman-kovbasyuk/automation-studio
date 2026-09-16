import { z } from 'zod'
import {
  activityQuerySchema,
  activityResponseSchema,
  assetsQuerySchema,
  assetsResponseSchema,
  jobsQuerySchema,
  jobsResponseSchema,
  modulesResponseSchema,
  overviewResponseSchema,
  projectActivityQuerySchema,
  projectDetailAdminSchema,
  projectsQuerySchema,
  projectsResponseSchema,
  usersQuerySchema,
  usersResponseSchema,
} from '../../shared/adminContracts.js'
import { notFound, parse, strictResponse } from './support.js'

const emptyQuery = z.strictObject({})
const paramsSchema = z.strictObject({ id: z.string().min(1).max(200) })
const envelope = (schema) => schema.extend({ requestId: z.string() })

export function registerAdminRoutes(app, { requireRole, adminRepository }) {
  const options = { preHandler: requireRole('admin') }
  const respond = (schema, request, value) =>
    strictResponse(envelope(schema), request, value)
  const root = '/api/v1/admin'

  app.get(`${root}/overview`, options, async (request) => {
    parse(emptyQuery, request.query)
    return respond(
      overviewResponseSchema,
      request,
      await adminRepository.overview(),
    )
  })
  app.get(`${root}/users`, options, async (request) =>
    respond(
      usersResponseSchema,
      request,
      await adminRepository.users(parse(usersQuerySchema, request.query)),
    ),
  )
  app.get(`${root}/projects`, options, async (request) =>
    respond(
      projectsResponseSchema,
      request,
      await adminRepository.projects(parse(projectsQuerySchema, request.query)),
    ),
  )
  app.get(`${root}/projects/:id`, options, async (request) => {
    parse(emptyQuery, request.query)
    const { id } = parse(paramsSchema, request.params)
    const result = await adminRepository.project(id)
    if (!result) notFound('Project')
    return respond(projectDetailAdminSchema, request, result)
  })
  app.get(`${root}/projects/:id/activity`, options, async (request) => {
    const { id } = parse(paramsSchema, request.params)
    const result = await adminRepository.projectActivity(
      id,
      parse(projectActivityQuerySchema, request.query),
    )
    if (!result) notFound('Project')
    return respond(activityResponseSchema, request, result)
  })
  app.get(`${root}/assets`, options, async (request) =>
    respond(
      assetsResponseSchema,
      request,
      await adminRepository.assets(parse(assetsQuerySchema, request.query)),
    ),
  )
  app.get(`${root}/jobs`, options, async (request) =>
    respond(
      jobsResponseSchema,
      request,
      await adminRepository.jobs(parse(jobsQuerySchema, request.query)),
    ),
  )
  app.get(`${root}/activity`, options, async (request) =>
    respond(
      activityResponseSchema,
      request,
      await adminRepository.activity(parse(activityQuerySchema, request.query)),
    ),
  )
  app.get(`${root}/modules`, options, async (request) => {
    parse(emptyQuery, request.query)
    return respond(
      modulesResponseSchema,
      request,
      await adminRepository.modules(),
    )
  })
}
