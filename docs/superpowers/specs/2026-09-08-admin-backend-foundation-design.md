# Admin backend foundation — architecture decision

Date: 8 September 2026  
Status: Proposed architecture and phased scope. Documentation only; no backend implementation or migrations performed.

## Recommendation

Extend the existing application as a modular monolith: one codebase, one PostgreSQL database, existing object storage, an HTTP API process, and a separately runnable worker process. Admin is an authorized interface to the product's data and commands. It does not own a second copy of users, projects, assets, or approvals.

Start with useful admin tables over current records. Introduce the shared project/document boundary before enabling non-campaign workflows. Then prove one versioned workflow with persisted questions, scheduling, recovery, and output history. Keep format-specific rendering and existing review rules in tested application capabilities.

Working assumptions: this admin is an internal operations area; a project may eventually contain several assets of different types; “upcoming tasks” includes both scheduled system work and work waiting for a person. These are planning defaults, not verified customer tenancy requirements.

## What the application already has

Source inspection of the application checkout established the following. These are source observations, not new runtime test results.

| Existing data | Meaning and consequence |
| --- | --- |
| `users`, `invitations` | Identity and marketer/designer/admin roles; reuse them. |
| `campaigns` | Current project experience, with banner-specific brief, selected copy/direction/composition and lifecycle. Suitable for an initial admin Projects view; not a general deck or website schema. |
| `templates`, `copy_sets`, `visual_directions`, `compositions`, `campaign_versions` | Banner authoring and immutable review snapshots. Preserve their contracts. |
| `assets`, `deliveries` | Physical file metadata and delivery packages. An exported PNG is not the same entity as an editable banner set. |
| `generation_jobs`, `video_jobs` | Provider operations, dispatch identity, costs, timeouts and uncertain outcomes. The current generation schema requires a campaign and supported operation type. |
| `review_events`, `audit_events` | Existing approval and change history; review service and database gates remain authoritative. |
| `brand_design_systems` and related tables | Application-managed brand data, published versions, source files, separate brand assets and membership. They already contain a workspace identifier. |
| Personal settings and notification outbox | Existing credential and notification services to integrate through explicit contracts. |

Evidence: `server/db/migrations/001_core.sql`, `007_generation_control_plane.sql`, `015_human_review_gates.sql`, `030_brand_design_systems.sql`, `033_brand_design_system_access.sql`, `037_notification_outbox.sql`, `041_video_generation.sql`; `shared/workflowRules.js`; `server/services/workflowService.js`; `server/repositories/generationJobRepository.js`.

The React Flow canvas is currently a UI scaffold. Its existence does not establish persistence, executable conditions, or a workflow runtime.

## Domain boundaries

| Concept | Example | Owns |
| --- | --- | --- |
| User | Person creating or reviewing work | Identity and access |
| Project | Product launch | Shared organization, ownership and archive state |
| Document / logical asset | Launch deck, banner set, landing page | Stable editable identity and asset type |
| Document version | Deck revision 3 | An immutable content snapshot and provenance |
| Stored file / rendition | PPTX, PDF, thumbnail or PNG | Object reference, format, size and checksum |
| Workflow definition and version | Presentation recipe v4 | Supported steps, instructions, conditions and questions |
| Workflow run | Create this deck using recipe v4 | Input, progress, selected design context and output references |
| Node attempt | Compose deck, attempt 2 | Validated input/output, error, timing and provider operation reference |
| System work item | Render at 10:00, poll an existing job | Scheduling, worker ownership and delivery/recovery state |
| Human task | Choose slide count | Recipient, reason, response contract, due date and recorded answer |

A project can have many documents; a document can have many versions and runs; a version can have several exported files. A run produces or updates a document, rather than becoming the document's permanent identity.

The admin Work queue presents human tasks and system work as separate tabs with their own statuses. `due_at` is a human deadline; `available_at` is the earliest time a worker may execute. Neither means the other.

## Database structure and rollout boundary

