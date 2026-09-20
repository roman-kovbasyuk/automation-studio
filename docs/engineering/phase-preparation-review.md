# Phase preparation review

**Status:** Current · **Updated:** 20 September 2026

Reviewed baseline `7cd1446d0d3d54072c56fbb99eaa67e1b1dd5dfb` from `origin/main`. Implementation is isolated on `codex/phase-prep`. Scope covers application/server/shared code, rendering and provenance, prototype and plugin entry points, scripts, CI, package boundaries and current documentation. This is an evidence-based cleanup, not a claim that future product architecture is implemented.

## Review findings and remedies

| Priority | Finding | Remedy |
| --- | --- | --- |
| P1 | Unfinished Summary/Audience edits were not marked dirty and could be saved against a refreshed input identity | Capture identity at edit start; retain dirty/navigation guards through saves; resynchronize cancelled edits with the matching remote answers/key |
| P2 | Reconfirming a changed brief after `keep_and_create` could hide retained supplied copy | Reconcile the existing imported copy while preserving edits/deletions and validating current lineage |
| P2 | Removing `under_18` from the shared stored-data schema made old projects unreadable | Compatible historical reads; show the legacy value honestly, require an adult range for new confirmation, and validate the corrected path through generation and immutable output lineage |
| P1, caught during cleanup review | Dependency removal caused npm to drop unrelated optional-peer lock records, breaking clean installation | Restore the baseline lock and remove only the unused dependency entry; validate `npm ci` consistency |

Independent review also reproduced the cancel/re-edit conflict and traced legacy proposals through generation and output provenance; regression tests cover those recovery paths. The three briefing remedies are validated in their owning component, schema and integration suites. The briefing fixes are in commit `e59860d`; verification details and limits are below.

## Removed code and material

- Replaced the orphan Novartis gallery with its live `TemplatePreview` component and catalog metadata. Removed gallery-only tests/CSS; retained live previews and dynamically addressed Novartis assets.
- Removed unused compatibility wrappers, `NextButton`, test-only campaign-start/route helpers, no-op generation-resume hooks, an unused fixture helper, an unused integration schema and an obsolete recovery marker. Updated safety tests to exercise real refresh/subscription behavior.
- Removed the obsolete brief verification script whose expected workflow predates explicit generation; removed unused `tw-animate-css` without dependency upgrades.
- Removed 14 unreferenced public assets (644,029 bytes), 132 superseded Markdown files and their 26 diagram sources/renders, including archive/task reports and stale `.impeccable` surface notes. Current specs, documentation, licenses, asset provenance and all database migrations remain.
- Removed broken historical links and updated architecture, workflow ownership, design-system guidance, roadmap and setup instructions. Git history is the recovery source under D40.
- Corrected CI triggers from `v3` to `main` and added the full suite plus isolated workflow with PostgreSQL and ffmpeg. Existing package and build checks remain.

Deletion evidence included imports, re-exports, runtime strings, asset catalogs, prototype routes, Figma/build/script entry points and public package exports. Lack of a production import alone was not enough to delete subprocess roots or supported package APIs.

## Retained architecture and criticism

The implementation has useful boundaries: authoritative server commands, revision conflicts, durable generation snapshots, immutable review/delivery versions and a separate design-system package. Cleanup should preserve those guarantees.

The next bottleneck is brand identity across the pipeline. Brand publication currently generates global template versions; projects have no brand pin, prompts lack brand guidance and fonts are limited to bundled Inter/Arimo. Adding more screens before fixing these contracts would spread the same coupling into more places. [M1](../plans/2026-09-20-m1-brand-input.md) therefore starts with compatible snapshots, verified fonts and pure template resolution, then adds project pins and durable prompt context.

The recipe editor, video integration, prototype, legacy review flow, deck foundations and public design-system exports remain reachable or explicitly supported. They are not dead modules. Product deprecation needs a scoped migration/replacement; deleting them during hygiene work would change supported behavior.

The full test suite now belongs in CI, including database-backed workflow checks. Package verification separately tests the published tarball in an independent consumer; application tests cannot substitute for that boundary. Bundle-size warnings remain a performance follow-up, and historical dependency audit numbers are not a current security assessment. An optional production npm audit was blocked by automatic approval review because it sends dependency metadata to an external advisory service; no advisory request was executed. It requires the owner’s specific approval.

## Verification evidence

- Baseline full suite: 216 files passed, one skipped; 1,804 tests passed, one skipped.
- Cleanup-focused checks: eight files, 68 tests passed; design-system boundary check passed.
- Full Brutalist verification passed, including source checks, tests, types, build, documented examples and independent packed consumer (67 components, browser and SSR builds).
- Corrected lockfile: offline `npm ci --dry-run --ignore-scripts` passed. The review reproduced failure before the correction and baseline success with the same npm version.
- Application and documentation production build passed, including VitePress broken-link checks. Figma plugin build passed. Static production verification passed for SPA/docs artifacts and the two-stage, non-root container configuration; no container image was built or deployed.
- Isolated mock workflow passed through delivery: four generation jobs, one verified PNG and a 40,833-byte ZIP on the final run. Authorization, stale revisions, idempotent generation/delivery, review gates and archive checksum assertions passed; the harness removed its test schema/assets.
- Browser visual/responsive checks could not run: the browser tool could not verify the admin-enforced security policy and denied localhost access. No workaround was attempted. Component interaction tests do not replace that manual visual gate.
- Briefing-focused checks passed: seven UI/schema files with 78 tests, six service files with 15 tests, and the final affected five files with 17 tests. The historical case reaches rendered version creation and verifies the old proposal remains in the immutable plan.
- Independent cleanup/code review and the scoped correction review both pass with no outstanding actionable introduced findings. The M1 plan passes a separate architecture/specification review.
- Final full suite: `npm run test:run -- --maxWorkers=4` passed on the completed source: 215 files passed, one skipped; **1,812 tests passed, one skipped**, 147.60 seconds. Removed gallery-only tests account for the reduced file count; new regressions live in owning suites.
- A relative-link scan of all retained tracked/new Markdown files found no unresolved local file links. `git diff --check` passed.

No live paid AI, demo-data migration, remote deployment or shared-branch push is included. Local tools use Node 25; CI/container use Node 22, whose remote run remains unobserved.
