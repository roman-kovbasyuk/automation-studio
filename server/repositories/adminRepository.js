const iso = (value) => (value == null ? null : new Date(value).toISOString())
const safeNumber = (value) => {
  if (value == null) return null
  const number = Number(value)
  if (!Number.isSafeInteger(number))
    throw new RangeError(
      'Admin projection exceeded the JSON safe-integer range',
    )
  return number
}
const decimal = (value) => (value == null ? null : Number(value))
const escapedLike = (value) =>
  `%${value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
const pageResult = (rows, total, query) => ({
  items: rows,
  page: query.page,
  pageSize: query.pageSize,
  total: safeNumber(total),
})
const paging = (query, params) => {
  params.push(query.pageSize, (query.page - 1) * query.pageSize)
  return `LIMIT $${params.length - 1} OFFSET $${params.length}`
}
const add = (clauses, params, sql, value) => {
  if (value !== undefined) {
    params.push(value)
    clauses.push(sql.replace('?', `$${params.length}`))
  }
}
async function consistentPair(
  pool,
  itemSql,
  itemParams,
  countSql,
  countParams,
) {
  const client = await pool.connect()
  try {
    await client.query(
      'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',
    )
    const items = await client.query(itemSql, itemParams)
    const total = await client.query(countSql, countParams)
    await client.query('COMMIT')
    return [items, total]
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

const moduleInventory = Object.freeze([
  ...['Brief', 'Copy', 'Visuals', 'Banners', 'Review', 'Distribute'].map(
    (name, index) => ({
      id: `campaign:${name.toLowerCase()}`,
      name,
      category: 'campaign-module',
      order: index + 1,
      availability: {
        ui: 'available',
        liveRuntime: 'available',
        simulation: 'not-applicable',
      },
    }),
  ),
  {
    id: 'recipe-runtime',
    name: 'Product recipe runtime',
    category: 'recipe-runtime',
    order: null,
    availability: {
      ui: 'available',
      authoring: 'available',
      validation: 'available',
      simulation: 'available',
      publication: 'available',
      liveRuntime: 'unavailable',
    },
    unavailableReason:
      'Published recipes are not connected to end-user execution in this release.',
  },
])

function userDto(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    disabled: row.is_disabled,
    passwordConfigured: row.password_configured,
    googleConnected: row.google_connected,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}
function creator(row) {
  return {
    id: row.creator_id,
    email: row.creator_email,
    displayName: row.creator_display_name,
  }
}
function counts(row) {
  return {
    assets: safeNumber(row.asset_count),
    jobs: safeNumber(row.job_count),
    versions: safeNumber(row.version_count),
    reviewEvents: safeNumber(row.review_count),
    deliveries: safeNumber(row.delivery_count),
  }
}
function projectDto(row, detail = false) {
  const dto = {
    id: row.id,
    title: row.title,
    projectType: row.project_type,
    status: row.status,
    revision: row.revision,
    creator: creator(row),
    counts: counts(row),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    archivedAt: iso(row.archived_at),
  }
  if (detail)
    dto.workflow = {
      currentVersionNumber: row.current_version_number,
      openVersionId: row.open_version_id,
      selectedCopyId: row.selected_copy_id,
      selectedDirectionId: row.selected_direction_id,
      compositionId: row.composition_id,
    }
  return dto
}
function assetDto(row) {
  return {
    id: row.public_id,
    sourceType: row.source_type,
    rawId: row.raw_id,
    name: row.name,
    projectId: row.project_id,
    brandId: row.brand_id,
    sourceId: row.source_id,
    kind: row.kind,
    source: row.source,
    status: row.status,
    mimeType: row.mime_type,
    byteSize: safeNumber(row.byte_size),
    width: safeNumber(row.width),
    height: safeNumber(row.height),
    generationJobId: row.generation_job_id,
    versionId: row.version_id,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}
function jobDto(row) {
  return {
    id: row.public_id,
    rawId: row.raw_id,
    jobType: row.job_type,
    projectId: row.project_id,
    brandId: row.brand_id,
    step: row.step,
    operation: row.operation,
    provider: row.provider,
    model: row.model,
    region: row.region,
    status: row.status,
    videoPhase: row.video_phase,
    attempts: safeNumber(row.attempts),
    errorCode: row.error_code,
    reservedCostMicrounits: safeNumber(row.reserved_cost_microunits),
    actualCostMicrounits: safeNumber(row.actual_cost_microunits),
    estimatedUsd: decimal(row.estimated_usd),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    completedAt: iso(row.completed_at),
    timeoutAt: iso(row.timeout_at),
  }
}
function activityDto(row) {
  return {
    id: row.public_id,
    rawId: row.raw_id,
    type: row.type,
    projectId: row.project_id,
    occurredAt: iso(row.occurred_at),
    action: row.action,
    status: row.status,
    actor: row.actor_id
      ? {
          id: row.actor_id,
          displayName: row.actor_display_name,
          role: row.actor_role,
        }
      : null,
    references: {
      versionId: row.version_id,
      assetId: row.asset_id,
      jobId: row.job_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
    },
  }
}

const projectCounts = `
  WITH asset_counts AS (SELECT campaign_id,count(*)::bigint count FROM assets GROUP BY campaign_id),
  job_counts AS (SELECT campaign_id,count(*)::bigint count FROM generation_jobs GROUP BY campaign_id),
  version_counts AS (SELECT campaign_id,count(*)::bigint count FROM campaign_versions GROUP BY campaign_id),
  review_counts AS (SELECT campaign_id,count(*)::bigint count FROM review_events GROUP BY campaign_id),
  delivery_counts AS (SELECT campaign_id,count(*)::bigint count FROM deliveries GROUP BY campaign_id)
