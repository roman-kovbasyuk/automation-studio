import { FactGrid } from "../../components/design-system/compatibility.jsx"
import { DataTable } from '../../components/design-system/organisms/OperationsLayout.jsx'
import {
  AdminLink,
  RequestState,
  useAdminResource,
  date,
  human,
} from './adminShared.jsx'
import { recordColumns } from './AdminRecords.jsx'
export function AdminOverview({ client, onNavigate }) {
  const state = useAdminResource(() => client.overview(), [client])
  const data = state.data
  return (
    <section id="admin-overview" className="admin-page">
      <h1>Overview</h1>
      <p>Application records across all workspaces.</p>
      <RequestState {...state} />
      {data && (
        <>
          <h2>Record inventory</h2>
          <FactGrid label="Record inventory" items={[
            ['users', 'Users', 'users'], ['activeUsers', 'Active users', 'users?disabled=false'],
            ['disabledUsers', 'Disabled users', 'users?disabled=true'], ['projects', 'Projects', 'projects'],
            ['activeProjects', 'Active projects', 'projects?archived=false'], ['assets', 'Assets', 'assets'],
            ['jobs', 'System work', 'jobs'], ['assetWorkflows', 'Product recipes', 'recipes'],
            ['publishedAssetWorkflows', 'Published recipes', 'recipes'],
          ].map(([id, label, path]) => ({ id, label: <AdminLink to={`/mvp/admin/${path}`} onNavigate={onNavigate}>{label}</AdminLink>, value: data.counts[id] }))} />
          <p className="admin-muted">
            All persisted records, including archived projects and disabled
            accounts.
          </p>
          <h2>System work · last {data.window.hours} hours</h2>
          <p className="admin-muted">
            Jobs created from {date(data.window.from)} to {date(data.window.to)}
            .
          </p>
          <div className="admin-status-summary">
            {Object.entries(data.jobStatusCounts).map(([key, value]) => (
              <AdminLink
                key={key}
                to={`/mvp/admin/jobs?status=${key}`}
                onNavigate={onNavigate}
              >
                {human(key)} <strong>{value}</strong>
              </AdminLink>
            ))}
          </div>
          <h2>Recorded performance</h2>
          <FactGrid label="Recorded performance" items={Object.entries(data.performance).map(([id, value]) => ({
            id, label: { completedJobDurationMs: 'Completed job duration', providerLatencyMs: 'Provider latency', humanTaskDurationMs: 'Human task duration' }[id],
            value: <>{value.average === null ? 'Unavailable' : `${(value.average / 1000).toFixed(1)} seconds`} · {value.sampleCount} samples{value.unavailableReason && <p>{value.unavailableReason}</p>}</>,
          }))} />
          <p>
            Production infrastructure monitoring is unavailable. These
            measurements only describe persisted application work.
          </p>
          <h2>Recent activity</h2>
          <DataTable
            label="Latest 10 activity records"
            rows={data.recentActivity}
            columns={recordColumns('activity', onNavigate)}
            getRowId={(row) => row.id}
            emptyMessage="No activity recorded yet."
          />
          <AdminLink to="/mvp/admin/activity" onNavigate={onNavigate}>
            View all activity
          </AdminLink>
        </>
      )}
    </section>
  )
}
