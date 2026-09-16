# Migration from campaigns to asset creation flows

**Status:** Target (draft for owner review) · **Updated:** 17 September 2026 · **Requirements:** FLOW-*, RCP-4, NFR-1, NFR-3 · **Decisions:** D1, D6, D8

How the current banner-only campaign implementation becomes the recipe-driven asset creation flow without losing data or breaking the working parts.

## Principles

1. **Additive database changes.** New columns and tables; no destructive rewrite of existing records.
2. **Keep identifiers.** Campaign IDs become flow IDs; URLs and API routes are aliased before they are renamed.
3. **Legacy work finishes under its own rules.** Campaigns already in the old review gate complete it; new flows never enter it.
4. **One code path per flow type.** A flow either has a pinned recipe (new) or not (legacy); the server decides behaviour from that, not from the client.
5. **Precedent:** the offline canonical briefing migration (`server/workflows/canonicalMigration.js`, migration 053) with dry runs, per-record receipts and deferred categories.

## What exists

| Area | Today |
| --- | --- |
| Record | `campaigns`: `title`, `brief`, `status`, `revision`, `selected_copy_id`, `selected_direction_id`, `composition_id`, `current_version_number`, `open_version_id`, `project_type`, timestamps, `archived_at` |
| Statuses | `draft`, `copy_ready`, `direction_selected`, `composed`, `in_review`, `changes_requested`, `ready`, `approved`, `delivered` (`shared/workflowRules.js`) |
| Stages | Six modules in `src/studio/campaign/modules/` coordinated by `workflowCoordinator.js` |
| Review | `campaign_versions`, `review_events`, `review_version_builds`, `figma_handoffs`, `figma_plugin_sessions`, `figma_submissions`, `figma_review_bindings` |
| Delivery | `deliveries`, `delivery_builds` |
| Asset type | `project_type`; migration 046 assigned **random** types to existing campaigns, so non-banner values on old records do not describe their content |

## Data migration

### New schema (additive)

| Change | Details |
| --- | --- |
| `campaigns.asset_type` | `banners` or `presentations`; nullable during backfill |
| `campaigns.recipe_hash` | Nullable; `NULL` marks a legacy flow |
| `campaigns.brand_version_id` | Nullable for legacy flows |
| `campaigns.stage_states` | JSONB, server-computed cache |
| `recipe_versions` | `hash` (PK), `recipe_id`, `version`, `definition`, `created_at` |
| `outputs` | Output revisions (see [domain model](domain-model.md#output)); legacy compositions are not converted |
| `output_check_results`, `output_ai_reviews` | Per output revision |
| `output_acceptances` | Output revision, user, time |
| `escalations`, `escalation_outputs` | See [quality and escalation](quality-and-escalation.md#record) |
| `packages` | Or extend `deliveries` with `output` references |
| `generation_jobs` | Allow `unknown` resolution: `resolved_by`, `resolved_at`, `resolution` |

### Backfill

| Existing record | Result |
| --- | --- |
| Any campaign | `asset_type = banners` (content is always banners, whatever `project_type` says); `recipe_hash = NULL` (legacy) |
| `project_type` | Kept for display history only; no longer drives behaviour |
| Unresolved `unknown` jobs | Listed in the migration receipt; offered **Mark as failed** in the interface after deployment |

### Legacy flows by status

| Status | Treatment |
| --- | --- |
| `draft`, `copy_ready`, `direction_selected`, `composed` | Stay legacy and editable with the current modules until **Convert to recipe flow** (below) |
| `in_review`, `changes_requested`, `ready` | Finish under the old review rules; cannot convert until approved or reopened |
| `approved`, `delivered` | Sealed history; read-only |

### Converting a legacy flow

An explicit, per-flow action available to requesters and admins for legacy flows in editable statuses:

1. Requires an automation-ready brand; the user chooses it; its version is pinned.
2. Pins the current `banner-set` recipe.
3. Keeps brief sources, confirmation, copy and visuals; recomputes stage states.
4. Does not convert compositions or versions; the Assets stage starts empty and offers **Compose**.
5. Records `flow.converted` with the before and after state.

There is no automatic bulk conversion.

## Application changes

| Step | Change | Keeps working |
| --- | --- | --- |
| 1 | Fix `unknown` job handling and flow creation (M0) | Legacy flows |
| 2 | Recipe loader, `recipe_versions`, pinning on new flows; recipes validated at startup | Legacy flows untouched |
| 3 | Four-stage flow page for recipe flows; Brief, Copy and Visuals reuse the current module views and commands | Legacy flows keep the six-module page |
| 4 | Assets stage replaces Banners, Review and Distribute for recipe flows: compose, checks, repair, acceptance, escalation, package | Legacy review and delivery services stay for legacy flows |
| 5 | Stage sequencing reads the pinned recipe; `workflowCoordinator.js` sequencing is used only for legacy flows | — |
| 6 | Deck recipe (M3) on the same page | — |
| 7 | When no legacy flow remains in review, hide the six-module page for new work; keep it read-only for history | Sealed history |

### Routes and API

| Now | Target | Transition |
| --- | --- | --- |
| `/mvp/campaign/:id?module=` | `/flows/:id/:stage` | New route added; old route redirects, mapping `banners`, `review` and `distribute` to `assets` |
| `/api/v1/campaigns/...` | `/api/v1/flows/...` | New routes share services; old routes remain for legacy clients until removed in a later release |

### Admin

- The recipe node editor and `asset_workflow*` records are frozen: read-only for admins, hidden from others (RCP-4).
- Admin views show flows with recipe, brand version and legacy markers.

## Test strategy

- Fix or retire the 16 failing historical migration fixtures before the migration work, so the suite is green.
- **Migration tests** on SQL fixtures for every legacy status: backfill values, receipts, no changes to sealed records.
- **Conversion tests:** editable legacy flow converts; flows in review refuse; version pinning recorded.
- **Dual-path tests:** a legacy flow and a recipe flow run side by side through their own stages without affecting each other.
- **Route tests:** every old URL redirects to the right stage.

## Rollback

- New columns and tables are ignored by the legacy path, so the previous application version runs against the migrated database.
- Recipe flows created after deployment are not usable by the previous version; they are listed in the deployment receipt.

## Acceptance

- After migration, every existing campaign opens exactly as before, and its receipt lists its category.
- A new banner-set flow runs through four stages with a pinned recipe and brand version, while a legacy flow in review completes its old review.
- Converting an editable legacy flow keeps its brief, copy and visuals.
- No `unknown` job remains without a resolution action in the interface.