### Reuse first

Initial Users, Projects and Assets screens query existing records. Projects are explicitly campaign-backed at this stage. “All assets” must account for campaign files and separate brand files using a typed, namespaced read model; do not silently omit brand assets or treat identical IDs in different tables as one record.

No generic CRUD endpoint may directly edit campaign status, approval state, job status or output references. Admin mutations call named, authorized domain commands.

### Establish shared identities before additional formats

Proposed relational additions:

- `projects`: id, title, creator, timestamps, archive state, revision; explicit access scope once tenancy is resolved.
- `documents`: id, project_id, asset_type, title, creator, current_version_id, archive state, revision.
- `document_versions`: id, document_id, version number, schema version, immutable content or a typed legacy snapshot reference, provenance and timestamps.
- A version-to-file relation, allowing multiple formats/renditions without duplicating binary objects.

Backfill each existing campaign as one project containing one banner-set document. Keep campaign IDs, APIs and banner state intact through a compatibility adapter. Existing `campaign_versions` remain the source for historical banner snapshots; generic version rows reference them rather than rewriting their contents.

Shared metadata must have one declared owner. When the adapter moves title/ownership/archive metadata to projects, old campaign API fields become compatibility projections; any temporary legacy column synchronization is transactional and explicitly scheduled for removal. Do not maintain two independent project titles or statuses.

A new-format file registry can share the storage service without changing existing campaign/brand asset foreign keys immediately. Resolve whether to widen `assets` or add a neutral registry in the migration design for the first new format; the contract must expose typed file references either way. Do not force PPTX files to belong to a fabricated campaign.

### Add one workflow subsystem

Use the earlier asset-workflow plan's `asset_workflow_*` naming to avoid creating a competing `workflow_*` subsystem.

| Proposed table | Essential fields and invariants |
| --- | --- |
| `asset_workflows` | id, asset_type, key, title, archived_at, active_version_id, editable draft JSONB, draft_revision, author/timestamps. One default recipe per supported type and access scope initially. |
| `asset_workflow_versions` | id, workflow_id, version_number, schema_version, definition JSONB, content_hash, publisher/time. All rows are immutable publications. The active pointer must reference a version of the same workflow. |
| `asset_workflow_runs` | id, project_id, optional document_id and target_document_revision, version_id, requester, revision, input_revision, input/context references, status, active_node_id, start/finish times. Related IDs must belong to the same project/access scope. |
| `asset_workflow_attempts` | id, run_id, node_id, iteration, input_revision, attempt_number, input hash/references, status, result references, capability version, provider operation reference, timing/error. Unique identity for each intentional execution attempt. |
| `asset_workflow_jobs` | id, run/attempt references, operation (advance/reconcile), dedupe identity, status, available_at, lease token/expiry, delivery count, last safe error. This is durable scheduling intent, consumed by workers. |
| `human_tasks` | id, optional project_id and run/attempt references, type (clarification/review/approval/manual/escalation), creator, recipient/assignee, status, priority, due_at, revision, input_revision, question schema, answer, bound plan/version reference, completion actor/time and dedupe identity. Run-linked tasks must reference that run's project. |
| `asset_workflow_events` | run_id, monotonic per-run sequence, event type, actor, node/attempt/task references, safe payload, timestamp. Append-only history. |

Use existing command-idempotency infrastructure where its scope fits; extend it deliberately where necessary. A repeated key with the same request returns the prior outcome; a different request under the same key conflicts.

This refines the earlier runtime plan: its separate draft table can be folded into `asset_workflows`; its blocking `asset_workflow_interactions` become `human_tasks`; nonblocking notices are events; artifact identity belongs to document versions. Reconcile that plan before implementation, rather than building both sets of tables.

Relational columns hold ownership, foreign keys, status, scheduling and indexes. Versioned graph definitions, question schemas and structured content fit JSONB. Large sources, generated files and credentials do not belong in run context. Store only the required content or authorized references, with retention/redaction rules.

