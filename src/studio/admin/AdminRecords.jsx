import { useState } from 'react'
import {
  DataTable,
  Pagination,
  SelectField,
} from '../../components/design-system/organisms/OperationsLayout.jsx'
import { FormField } from '../../components/design-system/molecules/FormField.jsx'
import { AppButton } from '../../components/design-system/atoms/AppButton.jsx'
import {
  campaignStatuses,
  projectTypes,
  assetKinds,
  jobStatuses,
  activityTypes,
} from '../../../shared/adminContracts.js'
import {
  AdminLink,
  RequestState,
  useAdminResource,
  human,
  date,
  options,
} from './adminShared.jsx'
const filters = {
  users: [
    ['role', 'Role', ['admin', 'marketer', 'designer']],
    [
      'disabled',
      'Account state',
      [
        ['false', 'Active'],
        ['true', 'Disabled'],
      ],
    ],
  ],
  projects: [
    ['status', 'Status', campaignStatuses],
    ['projectType', 'Product type', projectTypes],
    [
      'archived',
      'Archive',
      [
        ['false', 'Active'],
        ['true', 'Archived'],
      ],
    ],
    ['creatorId', 'Creator ID'],
  ],
  assets: [
    ['sourceType', 'Source type', ['campaign', 'brand-source', 'brand-asset']],
    ['kind', 'Kind', assetKinds],
    [
      'source',
      'Source',
      ['upload', 'generation', 'render', 'review', 'delivery'],
    ],
    ['projectId', 'Project ID'],
    ['brandId', 'Brand ID'],
  ],
  jobs: [
    ['status', 'Status', jobStatuses],
    ['jobType', 'Job type', ['campaign-generation', 'brand-ai']],
    [
      'step',
      'Step',
      ['brief_analysis', 'copy', 'directions', 'image', 'video'],
    ],
    ['provider', 'Provider'],
    ['projectId', 'Project ID'],
    ['brandId', 'Brand ID'],
  ],
  activity: [
    ['type', 'Event type', activityTypes],
    ['status', 'Status', [...jobStatuses, 'delivered']],
    ['projectId', 'Project ID'],
    ['actorId', 'Actor ID'],
  ],
}
export const recordTitles = {
  users: 'Users',
  projects: 'Projects',
  assets: 'Assets',
  jobs: 'System work',
  activity: 'Activity',
}
function projectLink(row, onNavigate) {
  return row.projectId ? (
    <AdminLink
      to={`/mvp/admin/projects/${encodeURIComponent(row.projectId)}`}
      onNavigate={onNavigate}
    >
      {row.projectId}
    </AdminLink>
  ) : row.brandId ? (
    <AdminLink
      to={`/mvp/system/${encodeURIComponent(row.brandId)}`}
      onNavigate={onNavigate}
    >
      Brand {row.brandId}
    </AdminLink>
  ) : (
    '—'
  )
}
const raw = (value) =>
  value === null || value === undefined || value === '' ? '—' : value