`
const projectSelect = `SELECT c.id,c.title,c.project_type,c.status,c.revision,c.selected_copy_id,c.selected_direction_id,
  c.composition_id,c.current_version_number,c.open_version_id,c.created_at,c.updated_at,c.archived_at,
  u.id creator_id,u.email creator_email,u.display_name creator_display_name,
  COALESCE(ac.count,0) asset_count,COALESCE(jc.count,0) job_count,COALESCE(vc.count,0) version_count,
  COALESCE(rc.count,0) review_count,COALESCE(dc.count,0) delivery_count
  FROM campaigns c JOIN users u ON u.id=c.created_by
  LEFT JOIN asset_counts ac ON ac.campaign_id=c.id LEFT JOIN job_counts jc ON jc.campaign_id=c.id
  LEFT JOIN version_counts vc ON vc.campaign_id=c.id LEFT JOIN review_counts rc ON rc.campaign_id=c.id
  LEFT JOIN delivery_counts dc ON dc.campaign_id=c.id`

function activityUnion(filters = {}) {
  const params = [],
    branches = []
  const project = filters.projectId
  const actor = filters.actorId
  const status = filters.status
  const search = filters.search ? escapedLike(filters.search) : undefined
  const include = (type) => !filters.type || filters.type === type
  if (include('generation')) {
    const where = ['TRUE']
    add(where, params, 'g.campaign_id=?', project)
    add(where, params, 'g.actor_id=?', actor)
    add(where, params, 'g.status=?', status)
    if (search) {
      params.push(search)
      where.push(
        `(concat('generation:',g.id) ILIKE $${params.length} ESCAPE '\\' OR g.id ILIKE $${params.length} ESCAPE '\\' OR c.id ILIKE $${params.length} ESCAPE '\\' OR c.title ILIKE $${params.length} ESCAPE '\\' OR g.status ILIKE $${params.length} ESCAPE '\\' OR u.display_name ILIKE $${params.length} ESCAPE '\\')`,
      )
    }
    branches.push(`SELECT concat('generation:',g.id) public_id,g.id raw_id,'generation' type,g.campaign_id project_id,g.updated_at occurred_at,NULL::text action,g.status,
      u.id actor_id,u.display_name actor_display_name,u.role actor_role,NULL::text version_id,NULL::text asset_id,g.id job_id,NULL::text entity_type,NULL::text entity_id
      FROM generation_jobs g JOIN campaigns c ON c.id=g.campaign_id LEFT JOIN users u ON u.id=g.actor_id WHERE ${where.join(' AND ')}`)
  }
  if (include('review') && status === undefined) {
    const where = ['TRUE']
    add(where, params, 'r.campaign_id=?', project)
    add(where, params, 'r.actor_id=?', actor)
    if (search) {
      params.push(search)
      where.push(
        `(concat('review:',r.id) ILIKE $${params.length} ESCAPE '\\' OR r.id ILIKE $${params.length} ESCAPE '\\' OR c.id ILIKE $${params.length} ESCAPE '\\' OR c.title ILIKE $${params.length} ESCAPE '\\' OR r.event_type ILIKE $${params.length} ESCAPE '\\' OR u.display_name ILIKE $${params.length} ESCAPE '\\')`,
      )
    }
    branches.push(`SELECT concat('review:',r.id) public_id,r.id raw_id,'review' type,r.campaign_id project_id,r.created_at occurred_at,r.event_type action,NULL::text status,u.id actor_id,u.display_name actor_display_name,u.role actor_role,r.version_id,NULL::text asset_id,NULL::text job_id,NULL::text entity_type,NULL::text entity_id
      FROM review_events r JOIN campaigns c ON c.id=r.campaign_id LEFT JOIN users u ON u.id=r.actor_id WHERE ${where.join(' AND ')}`)
  }
  if (include('delivery') && (status === undefined || status === 'delivered')) {
    const where = ['TRUE']
    add(where, params, 'd.campaign_id=?', project)
    add(where, params, 'd.created_by=?', actor)
    if (search) {
      params.push(search)
      where.push(
        `(concat('delivery:',d.id) ILIKE $${params.length} ESCAPE '\\' OR d.id ILIKE $${params.length} ESCAPE '\\' OR c.id ILIKE $${params.length} ESCAPE '\\' OR c.title ILIKE $${params.length} ESCAPE '\\' OR 'delivered' ILIKE $${params.length} ESCAPE '\\' OR u.display_name ILIKE $${params.length} ESCAPE '\\')`,
      )
    }
    branches.push(`SELECT concat('delivery:',d.id) public_id,d.id raw_id,'delivery' type,d.campaign_id project_id,d.created_at occurred_at,NULL::text action,'delivered' status,u.id actor_id,u.display_name actor_display_name,u.role actor_role,d.version_id,d.asset_id,NULL::text job_id,NULL::text entity_type,NULL::text entity_id
      FROM deliveries d JOIN campaigns c ON c.id=d.campaign_id LEFT JOIN users u ON u.id=d.created_by WHERE ${where.join(' AND ')}`)
  }
  if (include('audit') && status === undefined) {
    const where = ['TRUE']
    add(where, params, 'a.actor_id=?', actor)
    if (project) {
      params.push(project)
      where.push(
        `((a.entity_type='campaign' AND a.entity_id=$${params.length}) OR EXISTS (SELECT 1 FROM campaign_versions av WHERE av.id=a.version_id AND av.campaign_id=$${params.length}))`,
      )
    }
    if (search) {
      params.push(search)
      where.push(
        `(concat('audit:',a.id) ILIKE $${params.length} ESCAPE '\\' OR a.id ILIKE $${params.length} ESCAPE '\\' OR a.action ILIKE $${params.length} ESCAPE '\\' OR a.entity_type ILIKE $${params.length} ESCAPE '\\' OR a.entity_id ILIKE $${params.length} ESCAPE '\\' OR c.id ILIKE $${params.length} ESCAPE '\\' OR c.title ILIKE $${params.length} ESCAPE '\\' OR u.display_name ILIKE $${params.length} ESCAPE '\\')`,
      )
    }
    branches.push(`SELECT concat('audit:',a.id) public_id,a.id raw_id,'audit' type,CASE WHEN a.entity_type='campaign' THEN a.entity_id ELSE av.campaign_id END project_id,a.created_at occurred_at,a.action,NULL::text status,u.id actor_id,u.display_name actor_display_name,u.role actor_role,a.version_id,NULL::text asset_id,NULL::text job_id,a.entity_type,a.entity_id
      FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id LEFT JOIN campaign_versions av ON av.id=a.version_id
      LEFT JOIN campaigns c ON c.id=CASE WHEN a.entity_type='campaign' THEN a.entity_id ELSE av.campaign_id END
      WHERE ${where.join(' AND ')}`)
  }
  const empty = `SELECT NULL::text public_id,NULL::text raw_id,NULL::text type,NULL::text project_id,now() occurred_at,NULL::text action,NULL::text status,NULL::text actor_id,NULL::text actor_display_name,NULL::text actor_role,NULL::text version_id,NULL::text asset_id,NULL::text job_id,NULL::text entity_type,NULL::text entity_id WHERE false`
  return {
    sql: branches.length ? branches.join(' UNION ALL ') : empty,
    params,
  }
}

export function createAdminRepository(pool) {
  const repository = {
    async users(query) {
      const clauses = [],
        params = []
      add(clauses, params, 'u.role=?', query.role)
      if (query.disabled !== undefined) {
        params.push(query.disabled)
        clauses.push(
          `(u.disabled OR u.disabled_at IS NOT NULL)=$${params.length}`,
        )
      }
      if (query.search) {
        params.push(escapedLike(query.search))
        clauses.push(
          `(u.id ILIKE $${params.length} ESCAPE '\\' OR u.email ILIKE $${params.length} ESCAPE '\\' OR u.display_name ILIKE $${params.length} ESCAPE '\\' OR u.first_name ILIKE $${params.length} ESCAPE '\\' OR u.last_name ILIKE $${params.length} ESCAPE '\\')`,
        )
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      const countParams = [...params]
      const limit = paging(query, params)
      const [items, total] = await consistentPair(
        pool,
        `SELECT u.id,u.email,u.display_name,u.first_name,u.last_name,u.role,(u.disabled OR u.disabled_at IS NOT NULL) is_disabled,u.password_configured,u.google_connected,u.created_at,u.updated_at FROM users u ${where} ORDER BY u.updated_at DESC,u.id DESC ${limit}`,
        params,
        `SELECT count(*)::bigint total FROM users u ${where}`,
        countParams,
      )
      return pageResult(items.rows.map(userDto), total.rows[0].total, query)
    },
    async projects(query) {
      const clauses = [],
        params = []
      add(clauses, params, 'c.status=?', query.status)
      add(clauses, params, 'c.project_type=?', query.projectType)
      add(clauses, params, 'c.created_by=?', query.creatorId)
      if (query.archived !== undefined)
        clauses.push(
          query.archived
            ? 'c.archived_at IS NOT NULL'
            : 'c.archived_at IS NULL',
        )
      if (query.search) {
        params.push(escapedLike(query.search))
        clauses.push(
          `(c.id ILIKE $${params.length} ESCAPE '\\' OR c.title ILIKE $${params.length} ESCAPE '\\' OR u.email ILIKE $${params.length} ESCAPE '\\' OR u.display_name ILIKE $${params.length} ESCAPE '\\')`,
        )
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      const countParams = [...params],
        limit = paging(query, params)
      const [items, total] = await consistentPair(
        pool,
        `${projectCounts} ${projectSelect} ${where} ORDER BY c.updated_at DESC,c.id DESC ${limit}`,
        params,
        `SELECT count(*)::bigint total FROM campaigns c JOIN users u ON u.id=c.created_by ${where}`,
        countParams,
      )
      return pageResult(
        items.rows.map((row) => projectDto(row)),
        total.rows[0].total,
        query,
      )
    },
    async project(id) {
      const result = await pool.query(
        `${projectCounts} ${projectSelect} WHERE c.id=$1`,
        [id],
      )
      return result.rows[0]
        ? { project: projectDto(result.rows[0], true) }
        : null
    },
    async assets(query) {
      if (
        (query.sourceType === 'campaign' && query.brandId) ||
        (query.sourceType !== undefined &&
          query.sourceType !== 'campaign' &&
          query.projectId) ||
        (query.sourceType !== undefined &&
          query.sourceType !== 'campaign' &&
          query.source)
      )
        return pageResult([], 0, query)
      const params = [],
        branches = [],
        sourceTypes = query.sourceType
          ? [query.sourceType]
          : ['campaign', 'brand-source', 'brand-asset']
      const search = query.search ? escapedLike(query.search) : undefined
      if (sourceTypes.includes('campaign') && !query.brandId) {
        const w = ['TRUE']
        add(w, params, 'a.kind=?', query.kind)
        add(w, params, 'a.campaign_id=?', query.projectId)
        add(w, params, 'a.source=?', query.source)
        if (search) {
          params.push(search)
          w.push(
            `(concat('campaign:',a.id) ILIKE $${params.length} ESCAPE '\\' OR a.id ILIKE $${params.length} ESCAPE '\\' OR c.id ILIKE $${params.length} ESCAPE '\\' OR c.title ILIKE $${params.length} ESCAPE '\\')`,
          )
        }
        branches.push(
          `SELECT concat('campaign:',a.id) public_id,'campaign' source_type,a.id raw_id,a.kind name,a.campaign_id project_id,NULL::text brand_id,NULL::text source_id,a.kind,a.source,NULL::text status,a.mime_type,a.byte_size,a.width,a.height,a.generation_job_id,a.version_id,a.created_at,NULL::timestamptz updated_at FROM assets a JOIN campaigns c ON c.id=a.campaign_id WHERE ${w.join(' AND ')}`,
        )
      }
      if (
        sourceTypes.includes('brand-source') &&
        !query.projectId &&
        !query.source
      ) {
        const w = ['s.object_key IS NOT NULL']
        add(w, params, 's.kind=?', query.kind)
        add(w, params, 's.brand_id=?', query.brandId)
        if (search) {
          params.push(search)
          w.push(
            `(concat('brand-source:',s.id) ILIKE $${params.length} ESCAPE '\\' OR s.id ILIKE $${params.length} ESCAPE '\\' OR s.brand_id ILIKE $${params.length} ESCAPE '\\' OR s.label ILIKE $${params.length} ESCAPE '\\')`,
          )
        }
        branches.push(
          `SELECT concat('brand-source:',s.id) public_id,'brand-source' source_type,s.id raw_id,s.label name,NULL::text project_id,s.brand_id,NULL::text source_id,s.kind,NULL::text source,s.status,s.mime_type,s.byte_size,NULL::integer width,NULL::integer height,NULL::text generation_job_id,NULL::text version_id,s.created_at,s.updated_at FROM brand_design_system_sources s WHERE ${w.join(' AND ')}`,
        )
      }
      if (
        sourceTypes.includes('brand-asset') &&
        !query.projectId &&
        !query.source
      ) {
        const w = ['TRUE']
        add(w, params, 'b.kind=?', query.kind)
        add(w, params, 'b.brand_id=?', query.brandId)
        if (search) {
          params.push(search)
          w.push(
            `(concat('brand-asset:',b.id) ILIKE $${params.length} ESCAPE '\\' OR b.id ILIKE $${params.length} ESCAPE '\\' OR b.brand_id ILIKE $${params.length} ESCAPE '\\' OR b.name ILIKE $${params.length} ESCAPE '\\')`,
          )
        }
        branches.push(
          `SELECT concat('brand-asset:',b.id) public_id,'brand-asset' source_type,b.id raw_id,b.name,NULL::text project_id,b.brand_id,b.source_id,b.kind,NULL::text source,NULL::text status,b.mime_type,b.byte_size,NULL::integer width,NULL::integer height,NULL::text generation_job_id,NULL::text version_id,b.created_at,NULL::timestamptz updated_at FROM brand_design_system_assets b WHERE ${w.join(' AND ')}`,
        )
      }
      const union = branches.length
        ? branches.join(' UNION ALL ')
        : 'SELECT NULL::text public_id,NULL::text source_type,NULL::text raw_id,NULL::text name,NULL::text project_id,NULL::text brand_id,NULL::text source_id,NULL::text kind,NULL::text source,NULL::text status,NULL::text mime_type,0::bigint byte_size,NULL::integer width,NULL::integer height,NULL::text generation_job_id,NULL::text version_id,now() created_at,NULL::timestamptz updated_at WHERE false'
      const countParams = [...params],
        limit = paging(query, params)
      const [items, total] = await consistentPair(
        pool,
        `WITH inventory AS (${union}) SELECT public_id,source_type,raw_id,name,project_id,brand_id,source_id,kind,source,status,mime_type,byte_size,width,height,generation_job_id,version_id,created_at,updated_at FROM inventory ORDER BY created_at DESC,public_id DESC ${limit}`,
        params,
        `WITH inventory AS (${union}) SELECT count(*)::bigint total FROM inventory`,
        countParams,
      )
      return pageResult(items.rows.map(assetDto), total.rows[0].total, query)
    },
    async jobs(query) {
      if (
        (query.jobType === 'campaign-generation' && query.brandId) ||
        (query.jobType === 'brand-ai' && (query.projectId || query.step))
      )
        return pageResult([], 0, query)
      const params = [],
        branches = [],
        types = query.jobType
          ? [query.jobType]
          : ['campaign-generation', 'brand-ai'],
        search = query.search ? escapedLike(query.search) : undefined
      if (types.includes('campaign-generation') && !query.brandId) {
        const w = ['TRUE']
        add(w, params, 'g.status=?', query.status)
        add(w, params, 'g.campaign_id=?', query.projectId)
        add(w, params, 'g.provider=?', query.provider)
        add(w, params, 'g.step=?', query.step)
        if (search) {
          params.push(search)
          w.push(
            `(concat('campaign-generation:',g.id) ILIKE $${params.length} ESCAPE '\\' OR g.id ILIKE $${params.length} ESCAPE '\\' OR c.id ILIKE $${params.length} ESCAPE '\\' OR c.title ILIKE $${params.length} ESCAPE '\\' OR g.provider ILIKE $${params.length} ESCAPE '\\' OR g.model ILIKE $${params.length} ESCAPE '\\' OR g.step ILIKE $${params.length} ESCAPE '\\' OR g.error_code ILIKE $${params.length} ESCAPE '\\')`,
          )
        }
        branches.push(
          `SELECT concat('campaign-generation:',g.id) public_id,g.id raw_id,'campaign-generation' job_type,g.campaign_id project_id,NULL::text brand_id,g.step,NULL::text operation,g.provider,g.model,g.region,g.status,v.phase video_phase,g.attempts,g.error_code,g.reserved_cost_microunits,g.actual_cost_microunits,NULL::numeric estimated_usd,g.created_at,g.updated_at,g.completed_at,g.timeout_at FROM generation_jobs g JOIN campaigns c ON c.id=g.campaign_id LEFT JOIN video_jobs v ON v.job_id=g.id WHERE ${w.join(' AND ')}`,
        )
      }
      if (types.includes('brand-ai') && !query.projectId && !query.step) {
        const w = ['TRUE']
        add(w, params, 'b.status=?', query.status)
        add(w, params, 'b.brand_id=?', query.brandId)
        add(w, params, 'b.provider=?', query.provider)
        if (search) {
          params.push(search)
          w.push(
            `(concat('brand-ai:',b.id) ILIKE $${params.length} ESCAPE '\\' OR b.id ILIKE $${params.length} ESCAPE '\\' OR b.brand_id ILIKE $${params.length} ESCAPE '\\' OR b.provider ILIKE $${params.length} ESCAPE '\\' OR b.model ILIKE $${params.length} ESCAPE '\\' OR b.operation ILIKE $${params.length} ESCAPE '\\' OR b.error_code ILIKE $${params.length} ESCAPE '\\')`,
          )
        }
        branches.push(
          `SELECT concat('brand-ai:',b.id) public_id,b.id raw_id,'brand-ai' job_type,NULL::text project_id,b.brand_id,NULL::text step,b.operation,b.provider,b.model,NULL::text region,b.status,NULL::text video_phase,0 attempts,b.error_code,NULL::bigint reserved_cost_microunits,NULL::bigint actual_cost_microunits,b.estimated_usd,b.created_at,b.updated_at,CASE WHEN b.status IN ('succeeded','failed','cancelled') THEN b.updated_at ELSE NULL END completed_at,NULL::timestamptz timeout_at FROM brand_design_system_ai_jobs b WHERE ${w.join(' AND ')}`,
        )
      }
      const union = branches.join(' UNION ALL ')
      if (!union) return pageResult([], 0, query)
      const countParams = [...params],
        limit = paging(query, params)
      const [items, total] = await consistentPair(
        pool,
        `WITH inventory AS (${union}) SELECT public_id,raw_id,job_type,project_id,brand_id,step,operation,provider,model,region,status,video_phase,attempts,error_code,reserved_cost_microunits,actual_cost_microunits,estimated_usd,created_at,updated_at,completed_at,timeout_at FROM inventory ORDER BY updated_at DESC,public_id DESC ${limit}`,
        params,
        `WITH inventory AS (${union}) SELECT count(*)::bigint total FROM inventory`,
        countParams,
      )
      return pageResult(items.rows.map(jobDto), total.rows[0].total, query)
    },
    async activity(query) {
      const union = activityUnion(query),
        countParams = [...union.params],
        limit = paging(query, union.params)
      const [items, total] = await consistentPair(
        pool,
        `WITH events AS (${union.sql}) SELECT public_id,raw_id,type,project_id,occurred_at,action,status,actor_id,actor_display_name,actor_role,version_id,asset_id,job_id,entity_type,entity_id FROM events ORDER BY occurred_at DESC,type DESC,public_id DESC ${limit}`,
        union.params,
        `WITH events AS (${union.sql}) SELECT count(*)::bigint total FROM events`,
        countParams,
      )
      return pageResult(items.rows.map(activityDto), total.rows[0].total, query)
    },
    async projectActivity(id, query) {
      if (
        !(await pool.query('SELECT 1 FROM campaigns WHERE id=$1', [id]))
          .rowCount
      )
        return null
      return repository.activity({
        ...query,
        projectId: id,
        search: undefined,
      })
    },
    async modules() {
      return { items: structuredClone(moduleInventory) }
    },
    async overview({ now = new Date() } = {}) {
      const to = new Date(now),
        from = new Date(to.getTime() - 24 * 60 * 60 * 1000)
      const [countRows, statuses, duration, recent, modules] =
        await Promise.all([
          pool.query(`SELECT
          (SELECT count(*) FROM users)::bigint users,
          (SELECT count(*) FROM users WHERE NOT (disabled OR disabled_at IS NOT NULL))::bigint active_users,
          (SELECT count(*) FROM users WHERE disabled OR disabled_at IS NOT NULL)::bigint disabled_users,
          (SELECT count(*) FROM campaigns)::bigint projects,
          (SELECT count(*) FROM campaigns WHERE archived_at IS NULL)::bigint active_projects,
          ((SELECT count(*) FROM assets)+(SELECT count(*) FROM brand_design_system_sources WHERE object_key IS NOT NULL)+(SELECT count(*) FROM brand_design_system_assets))::bigint assets,
          ((SELECT count(*) FROM generation_jobs)+(SELECT count(*) FROM brand_design_system_ai_jobs))::bigint jobs,
          (SELECT count(*) FROM asset_workflows)::bigint asset_workflows,
          (SELECT count(*) FROM asset_workflows w WHERE EXISTS (SELECT 1 FROM asset_workflow_versions v WHERE v.workflow_id=w.id))::bigint published_asset_workflows`),
          pool.query(
            `SELECT status,count(*)::bigint count FROM (SELECT status FROM generation_jobs WHERE created_at >= $1 AND created_at < $2 UNION ALL SELECT status FROM brand_design_system_ai_jobs WHERE created_at >= $1 AND created_at < $2) jobs GROUP BY status`,
            [from, to],
          ),
          pool.query(
            `WITH samples AS (
          SELECT extract(epoch FROM (completed_at-created_at))*1000 duration FROM generation_jobs WHERE created_at >= $1 AND created_at < $2 AND completed_at IS NOT NULL AND completed_at>=created_at
          UNION ALL SELECT extract(epoch FROM (updated_at-created_at))*1000 FROM brand_design_system_ai_jobs WHERE created_at >= $1 AND created_at < $2 AND status IN ('succeeded','failed','cancelled') AND updated_at>=created_at)
          SELECT round(avg(duration)) average,count(*)::bigint sample_count FROM samples`,
            [from, to],
          ),
          repository.activity({ page: 1, pageSize: 10 }),
          repository.modules(),
        ])
      const c = countRows.rows[0],
        d = duration.rows[0]
      const jobStatusCounts = Object.fromEntries(
        [
          'pending',
          'running',
          'succeeded',
          'failed',
          'blocked',
          'unknown',
          'queued',
          'cancelled',
        ].map((status) => [status, 0]),
      )
      for (const row of statuses.rows)
        jobStatusCounts[row.status] = safeNumber(row.count)
      const sampleCount = safeNumber(d.sample_count),
        average = d.average == null ? null : safeNumber(d.average)
      return {
        scope: 'all-workspaces',
        window: { hours: 24, from: from.toISOString(), to: to.toISOString() },
        counts: {
          users: safeNumber(c.users),
          activeUsers: safeNumber(c.active_users),
          disabledUsers: safeNumber(c.disabled_users),
          projects: safeNumber(c.projects),
          activeProjects: safeNumber(c.active_projects),
          assets: safeNumber(c.assets),
          jobs: safeNumber(c.jobs),
          assetWorkflows: safeNumber(c.asset_workflows),
          publishedAssetWorkflows: safeNumber(c.published_asset_workflows),
        },
        jobStatusCounts,
        performance: {
          completedJobDurationMs: {
            average,
            sampleCount,
            unavailableReason: sampleCount
              ? null
              : 'No completed jobs were recorded in this window.',
          },
          providerLatencyMs: {
            average: null,
            sampleCount: 0,
            unavailableReason: 'Provider latency telemetry is not persisted.',
          },
          humanTaskDurationMs: {
            average: null,
            sampleCount: 0,
            unavailableReason: 'Human task telemetry is not implemented.',
          },
        },
        recentActivity: recent.items,
        modules: modules.items,
      }
    },
  }
  return repository
}