## Workflow definition, AI and design context

The canvas, backend and generated workflow documentation read the same definition. Separate executable graph data from presentation metadata such as node positions, collapsed panels and viewport. Moving a node must not change execution order; edges and input bindings do.

A supported node declares capability ID/version, input bindings, output schema, instructions where relevant, configuration, and bounded retry/failure behavior. Conditions use a restricted structured expression language, never arbitrary JavaScript, SQL, or model-written executable code. Missing facts route to a declared clarification or error path.

Publishing validates unique IDs, reachable nodes, input/output compatibility, supported capabilities, valid branches and terminal outputs. Start with sequential execution per run and conditional branches; different runs may execute concurrently. General parallel joins and graph cycles are deferred. Bounded repair can initially be handled inside a capability, with each attempt recorded.

Admins may change instructions, question policies, defaults and connections among supported capabilities. Permissions, allowed tools, mandatory validations, cost limits and independent review rules remain backend-enforced. A new renderer or capability requires code.

Resolve brand and template data from published records in the application. Pin workflow, brand, template, input and capability versions on the run. Preserve accepted outputs; version pinning provides traceability, not identical results from a later AI call.

Interpret the request into a structured brief recording supplied, inferred, defaulted and confirmed values. Questions ask only about material missing/conflicting requirements. For a deck: count/range, preserve wording versus restructure, selected layout/brand, and output format. A known answer is not asked again. Record the agreed outcome and validate the final asset against it.

Draft changes use optimistic revisions. Publish inserts a new immutable version and changes the default pointer atomically. Rollback selects a compatible older publication for new runs; existing runs stay pinned. Provide a synthetic simulation before activation, and generate readable step/instruction/branch documentation from the exact version.

## Execution, scheduling and recovery

Use short SQL transactions around state changes; external AI calls and rendering run outside database transactions.

1. Starting a run atomically pins the published version and creates the first work item.
2. A worker claims eligible work with a renewable lease. Each mutation checks the current ownership token, run revision and cancellation state.
3. Claiming a work item again is delivery recovery, not automatic permission for another provider submission. Node attempts have separate identities.
4. The worker persists output references, the transition event and the next work item in one transaction. Output adoption checks the target document revision so concurrent runs cannot silently overwrite later edits.
5. A blocking question atomically creates a human task and pauses the run. Closing the browser does not lose it.
6. Answering checks actor rights, task/input revision and the stored schema, then commits the answer, event and resume work item together.
7. A provider timeout after dispatch can mean an unknown outcome. Reconcile the saved operation identity where supported; otherwise expose a needs-attention state. Never blindly regenerate unknown work.
8. On restart, reclaim expired leases, reject late writes from previous owners, and resume persisted work. Cancellation prevents later results from being adopted; it may not cancel already billed external work.

Object uploads do not share a PostgreSQL transaction. Stage files under stable attempt identities, verify checksums, attach their references in the result transaction, and reconcile unreferenced objects using the existing cleanup patterns.

Run statuses: queued, running, waiting_for_user, waiting_for_provider, needs_attention, succeeded, failed, canceled. Human task statuses: open, in_progress, completed, canceled. Job statuses represent queue delivery only. One entity's status must not be copied as another's independent business truth.

Provider reliability remains in the existing control plane for supported campaign operations. New deck/website operations need a generic provider adapter and durable dispatch accounting; the current campaign-required `generation_jobs` table cannot be reused unchanged.

PostgreSQL documents `SKIP LOCKED` as useful for queue consumers, while warning that it is unsuitable for ordinary consistent reads. This supports the initial scheduling approach; leases, deduplication and recovery still need implementation and tests. [PostgreSQL SELECT locking](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)

## Human tasks, reviews and notifications

A clarification task is the authoritative question/answer record. A review task points to an exact plan hash or document/campaign version. Completing review calls the existing review command; it cannot independently approve the project. Existing designer/marketer rules and the prohibition on self-approving a ready version survive even in admin.

