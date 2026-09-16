# Admin backend foundation — implementation roadmap

Date: 8 September 2026  
Status: Proposed stages with interfaces and acceptance gates; implementation is not started.

**Design:** [Admin backend architecture](../specs/2026-09-08-admin-backend-foundation-design.md)

This roadmap extends the earlier asset-workflow plans with admin operations and shared product identities. Use one workflow subsystem. Reconcile names and staging with those plans before coding: `asset_workflow_*` is the common prefix; blocking interactions become `human_tasks`; document versions own artifact identity.

This is a staged engineering roadmap, not a claim that all migrations or test fixtures already exist. Detailed migration SQL and format-specific contracts are deliverables of the relevant stage. No automated delegation, commits, deployment or live provider calls are authorized by this document itself.

## Execution context and constraints

Application root: `/Users/roman/Documents/Dev/crisp/lingu-agents/.worktrees/integrated-mvp`. All paths below are relative to that checkout.

At implementation start, read project instructions, pull Observatory and inspect current changes. Preserve unrelated work. Allocate migration numbers from the actual current maximum; numbers in older plans are not reservations.

Use existing PostgreSQL/transaction, Fastify, Zod, storage and React design-system conventions. Retain React Flow for the canvas. Maintain the approved six campaign modules and existing review/delivery invariants.

Assumed initial access is internal operations admin. Settle customer workspace access before production exposure; add membership/scoped foreign keys and negative access tests if customer administration is required.

## Stage 1 — Read-only admin visibility

**Outcome:** Admin can find current users, campaign projects, files and operational history without changing product behavior.

**Paths:** Create `server/repositories/adminRepository.js`, `server/routes/admin.js` and focused tests. Wire through `server/app.js`/`server/bootstrap.js`. Add response contracts in a focused shared module following repository conventions. Use `src/studio/admin/`, `src/studio/StudioApp.jsx` and canonical design-system tables/controls for UI.

**API contract:**

- `GET /api/v1/admin/users`: bounded pagination, search, role/disabled filters; safe user fields only.
- `GET /api/v1/admin/projects`: campaign-backed summaries initially, creator, domain status, updated date and bounded counts.
- `GET /api/v1/admin/assets`: source/kind/project filters and namespaced IDs covering campaign and brand file sources.
- `GET /api/v1/admin/projects/:id` and `/:id/activity`: project details and ordered generation/review/delivery/audit references.
- `GET /api/v1/admin/jobs`: provider work with native pending/failed/unknown states, separate from human tasks.

- [ ] Verify existing role checks and effective project/brand access scope; define an explicit internal-admin policy.
- [ ] Implement repository queries with deterministic tie-break ordering and filter indexes where justified. Avoid count joins that multiply rows.
- [ ] Define safe response DTOs, maximum page size and authorization checks for linked details and downloads.
- [ ] Build Users, Projects, Assets and activity views using shared components. Show native statuses and honest legacy labels.
- [ ] Test non-admin/disabled actor denial, safe fields, filters, pagination, zero-related-record cases and asset ID collisions across sources.
- [ ] Browser-check list-to-detail navigation and loading/empty/error states. Register verified Screen/Section links in Observatory.

**Gate:** Existing records are visible, counts are correct, credentials are absent and existing campaign commands remain unchanged. No task/run records are invented for old data.

## Stage 2 — Shared project and document identities

**Outcome:** One project can own multiple typed documents, while current banner campaigns keep working.

**Paths:** New migration(s), project/document repositories and services with tests; a focused `server/services/campaignProjectAdapter.js`; integrate existing `campaignRepository.js` and `workflowService.js` only at shared metadata boundaries.

- [ ] Finalize `projects`, `documents`, `document_versions` and typed version/file references. Document which fields have a single owner.
- [ ] Implement explicit foreign keys and same-project checks, stable IDs, revision checks and archive behavior.
- [ ] Create a resumable backfill mapping each campaign to one project and one banner-set document. Historical versions reference existing immutable snapshots.
- [ ] Keep old campaign routes and IDs stable through the adapter. Centralize shared title/owner/archive mutations; temporary compatibility columns must be synchronized transactionally and have a removal plan.
- [ ] Update admin queries to shared project/document identities. Do not expose banner copy/composition statuses as universal document statuses.
- [ ] Test backfill reruns, interrupted batches, mixed old/new records, archive behavior, immutable historical references and unchanged campaign responses.
- [ ] Decide the neutral file-registry migration for the first non-campaign format; support multiple rendition references without moving binary files.

**Gate:** An existing campaign retains its content, IDs, review history and files; a synthetic project can contain a banner document and a second typed document without fake campaign records.

