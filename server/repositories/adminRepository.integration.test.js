// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createIsolatedStudio } from '../testing/isolatedStudio.js'
import { createAdminRepository } from './adminRepository.js'

let runtime
let repository

beforeAll(async () => {
  runtime = await createIsolatedStudio()
  repository = createAdminRepository(runtime.pool)
  await runtime.pool.query(`
    INSERT INTO users (id,email,role,display_name,first_name,last_name,password_configured,google_connected,updated_at)
    VALUES
      ('admin-disabled','disabled@runtime.test','admin','Disabled Admin','Disabled','Admin',true,false,'2026-09-10T09:00:00Z'),
      ('creator-1','creator@runtime.test','marketer','Campaign Creator','Campaign','Creator',true,false,'2026-09-10T08:00:00Z');
    UPDATE users SET disabled=true WHERE id='admin-disabled';
    INSERT INTO campaigns (id,title,brief,status,revision,created_by,project_type,created_at,updated_at)
    VALUES
      ('project-empty','Empty project','{}','draft',0,'creator-1','presentations','2026-09-08T08:00:00Z','2026-09-08T08:00:00Z'),
      ('project-main','Main project','{}','draft',0,'creator-1','website-page','2026-09-09T08:00:00Z','2026-09-10T08:00:00Z');
    INSERT INTO campaign_versions (id,campaign_id,version_number,snapshot,content_hash,created_by,created_at)
    VALUES ('version-main','project-main',1,'{}',repeat('2',64),'creator-1','2026-09-09T09:00:00Z');
    INSERT INTO generation_jobs
      (id,campaign_id,step,provider,model,region,status,attempts,reserved_cost_microunits,idempotency_key,timeout_at,actor_id,created_at,updated_at)
    VALUES
      ('job-video','project-main','video','mock','mock-v1','europe-west6','pending',1,100,'video-key','2026-09-10T12:00:00Z','creator-1','2026-09-10T08:10:00Z','2026-09-10T08:20:00Z'),
      ('job-done','project-main','copy','mock','mock-v1','europe-west6','succeeded',1,50,'copy-key','2026-09-10T12:00:00Z','creator-1','2026-09-10T07:00:00Z','2026-09-10T07:00:02Z');
    UPDATE generation_jobs SET completed_at='2026-09-10T07:00:02Z' WHERE id='job-done';
    INSERT INTO visual_directions (id,campaign_id,title,prompt,status,stale,created_at)
    VALUES ('direction-video','project-main','Motion','Move','pending',false,'2026-09-10T08:00:00Z');
    INSERT INTO video_jobs (job_id,direction_id,phase,accepted_cost_microunits,source_hash)
    VALUES ('job-video','direction-video','queued',100,repeat('a',64));
    INSERT INTO assets (id,campaign_id,kind,object_key,mime_type,byte_size,sha256,source,created_at)
    VALUES
      ('shared-id','project-main','manifest','campaign/shared.json','application/json',10,repeat('b',64),'upload','2026-09-10T08:30:00Z'),
      ('asset-older','project-main','manifest','campaign/older.json','application/json',11,repeat('c',64),'upload','2026-09-10T07:30:00Z');
    UPDATE assets SET version_id='version-main' WHERE id='shared-id';
    ALTER TABLE deliveries DISABLE TRIGGER USER;
    INSERT INTO deliveries (id,campaign_id,version_id,asset_id,created_by,created_at,content_hash,zip_sha256,byte_size)
    VALUES ('delivery-main','project-main','version-main','shared-id','creator-1','2026-09-10T09:10:00Z',repeat('3',64),repeat('4',64),10);
    ALTER TABLE deliveries ENABLE TRIGGER USER;
    INSERT INTO audit_events (id,actor_id,actor_role,action,entity_type,entity_id,version_id,created_at)
    VALUES
      ('audit-direct','creator-1','marketer','project_viewed','campaign','project-main',NULL,'2026-09-10T09:00:00Z'),
      ('audit-version','creator-1','marketer','version_viewed','campaign_version','version-main','version-main','2026-09-10T09:01:00Z'),
      ('audit-cross','creator-1','marketer','project_viewed','campaign','project-empty',NULL,'2026-09-10T09:02:00Z');
    INSERT INTO brand_design_systems (id,workspace_id,owner_id,draft,created_at,updated_at)
    VALUES ('brand-1','default','creator-1','{}','2026-09-09T08:00:00Z','2026-09-10T08:00:00Z');
    INSERT INTO brand_design_system_sources
      (id,brand_id,kind,label,mime_type,byte_size,object_key,status,created_at,updated_at)
    VALUES ('shared-id','brand-1','file','Source file','image/png',12,'brand/source.png','ready','2026-09-10T08:40:00Z','2026-09-10T08:45:00Z');
    INSERT INTO brand_design_system_assets
      (id,brand_id,source_id,name,kind,mime_type,object_key,byte_size,checksum,created_at)
    VALUES ('shared-id','brand-1','shared-id','Primary logo','logo','image/svg+xml','brand/logo.svg',13,repeat('d',64),'2026-09-10T08:50:00Z');
    INSERT INTO brand_design_system_ai_jobs
      (id,brand_id,operation,input_revision,input_hash,policy_version,provider,model,status,created_by,created_at,updated_at)
    VALUES ('brand-job','brand-1','analyse_materials',0,repeat('e',64),'v1','mock','mock-v1','running','creator-1','2026-09-10T08:00:00Z','2026-09-10T08:05:00Z');
    INSERT INTO asset_workflow_versions
      (id,workflow_id,version,definition,hash,draft_revision,change_note,idempotency_key,request_hash)
    SELECT '11111111-1111-4111-8111-111111111111',id,1,draft,draft_hash,draft_revision,'Published fixture','admin-test',repeat('f',64)
    FROM asset_workflows WHERE key='banners';
  `)
}, 30000)

