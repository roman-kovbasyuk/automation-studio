// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { beforeAll, afterAll, it, expect } from 'vitest'
import { runMigrations } from '../db/migrate.js'
import {
  createAssetWorkflowService,
  seedAssetWorkflows,
} from './definitionService.js'
import { seedDefinitions } from './simulation.js'
import Fastify from 'fastify'
import { registerAssetWorkflowRoutes } from '../routes/assetWorkflows.js'
import {
  assertIsolatedSchema,
  isolatedDatabaseUrl,
} from '../testing/postgresIsolation.js'

const schema = `recipe_test_${randomUUID().replaceAll('-', '')}`
const connectionString =
  process.env.TEST_DATABASE_URL ?? 'postgresql:///banner_studio_test'
let adminPool, pool, service
const actor = { id: 'recipe-test-admin', role: 'admin', disabled: false }
beforeAll(async () => {
  adminPool = new Pool({ connectionString })
  await adminPool.query(`CREATE SCHEMA ${schema}`)
  pool = new Pool({
    connectionString: isolatedDatabaseUrl(connectionString, schema),
  })
  await assertIsolatedSchema(pool, schema)
  await runMigrations({ pool })
  service = createAssetWorkflowService({ pool })
}, 30000)
afterAll(async () => {
  await pool?.end()
  if (adminPool) {
    await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await adminPool.end()
  }
}, 30000)
const create = () =>
  service.create({
    actor,
    input: { ...seedDefinitions()[0], key: `recipe-${randomUUID()}` },
  })