## Stage 3 — Persist and publish workflows

**Outcome:** Node instructions and branching are durable data, with testable publication and traceable versions.

**Paths:** `shared/assetWorkflowContracts.js`; `server/assetWorkflows/definitionRepository.js`, `definitionService.js`, `catalog.js`, fixtures and tests; `server/routes/assetWorkflows.js`; new migration; `src/studio/admin/AssetWorkflowScaffold.jsx`.

**API contract:**

- `GET /api/v1/admin/asset-workflows` and `/:id`: accessible definitions and current draft.
- `POST /api/v1/admin/asset-workflows`: create a supported recipe family.
- `PUT /api/v1/admin/asset-workflows/:id/draft`: graph plus expected draft revision.
- `POST /api/v1/admin/asset-workflows/:id/validate`: structured node/binding errors.
- `POST /api/v1/admin/asset-workflows/:id/simulations`: deterministic isolated evaluation against an explicit draft hash.
- `POST /api/v1/admin/asset-workflows/:id/publish`: expected revision, idempotency key and change note.
- `POST /api/v1/admin/asset-workflows/:id/activate`: select a compatible prior published version for new runs.
- `GET /api/v1/admin/asset-workflows/:id/versions/:versionId/reference`: generated readable workflow reference.

- [ ] Add mutable draft/revision fields to `asset_workflows` and immutable publication records to `asset_workflow_versions`. Enforce version/pointer ownership.
- [ ] Define registered capabilities and structured input/output/condition contracts. Keep layout coordinates out of execution semantics.
- [ ] Reject dangling edges, unreachable required outputs, incompatible inputs, unsupported capabilities, unrestricted conditions and unsupported cycles/parallel joins.
- [ ] Publish atomically after validation; repeated publication keys cannot create duplicate versions. Reject stale draft updates.
- [ ] Connect React Flow and node inspector to these APIs; edits survive reload. Keep client graph state subordinate to server revisions.
- [ ] Generate documentation from the exact published graph; show supported capabilities and meaningful errors.
- [ ] Test concurrent edits/publications, cross-definition pointer injection, exact draft simulation, immutable versions, activation rollback and unchanged graph semantics after node movement.

**Gate:** Admin edits a question policy, reloads, simulates it and publishes v2; v1 remains intact and addressable.

## Stage 4 — Durable execution and human interaction

**Outcome:** One small workflow runs independently of the browser and survives interruptions.

**Paths:** New migration(s); `server/assetWorkflows/runRepository.js`, `runService.js`, `jobRepository.js`, `worker.js`, `executor.js`, `interactionService.js`, and tests; `server/repositories/humanTaskRepository.js`; `server/routes/assetRuns.js`; a separately runnable worker entry point and package script.

**API contract:**

- `POST /api/v1/asset-runs`: project/document, workflow selection, input and idempotency key; return a persisted run promptly.
- `GET /api/v1/asset-runs/:id` and `/:id/events`: authorized snapshot/history.
- `PATCH /api/v1/asset-runs/:id/input`: expected revision and input changes; invalidate affected outputs/questions.
- `POST /api/v1/tasks/:id/answer`: expected revision, answer and idempotency key; works for an eligible end user, not only admins.
- `POST /api/v1/asset-runs/:id/cancel`, `/:id/retry`, `/:id/reconcile`: named actions with distinct semantics and permissions. Unknown external work cannot enter generic retry.

- [ ] Persist runs, attempts, scheduling jobs, human tasks and append-only events. Use actual project/document ownership and pinned workflow/design context.
- [ ] Begin with a synthetic input → condition → optional clarification → validated output workflow. No provider dependency in the recovery harness.
- [ ] Claim due work with leases and fencing. Commit transitions/results plus next scheduling intent atomically; no external work inside a long SQL transaction. Check the target document revision before adopting results and reconcile orphaned staged uploads.
- [ ] Separate queue redelivery from a new execution attempt. Save operation identity; reconcile pending/unknown submissions without resubmitting.
- [ ] Make task creation/pause and answer/resume atomic. Validate recipient eligibility, stored answer schema and input revision.
- [ ] Support sequential execution and conditional branches. Different runs may execute concurrently. Define bounded failure/repair policy.
- [ ] Add context resolution using published brand/template records; check access and compatibility, retain source provenance and recorded outcome requirements.
- [ ] After deterministic recovery passes, adapt one existing supported banner capability through existing generation and campaign services. Keep review/delivery gates authoritative.