const humanized = (value) => human(value) || '—'
const column = (id, header, cell = (row) => raw(row[id])) => ({
  id,
  header,
  cell,
})
export function recordColumns(section, onNavigate) {
  const related = column('related', 'Related record', (row) =>
    projectLink(row, onNavigate),
  )
  if (section === 'users')
    return [
      column('displayName', 'Name', (row) => (
        <AdminLink
          to={`/mvp/admin/projects?creatorId=${encodeURIComponent(row.id)}`}
          onNavigate={onNavigate}
        >
          {row.displayName || row.email}
        </AdminLink>
      )),
      column('email', 'Email'),
      column('role', 'Role', (row) => humanized(row.role)),
      column('disabled', 'Account', (row) =>
        row.disabled ? 'Disabled' : 'Active',
      ),
      column(
        'signIn',
        'Sign-in',
        (row) =>
          [
            row.passwordConfigured && 'Password',
            row.googleConnected && 'Google',
          ]
            .filter(Boolean)
            .join(', ') || 'Not configured',
      ),
      column('updatedAt', 'Updated', (row) => date(row.updatedAt)),
    ]
  if (section === 'projects')
    return [
      column('title', 'Project', (row) => (
        <AdminLink
          to={`/mvp/admin/projects/${encodeURIComponent(row.id)}`}
          onNavigate={onNavigate}
        >
          {row.title}
        </AdminLink>
      )),
      column('projectType', 'Product', (row) => humanized(row.projectType)),
      column('status', 'Status', (row) => humanized(row.status)),
      column(
        'creator',
        'Creator',
        (row) => row.creator.displayName || row.creator.email,
      ),
      column('assets', 'Assets', (row) => row.counts.assets),
      column('jobs', 'Jobs', (row) => row.counts.jobs),
      column('archivedAt', 'Archive', (row) =>
        row.archivedAt ? 'Archived' : 'Active',
      ),
      column('updatedAt', 'Updated', (row) => date(row.updatedAt)),
    ]
  if (section === 'assets')
    return [
      column('name', 'Name'),
      column('kind', 'Kind', (row) => humanized(row.kind)),
      column('sourceType', 'Source type', (row) => humanized(row.sourceType)),
      related,
      column('mimeType', 'Format'),
      column('byteSize', 'Bytes', (row) => row.byteSize.toLocaleString()),
      column('createdAt', 'Created', (row) => date(row.createdAt)),
    ]
  if (section === 'jobs')
    return [
      column('rawId', 'Job'),
      column('jobType', 'Type', (row) => humanized(row.jobType)),
      column('status', 'Status', (row) => humanized(row.status)),
      column('step', 'Step / operation', (row) =>
        humanized(row.step || row.operation),
      ),
      related,
      column('provider', 'Provider'),
      column('model', 'Model'),
      column('errorCode', 'Error code'),
      column('updatedAt', 'Updated', (row) => date(row.updatedAt)),
    ]
  return [
    column('occurredAt', 'When', (row) => date(row.occurredAt)),
    column('type', 'Event', (row) => humanized(row.type)),
    column('action', 'Action / status', (row) =>
      humanized(row.action || row.status),
    ),
    related,
    column('actor', 'Actor', (row) => row.actor?.displayName || 'System'),
  ]
}
export function AdminRecords({
  client,
  section,
  onNavigate,
  initialSearch = '',
  projectId,
}) {
  const allowed = new Set([
    'search',
    ...(filters[section] || []).map(([key]) => key),
  ])
  const [query, setQuery] = useState(() =>
    Object.fromEntries(
      [...new URLSearchParams(initialSearch)].filter(([key]) =>
        allowed.has(key),
      ),
    ),
  )
  const [page, setPage] = useState(1)
  const state = useAdminResource(
    () =>
      projectId
        ? client.projectActivity(projectId, {
            page,
            pageSize: 25,
            type: query.type,
          })
        : client.records(section, { ...query, page, pageSize: 25 }),
    [client, section, JSON.stringify(query), page, projectId],
  )
  const change = (key, value) => {
    setQuery((old) => ({ ...old, [key]: value }))
    setPage(1)
  }
  const Heading = projectId ? 'h2' : 'h1'
  const fields = projectId
    ? [['type', 'Event type', activityTypes]]
    : filters[section]
  return (
    <section
      id={projectId ? 'admin-project-activity' : `admin-${section}`}
      className={projectId ? 'admin-section' : 'admin-page'}
    >
      <Heading>
        {projectId ? 'Project activity' : recordTitles[section]}
      </Heading>
      <p className="admin-muted">
        Read-only records · {state.data?.total ?? '…'} results
      </p>
      <div className="admin-filters">
        {!projectId && (
          <div className="admin-filter"><FormField
            label="Search records"
            type="search"
            maxLength={200}
            value={query.search || ''}
            onChange={(e) => change('search', e.target.value)}
          /></div>
        )}
        {fields.map(([key, label, values]) =>
          <div className="admin-filter" key={key}>{values ? (
            <SelectField
              key={key}
              label={label}
              value={query[key] || ''}
              options={[
                { value: '', label: 'All' },
                ...values.map((v) =>
                  Array.isArray(v)
                    ? { value: v[0], label: v[1] }
                    : { value: v, label: human(v) },
                ),
              ]}
              onChange={(e) => change(key, e.target.value)}
            />
          ) : (
            <FormField
              key={key}
              label={label}
              maxLength={key === 'provider' ? 100 : 200}
              value={query[key] || ''}
              onChange={(e) => change(key, e.target.value)}
            />
          )}</div>,
        )}
        <div><AppButton
          onClick={() => {
            setQuery({})
            setPage(1)
          }}
        >
          Clear filters
        </AppButton></div>
      </div>
      <RequestState {...state} />
      {state.data && (
        <>
          <DataTable
            label={
              projectId
                ? 'Project activity records'
                : `${recordTitles[section]} records`
            }
            columns={recordColumns(section, onNavigate)}
            rows={state.data.items}
            getRowId={(row) => row.id}
            emptyMessage={`No ${section === 'jobs' ? 'system work' : section} match these filters.`}
          />
          <Pagination
            page={page}
            pageCount={Math.max(
              1,
              Math.ceil(state.data.total / state.data.pageSize),
            )}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  )
}
export function AdminProject({ client, id, onNavigate }) {
  const state = useAdminResource(() => client.project(id), [client, id])
  const project = state.data?.project
  return (
    <section id="admin-projects" className="admin-page">
      <AdminLink to="/mvp/admin/projects" onNavigate={onNavigate}>
        All projects
      </AdminLink>
      <RequestState {...state} />
      {project && (
        <>
          <h1>{project.title}</h1>
          <p>
            {human(project.projectType)} · {human(project.status)} ·{' '}
            {project.archivedAt ? 'Archived' : 'Active'}
          </p>
          <dl className="admin-facts">
            <dt>Creator</dt>
            <dd>
              {project.creator.displayName} ({project.creator.email})
            </dd>
            <dt>Updated</dt>
            <dd>{date(project.updatedAt)}</dd>
            <dt>Revision</dt>
            <dd>{project.revision}</dd>
            {Object.entries(project.counts).map(([key, value]) => (
              <div key={key}>
                <dt>{human(key)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="admin-links">
            <AdminLink
              to={`/mvp/campaign/${encodeURIComponent(id)}`}
              onNavigate={onNavigate}
            >
              Open in Studio
            </AdminLink>
            <AdminLink
              to={`/mvp/admin/assets?projectId=${encodeURIComponent(id)}`}
              onNavigate={onNavigate}
            >
              Project assets
            </AdminLink>
            <AdminLink
              to={`/mvp/admin/jobs?projectId=${encodeURIComponent(id)}`}
              onNavigate={onNavigate}
            >
              Project system work
            </AdminLink>
          </div>
          <h2>Workflow references</h2>
          <dl className="admin-facts">
            {Object.entries(project.workflow).map(([key, value]) => (
              <div key={key}>
                <dt>{human(key.replace(/([A-Z])/g, ' $1'))}</dt>
                <dd>{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
          <AdminRecords
            client={client}
            section="activity"
            projectId={id}
            onNavigate={onNavigate}
          />
        </>
      )}
    </section>
  )
}
export function AdminModules({ client }) {
  const state = useAdminResource(() => client.records('modules'), [client])
  return (
    <section id="admin-modules" className="admin-page">
      <h1>Modules</h1>
      <p>
        Capability boundaries for the current application. Product recipes
        support authoring and fixture simulation; published recipes are not
        connected to live end-user execution.
      </p>
      <RequestState {...state} />
      {state.data && (
        <DataTable
          label="Module inventory"
          rows={state.data.items}
          getRowId={(row) => row.id}
          emptyMessage="No modules available."
          columns={[
            column('name', 'Module'),
            column('category', 'Category', (row) => humanized(row.category)),
            column('availability', 'Availability', (row) => (
              <dl className="admin-availability">
                {Object.entries(row.availability).map(([key, value]) => (
                  <div key={key}>
                    <dt>{human(key.replace(/([A-Z])/g, ' $1'))}</dt>
                    <dd>{human(value)}</dd>
                  </div>
                ))}
              </dl>
            )),
            column('unavailableReason', 'Limitations'),
          ]}
        />
      )}
    </section>
  )
}
