# Phase preparation implementation plan

> **For agentic workers:** Use the subagent-driven-development workflow for bounded fixes and requesting-code-review for independent review. Steps use checkbox syntax for tracking.

**Status:** Complete · **Updated:** 20 September 2026

**Goal:** Establish a reviewed, verified baseline by fixing the three confirmed briefing regressions, removing unreachable code and obsolete documentation, and defining the next development milestone.

**Architecture:** Preserve the working campaign APIs, immutable versions, server authorization, template renderer and separate Brutalist workspace. Repair draft identity and supplied-copy retention at their owning boundaries. Keep backward-compatible reads separate from new-input policy.

**Tech stack:** React, Fastify, PostgreSQL, Zod, Vitest, Vite and VitePress.

**Spec:** [Brief review](../specs/brief-review.md), [front-end contract](../../FRONTEND.md), [decision log](../product/decisions.md), and the owner's 20 September cleanup request.

## Global constraints

- No implicit AI work. No live paid generation for verification.
- The server is authoritative for permissions, revisions, versions and completion.
- Use isolated test schemas in `banner_studio_test`; never mutate the demo database.
- Preserve existing campaign data, migration history, public package exports and live routes.
- Remove code only with entry-point/reference evidence. Tests alone do not make obsolete production code live.
- Remove superseded Markdown from the working tree when a current replacement exists; Git history is the recovery source, as requested by the owner on 20 September.
- Do not implement M1–M3 features in this cleanup. Produce a concrete next-phase plan.

## Task 1: Fix confirmed briefing regressions

**Files:** `src/studio/campaign/modules/brief/BriefReview.jsx`, `BriefModule.jsx` and their tests; `server/services/briefingService.js` and confirmation integration tests; `shared/briefingContracts.js`, age helpers and compatibility tests as required.

**Interfaces:** Keep existing named command contracts. A draft captures its input key at edit start. Retained supplied copy must satisfy the existing version-service lineage checks. New confirmed inputs must not target under-18 users, but old records must remain readable without silently changing their audience or confirmation hashes.

- [x] Add regression tests to the owning test files, reusing existing fixtures without copying suites.
- [x] Prove that an unfinished Summary/Audience edit plus a remote refresh retains its original input key and navigation dirty guard.
- [x] Prove that `keep_and_create`, initial generation, changed goal, confirmation and replacement generation retain the supplied copy as selectable; preserve edits/deletions and verify lineage.
- [x] Prove that a workspace with a formerly valid `under_18` answer is readable, while a new confirmation rejects that value with an actionable validation result.
- [x] Implement fixes at the owning boundaries; verify dirty state during failed/in-flight saves, original copy history, and legacy validation.
- [x] Run focused component, schema, service and chain tests. Record exact commands and results.
- [x] Review and commit the fixes independently from deletions.

## Task 2: Remove verified obsolete code and documentation

**Files:** Exact deletion list comes from the reference audit; update affected imports, tests, build configuration, package manifests and owning documentation together.

**Interfaces:** App, prototype, Figma plugin, CLI scripts, docs build and public package exports are independent roots. A module used by any of them is live. Existing database migrations remain immutable.

- [x] Map all runtime/build/test roots and inspect unreferenced source files and no-op compatibility entry points.
- [x] Record each removed file family and its replacement or reason in the cleanup report.
- [x] Remove obsolete source and tests that solely exercise removed orphan code; retain regression coverage of live consumers.
- [x] Remove superseded archived task reports/specifications with current replacements; repair references rather than suppressing broken-link checks.
- [x] Update current architecture, local setup, known issues and agent guidance to reflect actual retained code.
- [x] Run the full test suite, design-system boundary check, application/docs build, package verification and isolated workflow. Investigate failures before changing expectations.

## Task 3: Review the baseline and prepare development

**Files:** `docs/engineering/phase-preparation-review.md`, `docs/plans/2026-09-20-m1-brand-input.md`, `docs/product/roadmap.md` and docs navigation.

**Interfaces:** The next milestone extends the accepted brand, template and migration specifications. It must leave legacy projects operational and cannot replace the review gate before the Assets-stage milestone.

- [x] Independently review the resulting branch, including data compatibility and all removed entry points.
- [x] Resolve actionable findings; record remaining architectural gaps as planned work.
- [x] Write ordered M1 tasks with exact files, interfaces, migration/rollback policy, failure cases and executable acceptance checks.
- [x] Publish local evidence distinguishing unit/integration/browser/build checks from live AI/deployment.
- [x] Leave a reviewable branch and handoff; no deployment or shared-branch push is part of this task.

Verification results and blocked optional checks are recorded in the [preparation review](../engineering/phase-preparation-review.md). The next implementation milestone is the proposed [M1 plan](2026-09-20-m1-brand-input.md).
