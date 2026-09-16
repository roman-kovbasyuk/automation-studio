# Canonical workflow cutover inventory

Updated 15 September 2026 after the first implementation slice.

The board-aligned boundary is Home → Brief analysis → campaign questions and
confirmation → Copy → Visuals → Banners → verified Figma creation. Approval,
export and distribution redesign remain deferred.

| Area | Retired behavior | Current treatment | Verification |
| --- | --- | --- | --- |
| Banner creation | Client marker selected between old and source-backed creation | Enabled banner creation is initialized by the server with briefing schema v2; the marker is only a compatibility hint | `server/services/workflowService.test.js` |
| Brief analysis | Analysis was followed by automatic copy and visual-draft requests | Coordinator stops after analysis until the saved briefing is confirmed | `src/studio/campaign/workflowCoordinator.test.js` |
| Downstream generation | Missing/invalid briefing confirmation could pass through | Canonical v2 records require a persisted, current confirmation before copy, visual or image work | `server/services/briefingService.test.js`, `server/services/briefingConfirmation.integration.test.js` |
| Existing editable campaigns | No durable cutover boundary | Explicit offline migration initializes v2, preserves raw content/jobs/artifacts and records a receipt; it never creates confirmations or jobs | `server/workflows/canonicalMigration.integration.test.js` |
| Pending/approval history | Could be mutated by a broad conversion | Migration reports `generation_in_flight`, `approval_scope_deferred`, or `sealed_history` and leaves those records untouched | `server/workflows/canonicalMigration.js` |
| Figma handoff | Existing durable handoff/import services | Protected for the next implementation slice; approval behavior is not changed here | Figma service integration tests |

## Protected active dependencies

The review/version, delivery, authentication, spending-control, idempotency,
source-integrity and Figma receipt services remain active dependencies. The
visible Review module is an internal projection consumed by Banners, not a new
approval design.

## Known follow-up

The application checkout contains substantial pre-existing worktree changes.
The remaining old test fixtures still construct non-v2 campaigns directly; the
canonical migration test uses SQL fixtures so it cannot preserve the retired
creation API as a production escape hatch. Those fixtures must be migrated or
retired before claiming a green full-suite cutover.