it('denies non-admin and either disabled representation in the service', async () => {
  for (const bad of [
    { ...actor, role: 'designer' },
    { ...actor, disabled: true },
    { ...actor, disabledAt: '2026-01-01' },
    null,
  ])
    await expect(service.list({ actor: bad })).rejects.toMatchObject({
      statusCode: 403,
    })
})
it('saves safe invalid drafts but fences stale saves, validation and exact-hash simulations', async () => {
  const a = await create(),
    invalid = structuredClone(a.draft)
  invalid.edges = []
  const b = await service.save({
    actor,
    id: a.id,
    input: { expectedRevision: 0, draft: invalid },
  })
  expect(b.draftRevision).toBe(1)
  await expect(
    service.save({
      actor,
      id: a.id,
      input: { expectedRevision: 0, draft: a.draft },
    }),
  ).rejects.toMatchObject({ statusCode: 409 })
  await expect(
    service.validate({ actor, id: a.id, input: { expectedRevision: 0 } }),
  ).rejects.toMatchObject({ statusCode: 409 })
  expect(
    (
      await service.validate({
        actor,
        id: a.id,
        input: { expectedRevision: 1 },
      })
    ).valid,
  ).toBe(false)
  await expect(
    service.publish({
      actor,
      id: a.id,
      input: {
        expectedRevision: 1,
        changeNote: 'Invalid',
        idempotencyKey: 'invalid',
      },
    }),
  ).rejects.toMatchObject({ statusCode: 422 })
  await expect(
    service.simulate({
      actor,
      id: a.id,
      input: {
        expectedRevision: 1,
        draftHash: a.draftHash,
        fixture: { input: {} },
      },
    }),
  ).rejects.toMatchObject({ statusCode: 409 })
})
it('serializes concurrent publication retries and protects exact immutable version references', async () => {
  const a = await create(),
    input = {
      expectedRevision: 0,
      changeNote: 'Initial',
      idempotencyKey: 'publish-one',
    }
  const [b, c] = await Promise.all([
    service.publish({ actor, id: a.id, input }),
    service.publish({ actor, id: a.id, input }),
  ])
  expect(b.versions).toHaveLength(1)
  expect(c.versions[0].id).toBe(b.versions[0].id)
  await expect(
    service.publish({
      actor,
      id: a.id,
      input: { ...input, changeNote: 'Changed' },
    }),
  ).rejects.toMatchObject({ statusCode: 409 })
  const changed = structuredClone(a.draft)
  changed.nodes[3].instructions = 'A new instruction'
  await service.save({
    actor,
    id: a.id,
    input: { expectedRevision: 0, draft: changed },
  })
  const reference = await service.reference({
    actor,
    id: a.id,
    versionId: b.versions[0].id,
  })
  expect(reference.definition.nodes[3].instructions).toBe(
    a.draft.nodes[3].instructions,
  )
  await expect(
    pool.query(
      'UPDATE asset_workflow_versions SET change_note=$1 WHERE id=$2',
      ['tamper', b.versions[0].id],
    ),
  ).rejects.toMatchObject({ code: '55000' })
  await expect(
    pool.query('DELETE FROM asset_workflow_versions WHERE id=$1', [
      b.versions[0].id,
    ]),
  ).rejects.toMatchObject({ code: '55000' })
  const other = await create()
  await expect(
    service.activate({
      actor,
      id: other.id,
      input: { versionId: b.versions[0].id },
    }),
  ).rejects.toMatchObject({ statusCode: 404 })
  await expect(
    pool.query('UPDATE asset_workflows SET active_version_id=$1 WHERE id=$2', [
      b.versions[0].id,
      other.id,
    ]),
  ).rejects.toMatchObject({ code: '23503' })
  const active = await service.activate({
    actor,
    id: a.id,
    input: { versionId: b.versions[0].id },
  })
  expect(active.activeVersionId).toBe(b.versions[0].id)
  expect(active.draft.nodes[3].instructions).toBe('A new instruction')
})
it('only one concurrent save succeeds and new publication versions remain unique', async () => {
  const a = await create()
  const saves = await Promise.allSettled(
    [1, 2].map((i) =>
      service.save({
        actor,
        id: a.id,
        input: {
          expectedRevision: 0,
          draft: {
            ...a.draft,
            nodes: a.draft.nodes.map((n) => ({
              ...n,
              label: `${n.label} ${i}`,
            })),
          },
        },
      }),
    ),
  )
  expect(saves.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  const publications = await Promise.all(
    [1, 2].map((i) =>
      service.publish({
        actor,
        id: a.id,
        input: {
          expectedRevision: 1,
          changeNote: `Publication ${i}`,
          idempotencyKey: `key-${i}`,
        },
      }),
    ),
  )
  expect(
    (await service.get({ actor, id: a.id })).versions.map((v) => v.version),
  ).toEqual([2, 1])
  expect(publications[1].versions[0].id).not.toBe(
    publications[0].versions[0].id,
  )
})
it('explicit seed is idempotent and never overwrites drafts; list has no hidden writes', async () => {
  await seedAssetWorkflows({ pool, actor })
  const first = await service.list({ actor })
  const seed = first.items.find((x) => x.key === 'banners')
  const edited = structuredClone(seed.draft)
  edited.nodes[0].label = 'Edited'
  await service.save({
    actor,
    id: seed.id,
    input: { expectedRevision: 0, draft: edited },
  })
  await seedAssetWorkflows({ pool, actor })
  expect((await service.get({ actor, id: seed.id })).draft.nodes[0].label).toBe(
    'Edited',
  )
  expect((await service.list({ actor })).items).toHaveLength(first.items.length)
})
it('authoring HTTP lifecycle returns saved exact-hash simulation and structured published reference', async () => {
  const app = Fastify()
  registerAssetWorkflowRoutes(app, {
    requireRole: () => async (request) => {
      request.actor = actor
    },
    assetWorkflowService: service,
  })
  try {
    const root = '/api/v1/admin/asset-workflows'
    const created = await app.inject({
      method: 'POST',
      url: root,
      payload: { ...seedDefinitions()[0], key: `http-${randomUUID()}` },
    })
    expect(created.statusCode).toBe(201)
    const a = created.json(),
      url = `${root}/${a.id}`
    const simulation = await app.inject({
      method: 'POST',
      url: `${url}/simulations`,
      payload: {
        expectedRevision: 0,
        draftHash: a.draftHash,
        fixture: {
          input: {
            brief: 'Course launch',
            channels: 'Social',
            dimensions: '1200x628',
            mandatoryCopy: 'Learn more',
          },
          outputs: {
            ai: { plan: 'Fixture plan' },
            render: { preview: 'Fixture preview' },
          },
        },
      },
    })
    expect(simulation.statusCode).toBe(200)
    expect(simulation.json().trace.at(-1).status).toBe('completed')
    expect(simulation.json().simulated).toBe(true)
    const publication = await app.inject({
      method: 'POST',
      url: `${url}/publish`,
      payload: {
        expectedRevision: 0,
        changeNote: 'First published draft',
        idempotencyKey: 'http-first',
      },
    })
    expect(publication.statusCode).toBe(200)
    const versionId = publication.json().versions[0].id
    const reference = await app.inject(`${url}/versions/${versionId}/reference`)
    expect(reference.statusCode).toBe(200)
    expect(reference.json().hash).toBe(a.draftHash)
    expect(reference.json().definition).toEqual(a.draft)
    const activation = await app.inject({
      method: 'POST',
      url: `${url}/activate`,
      payload: { versionId },
    })
    expect(activation.statusCode).toBe(200)
    expect(activation.json().activeVersionId).toBe(versionId)
  } finally {
    await app.close()
  }
})
