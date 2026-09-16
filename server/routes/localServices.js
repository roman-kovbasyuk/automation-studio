const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

function requestId(body) {
  return body && typeof body.requestId === 'string' && requestIdPattern.test(body.requestId) ? body.requestId : null
}

function sendError(reply, error) {
  return reply.code(error.statusCode || 500).send({ code: error.statusCode ? 'LOCAL_SERVICE_ERROR' : 'INTERNAL_ERROR', message: error.statusCode ? error.message : 'Local service operation failed' })
}

export function registerLocalServiceRoutes(app, { controller }) {
  app.get('/api/v1/local-services/status', async (_request, reply) => {
    try { return await controller.status() } catch (error) { return sendError(reply, error) }
  })
  app.post('/api/v1/local-services/:serviceId/restart', async (request, reply) => {
    const id = requestId(request.body)
    if (!id) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'A bounded request ID is required' })
    try { return await controller.restart(request.params.serviceId, id) } catch (error) { return sendError(reply, error) }
  })
  app.post('/api/v1/local-services/restart-all', async (request, reply) => {
    const id = requestId(request.body)
    if (!id) return reply.code(400).send({ code: 'INVALID_REQUEST', message: 'A bounded request ID is required' })
    try { return await controller.restartAll(id) } catch (error) { return sendError(reply, error) }
  })
}