afterAll(async () => runtime?.close(), 30000)

describe('admin repository', () => {
  test('returns safe users with exact filtering and bounded pagination', async () => {
    const page = await repository.users({
      search: 'disabled',
      disabled: true,
      page: 1,
      pageSize: 1,
    })
    expect(page).toEqual({
      items: [
        {
          id: 'admin-disabled',
          email: 'disabled@runtime.test',
          displayName: 'Disabled Admin',
          firstName: 'Disabled',
          lastName: 'Admin',
          role: 'admin',
          disabled: true,
          passwordConfigured: true,
          googleConnected: false,
          createdAt: expect.any(String),
          updatedAt: '2026-09-10T09:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
    })
    expect(JSON.stringify(page)).not.toMatch(
      /firebase|passwordHash|password_hash/i,
    )
  })

  test('keeps native project types and independent zero-safe counts', async () => {
    const page = await repository.projects({ page: 1, pageSize: 25 })
    expect(page.items.map((project) => project.projectType)).toEqual([
      'website-page',
      'presentations',
    ])
    expect(page.items[0].counts).toMatchObject({ assets: 2, jobs: 2 })
    expect(page.items[1].counts).toEqual({
      assets: 0,
      jobs: 0,
      versions: 0,
      reviewEvents: 0,
      deliveries: 0,
    })
  })

  test('namespaces all asset and job sources without doubling video extensions', async () => {
    const assets = await repository.assets({ page: 1, pageSize: 25 })
    expect(assets.items.map(({ id }) => id)).toEqual([
      'brand-asset:shared-id',
      'brand-source:shared-id',
      'campaign:shared-id',
      'campaign:asset-older',
    ])
    expect(JSON.stringify(assets)).not.toMatch(
      /objectKey|checksum|sha256|metadata|sourceUrl|evidence|errorMessage/,
    )
    expect(
      (
        await repository.assets({
          sourceType: 'campaign',
          brandId: 'brand-1',
          page: 1,
          pageSize: 25,
        })
      ).total,
    ).toBe(0)

    const jobs = await repository.jobs({ page: 1, pageSize: 25 })
    expect(jobs.total).toBe(3)
    expect(
      jobs.items.find(({ id }) => id === 'campaign-generation:job-video'),
    ).toMatchObject({ videoPhase: 'queued' })
    expect(
      jobs.items.filter(({ id }) => id.includes('job-video')),
    ).toHaveLength(1)
    expect(JSON.stringify(jobs)).not.toMatch(
      /idempotency|fingerprint|ownerToken|inputSnapshot|resultMetadata|responseBody|usage|safety/,
    )
  })

  test('orders source-specific union branches by their normalized aliases', async () => {
    expect(
      (
        await repository.assets({
          sourceType: 'brand-asset',
          page: 1,
          pageSize: 25,
        })
      ).items[0].id,
    ).toBe('brand-asset:shared-id')
    expect(
      (await repository.jobs({ jobType: 'brand-ai', page: 1, pageSize: 25 }))
        .items[0].id,
    ).toBe('brand-ai:brand-job')
    expect(
      await repository.activity({ type: 'review', page: 1, pageSize: 25 }),
    ).toEqual({ items: [], page: 1, pageSize: 25, total: 0 })
  })

  test('matches complete audit and delivery activity without crossing projects', async () => {
    expect(
      (
        await repository.activity({
          type: 'audit',
          search: 'Main project',
          page: 1,
          pageSize: 25,
        })
      ).items
        .map(({ id }) => id)
        .sort(),
    ).toEqual(['audit:audit-direct', 'audit:audit-version'])
    expect(
      (
        await repository.activity({
          type: 'audit',
          search: 'project-main',
          page: 1,
          pageSize: 25,
        })
      ).items
        .map(({ id }) => id)
        .sort(),
    ).toEqual(['audit:audit-direct', 'audit:audit-version'])
    expect(
      (
        await repository.activity({
          type: 'delivery',
          search: 'delivered',
          page: 1,
          pageSize: 25,
        })
      ).items.map(({ id }) => id),
    ).toEqual(['delivery:delivery-main'])
    expect(
      (
        await repository.activity({
          status: 'delivered',
          page: 1,
          pageSize: 25,
        })
      ).items.map(({ id }) => id),
    ).toEqual(['delivery:delivery-main'])
    expect(
      (
        await repository.projectActivity('project-main', {
          type: 'audit',
          page: 1,
          pageSize: 25,
        })
      ).items
        .map(({ id }) => id)
        .sort(),
    ).toEqual(['audit:audit-direct', 'audit:audit-version'])
    expect(
      (
        await repository.projectActivity('project-empty', {
          type: 'audit',
          page: 1,
          pageSize: 25,
        })
      ).items.map(({ id }) => id),
    ).toEqual(['audit:audit-cross'])
  })

  test('reports truthful overview counts and measurable/unavailable performance', async () => {
    const overview = await repository.overview({
      now: new Date('2026-09-10T10:00:00Z'),
    })
    expect(overview.counts).toMatchObject({
      projects: 2,
      activeProjects: 2,
      assets: 4,
      jobs: 3,
      assetWorkflows: 4,
      publishedAssetWorkflows: 1,
    })
    expect(overview.jobStatusCounts).toMatchObject({
      pending: 1,
      running: 1,
      succeeded: 1,
    })
    expect(overview.performance.completedJobDurationMs).toEqual({
      average: 2000,
      sampleCount: 1,
      unavailableReason: null,
    })
    expect(overview.performance.providerLatencyMs.average).toBeNull()
    expect(overview.performance.humanTaskDurationMs.average).toBeNull()
  })
})
