# Delivery stages

**Status:** V1 delivers Stage 1 and Stage 3; remaining stages are planned. **Updated:** 10 September 2026.

V1 provides visibility into the existing system and a working recipe-authoring lifecycle. Authoring is useful before shared document identities and live execution, so Stage 3 is delivered before Stage 2. The next runtime milestone is one recoverable execution, including a persisted human question and a verified output.

## Stage 1 · Admin visibility — v1

Build read-only Users, campaign-backed Projects, Assets and activity views. Show existing provider job states explicitly. Include separate brand-file sources where “all assets” is promised.

**Exit check:** authorized admins can find records and navigate relationships; counts and filters are correct; credential fields are absent.

## Stage 2 · Shared identities

Introduce general projects, typed documents and version references before enabling non-campaign workflows. Preserve campaign IDs, review history and APIs through an adapter.

**Exit check:** existing campaigns retain their behavior and history; a project can contain multiple document types without fabricated campaign records.

## Stage 3 · Workflow authoring — v1

Persist drafts and node settings; validate graph/input contracts; simulate with synthetic inputs; publish immutable versions; generate documentation from the published definition.

Connect these capabilities to the existing React Flow canvas and inspector.

The implemented simulator uses fixture inputs and explicit AI/render outputs. It is not a provider, a renderer or a durable run. Structured references come from immutable published definitions.

**Exit check:** edits survive reload; a changed clarification policy is testable; publication v2 leaves v1 intact.

## Stage 4 · One durable execution

Add runs, node attempts, scheduling, saved questions, a worker and recovery. Start with deterministic capabilities, then adapt one existing supported banner operation.

**Exit check:** a question survives restart; an authorized answer resumes the pinned version; duplicate commands and stale workers cannot corrupt results or submit unintended repeat provider work.

## Stage 5 · Admin operations

Add the Work queue, assignment, task responses, run inspection, permitted recovery actions and notifications. Review tasks use existing approval services and exact version references.

**Exit check:** an admin can explain paused/failed work, find its owner, and perform the allowed action. Unknown external jobs are reconciled rather than blindly retried.

## Stage 6 · Additional formats and release

Implement presentation output and validate its editable export and previews, then add website and template-authoring capabilities against their own contracts. Complete deployment, retention, backup/restore and operational checks.

**Exit check:** every enabled format produces its promised files and remains traceable after a restart. A visible workflow alone does not enable a format.

## Initial complexity boundary

- One backend codebase and PostgreSQL database.
- Separate API and worker processes.
- Sequential execution within a run, with conditional branches.
- One durable PostgreSQL scheduling mechanism.
- Existing provider reliability and review rules retained.

General parallel joins, arbitrary graph loops, a separate message broker and reporting projections require demonstrated need. This sequence does not change the six visible campaign modules.

## Verification beyond the happy path

Test concurrent workers, expired ownership, duplicate answers, input edits during a pause, publication changes mid-run, a crash after external submission, file upload without database attachment, cancellation and document edits before output adoption.

Report unit/integration checks, browser checks, paid-provider verification and load measurements separately. Synthetic fixtures establish repeatability; they do not certify production services.

## Documentation and planning sources

The detailed backend design and staged implementation roadmap are preserved under `docs/superpowers/specs/2026-09-08-admin-backend-foundation-design.md` and `docs/superpowers/plans/2026-09-08-admin-backend-foundation.md` in the application repository.

Earlier asset-workflow assessment/runtime/presentation/format/operations plans were written in the project planning checkout. Reconcile their older table names, workspace assumptions and loop scope with the [current data proposal](/decisions/admin-data) before implementation. Do not create two workflow subsystems from two plan revisions.