**Required behavioral checks:** Two workers race for one job; worker restarts after claiming; old lease owner returns late; crash occurs between provider dispatch and result persistence; upload succeeds but database attachment fails; question survives restart; duplicate/concurrent answers; answer after input edit/cancel; document changes before result adoption; new publication while a run is paused; unknown provider result; missing capability version. Verify no lost wakeup, unauthorized transition or unintended repeat submission.

**Gate:** A saved answer resumes the pinned workflow exactly once at the application command level, and terminal output references are durable. External provider exactly-once execution is not promised.

## Stage 5 — Admin work queue and operational actions

**Outcome:** Admin can see what is scheduled, what needs a person and why work is blocked.

**Paths:** Extend admin repository/routes; add `server/services/adminTaskService.js` and tests; integrate `personalSettingsService.js` and notification outbox migration; reuse admin UI controls.

**API contract:**

- `GET /api/v1/admin/tasks`: status, assignee, type, project, priority and due-date filters.
- `PATCH /api/v1/admin/tasks/:id/assignment`: assignee and expected revision; enforce task eligibility.
- `POST /api/v1/admin/tasks/:id/complete`: manual-task completion or domain-specific review command; not an approval bypass.
- `POST /api/v1/admin/tasks/:id/cancel`: explicit run consequence where blocking.
- Extend `GET /api/v1/admin/jobs` with namespaced workflow work items and native statuses.
- Run retry/reconcile/cancel actions reuse Stage 4 command services with explicit administrative authorization.

- [ ] Present separate Human tasks and System work tabs, plus project/run/attempt drill-down.
- [ ] Bind review tasks to exact versions/plan hashes; delegate completion to existing review services and synchronize task disposition.
- [ ] Derive legacy review requests from current domain state. Backfill only known actionable tasks with an owner and dedupe key; pending jobs alone do not justify tasks.
- [ ] Add workflow outbox event types and transactional enqueue for new task events. Notification failure must not undo a committed answer or create another task.
- [ ] Audit assignments/publications/recovery actions with compatible fields; retain run status transitions in workflow events.
- [ ] Test assignment without authority, duplicate completion, invalidated review, independent approver constraints, notification redelivery and an unknown job's permitted actions.
- [ ] Verify actual admin browser routes and stable section anchors. Reuse shared design-system tables/forms, canvas library and inspector.

**Gate:** An admin can explain every paused/failed example, assign eligible work and perform only the actions the backend allows.

## Stage 6 — Additional formats and operational release

**Outcome:** The shared foundation supports separate asset workflows with real validated outputs.

**Paths:** Reconcile the earlier presentation, format and operations plans before implementation; use format modules behind registered capability contracts. Document ownership, migrations and recovery in `docs/admin-backend.md`.

- [ ] Implement generic provider dispatch accounting for non-campaign operations; do not remove the campaign constraint casually or fabricate campaigns.
- [ ] Prove presentation content schema, editable export and preview validation; attach immutable document versions and rendition files.
- [ ] Add website and reusable-template capabilities separately. Website preview/export and deployment are different authorized outcomes.
- [ ] Establish retention/archive/deletion behavior for linked runs, tasks, snapshots and objects; retain required review history and protect shared files.
- [ ] Release API/worker with compatible capability versions; provide worker drain, lease recovery, migration/backfill dry-run and rollback procedures.
- [ ] Observe queue age, failed/unknown work, task age, latency and cost. Add a broker, cache or materialized reporting view only when measured needs justify it.
- [ ] Run the relevant application server/UI suites, production build and release checks against isolated fixtures. Do not run Observatory's integration harness as evidence for application workflow correctness.

**Gate:** Each enabled format produces the promised output and remains inspectable after restart. A configured workflow without its renderer is not a completed format.

## Verification commands and evidence

Current application commands, verified in package.json:

- Existing compatibility: `npm run test:run -- server/services/workflowService.test.js shared/workflowRules.test.js server/routes/routes.test.js`.
- Provider/design integration when touched: `npm run test:run -- server/services/generationService.test.js server/services/brandDesignSystemService.test.js server/services/templateBrandService.test.js server/services/personalSettingsService.test.js`.
- Add and run focused tests in each new module above, using the existing isolated fixture approach and PostgreSQL-backed checks for locking/constraints.
- UI integration: relevant `src/studio/` tests and `npm run build`; release checks as defined in the current application scripts.
- For documentation changes alone: verify cited source paths, cross-links and consistency between model, API, implementation stages and acceptance gates. No product test result follows from a documentation review.

Use synthetic data and explicit mock providers for repeatable tests. Report test/build results only after actually running them. No implementation tests or production-readiness checks were run while preparing this roadmap.