Assignment organizes work but grants no access or approval authority. Recheck eligibility at completion. Source edits invalidate stale questions and approvals; late answers conflict rather than resuming the wrong input revision. Canceling/dismissing a blocking task must explicitly cancel the run or follow a declared fallback; silence is never approval.

Nonblocking warnings/information become events and UI notices. A personal notification is delivery of a task/event, not its source of truth. Extend outbox event types for workflow activity and enqueue notification intent in the same transaction as the new task where delivery reliability is required. Current campaign notifications are called after the main mutation and catch failures; do not claim that path is already atomic.

## Admin information architecture and permissions

Reuse the application shell with Overview, Users, Projects, Assets, Work queue, Workflows, Design systems, and Activity. Start with the list/detail screens needed for operations; overview charts can follow actual usage.

Every table needs bounded pagination, supported filters, deterministic ordering and links to related records. Project detail connects documents/files, runs, tasks and activity. Asset detail exposes provenance and authorized previews/downloads. Label audit-derived timestamps “last recorded activity,” not “last login.”

Internal admins may inspect operational state through explicit admin APIs. Customer/workspace admins require server-enforced membership and row scope. Existing brand workspace identifiers alone do not prove complete tenant isolation. Resolve internal-only versus customer-admin access before enabling broad production lists; add normalized workspaces/memberships when required, not placeholder tenancy fields that imply protection.

Keep credentials, provider secrets and unrestricted storage access outside admin responses. Existing audit status fields are campaign-constrained: use workflow events for run transitions, and null campaign statuses plus safe action payloads for applicable admin audit records, or migrate the audit schema explicitly.

## Delivery stages

1. **Operational visibility:** read-only Users, campaign Projects, existing Assets and activity; explicit provider job states.
2. **Shared identities:** projects/documents/version references and the campaign compatibility adapter, before non-campaign runs.
3. **Workflow authoring:** persisted drafts, validation, simulations, immutable publication, generated reference and React Flow integration.
4. **One complete execution:** deterministic workflow, condition, human question, worker scheduling, restart/recovery and linked output. Then connect an existing supported banner capability.
5. **Admin operations:** work queue, assignment, authorized responses, recovery actions, notifications and project/run inspection.
6. **Additional formats:** prove presentation rendering/export, then websites and reusable template authoring against separate output contracts.

Each stage is independently reviewable. Queue/recovery tests precede paid generation. A presentation workflow diagram alone is not delivery of a presentation renderer.

Do not fabricate historical workflow runs. Show existing data as legacy activity; derive pending reviews from authoritative state, and only create deduplicated operational tasks when there is a known action and owner. Pending/unknown provider jobs are not automatically human tasks.

## Twelve-Factor alignment

- Deployment addresses, credentials and worker tuning are deployment configuration; editable workflows/instructions are versioned product data in PostgreSQL. [Config](https://www.12factor.net/config)
- API and worker share the release but store durable state externally. Worker count can grow independently. [Processes](https://www.12factor.net/processes), [Concurrency](https://www.12factor.net/concurrency)
- Build/install dependencies once per release; run compatible API/worker versions, migrate through the release process, and test with production-like PostgreSQL/object storage.
- Drain workers on shutdown, recover expired ownership, and emit structured logs with run/attempt IDs while retaining domain history in the database.
- Migrations and repair/backfill commands run as controlled one-off processes. The “admin processes” factor does not prescribe how an admin web interface should be built. [Admin processes](https://www.12factor.net/admin-processes)

## Completion evidence

The foundation is complete only when an authorized admin can navigate the requested records and follow one request through publication, execution, a saved question, restart, answer, resumed work and versioned output. Prove duplicate answers, concurrent workers, stale inputs, uncertain provider outcomes and publication changes cannot create inconsistent or unauthorized results.

This document and the linked roadmap are planning deliverables. No implementation, performance, tenant-isolation or production-readiness result is claimed.
