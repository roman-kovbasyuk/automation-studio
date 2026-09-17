# M0 Stabilise — implementation plan

**Status:** In progress (T1 done) · **Date:** 17 September 2026 · **Milestone:** M0 in the [roadmap](../product/roadmap.md) · **Decisions:** D31–D38

## Goal

Make the existing codebase a safe base for the proof of concept before any recipe, project page or deck work starts.

**Exit check:** no generation job can leave a project unusable; a project opens immediately after creation; the full test suite is green; unreachable code and legacy product naming are gone; `npm run design-system:check`, `npm run build` and `node scripts/verify-build.mjs` pass.

## Scope

**In scope:** the issues marked *before build* in [known issues](../engineering/known-issues.md): generation job outcomes, project creation, failing tests, unreachable code, orphaned files, product naming in code, dependency audit review.

**Out of scope:** recipes, the new project page shell, the Assets stage, route or table renames (`/projects`, `campaigns`), brand guidance, deck work, design-system track items (they run in parallel).

## Working rules

- Branch `feat/m0-stabilise` in its own worktree; one commit per task.
- Behaviour changes start with a failing test.
- Tests and manual checks use mock providers, `npm run dev:prototype` or the isolated launchers in `scripts/testing/`. Never the demo database.
- Each task ends with its verification commands passing; the final task runs everything.
- One pull request into `v3` when all tasks pass (D35).

## Tasks

### T1 — Green baseline

The suite is further from green than earlier documents stated (they reported 16 failures). The [baseline run](#baseline-test-run) found **84 failing tests in 22 files**. They fall into five groups; fix them in this order because later groups depend on the shared helpers from earlier ones.

| Group | Symptom | Tests | Fix |
| --- | --- | --- | --- |
| A. Canonical briefing cutover | *Review and confirm the campaign questions before generating.* or a different error code expected | ~40 in `copyEditing`, `copyOptions`, `repositories`, `visuals`, `bannerBatch`, `briefFlow`, `copyRetention`, `figmaHandoffService`, `videoGenerationService`, `visualUploadService`, `visualsVersion` | Add one shared test helper that creates a campaign with a confirmed v2 briefing (sources, analysis, confirmation) using mock providers; use it wherever a test generates copy, visuals or video. Update expected error codes where the confirmation gate now runs first |
| B. Briefing capability disabled in test runtimes | *The new briefing flow is not enabled yet.* | 10 in `campaignRuntimeFlow`, `ConnectedStudio.review`, `start-isolated-studio`, `demo-spending-safety` | Enable source briefing with the mock provider in `server/testing/isolatedStudio.js` and the HTTP test runtimes |
| C. Historical migration fixtures | *column "project_type" of relation "campaigns" does not exist*; migration runner stack-trace errors | ~15 in `repositories.integration.test.js` | Rewrite upgrade tests for migrations 013–020 with SQL fixtures at their original schema (as the canonical migration test does), or retire those whose starting data cannot exist in any environment; fix the migration runner tests' expected migration list |
| D. Concurrency and pool timing | Recovery-bound assertions; *Cannot read properties of undefined (reading 'release')* | 4 in `repositories.integration.test.js` | Investigate individually; run the file three times to separate real defects from flakiness |
| E. Outdated interface tests | Elements not found after the templates and campaign interface changes; removed coordinator action | 17 in `BannerTemplateEditor`, `StudioApp`, `AtomicContracts`, `admin`, `campaignChain`, `briefingApiFlow`, `PresentationLibrary` | Update to the current interface; `PresentationLibrary` tests are deleted with the unreachable component in T2 |

Run tests from a checkout with its own `node_modules` (run `npm install` in the worktree): with `node_modules` outside the project root, Vite's file access rules make `exportAnimation.test.js` fail spuriously.

**Verify:** `npm run test:run` passes with zero failures, three consecutive times for `repositories.integration.test.js`.

**Result (17 September 2026):** 1,868 passed, 1 skipped, 0 failed; `repositories.integration.test.js` passed three consecutive runs. What changed:

- The four group D failures were the confirmation gate, not timing. A shared fixture (`server/testing/briefingFixtures.js`) analyses and confirms briefs with the mock provider, or seeds a confirmed briefing for control-plane tests.
- The isolated studio and launcher enable the briefing flow; runtime and interface tests confirm the brief before copy.
- Twelve rolling-upgrade tests that ran current services on schemas 012–020 were retired: those services need tables from migration 051, and every database is past 053. Historical tests that do not need current services were kept.
- `PresentationLibrary` was removed early (only its own test used it).
- A partial `AnimatedBanner` mock fixes the unhandled error reported in every run.

### T2 — Remove unreachable frontend code

Delete the modules listed in the [adoption audit](../design-system/adoption-audit.md#unreachable-code) with the tests that cover only them.

| Delete | Notes |
| --- | --- |
| `src/mvp/**`, `src/domain/**`, `src/data/**`, `src/hooks/**`, `src/lib/**`, `src/components/ui/**` | Includes 12 test files that cover only these modules |
| `src/components/{AppShell,AssetWorkspace,BannerPreview,BannerWorkspace,CopyWorkspace,CostDialog,ProcessingScreen,ReviewWorkspace,StepRail,TemplateCard,VisualArtwork}.jsx` | With their tests |
| `src/screens/{DashboardScreen,DesignerReviewScreen,TemplatesScreen,WorkflowScreen}.jsx` | `ApplicationDesignSystemPage.jsx` stays |
| `src/studio/{BannerStage,BrandDesignSystems,CampaignOverview,CampaignTimeline,CopyStage,PresentationLibrary,ReviewStage,VisualStage}.jsx`, `src/studio/exportAnimation.js`, `src/studio/admin/AssetWorkflowScaffold.jsx` | With their tests |
| `src/studio/campaign/modules/brief/BriefingClarificationWizard.jsx`, `src/studio/campaign/modules/copy/CopyManualEntryView.jsx` | With their tests |
| Unused design-system files: flat `AppButton.jsx`, `PillTabs.jsx`, `PromptComposer.jsx`, `WorkflowSteps.jsx`; `atoms/{Switch,TextAction,TokenChip,TokenCopyTarget,UpdatedText}.jsx`; `molecules/{FactGrid,PillTabs,SelectionTile}.jsx`; `organisms/{MediaWorkflowCard,SettingsPanel}.jsx` and their CSS | Check each against design-system catalog imports first |
| `src/styles/shadcn.css`, `components.json` | Only imported by `src/mvp` |
| Dependencies `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss`, `@tailwindcss/vite` and the Tailwind plugin in `vite.config.js` | Brutalist keeps its own `radix-ui` dependency |
| `.impeccable/surfaces/src-mvp-mvpapp-jsx.md` | Design tool record for deleted code |
| `src/studio/BannerTemplateEditor.jsx`, `banner-template-editor.css`, `BannerTemplateEditor.test.jsx`, `BannerTemplateEditor.interaction.test.jsx`; the `?banner=` editor branch in `TemplateLibrary.jsx` and its catalog test; the ignored `onCreateCampaign` prop passed by `StudioApp.jsx` | Cannot be opened in the application (D38). Archive `docs/engineering/templates/banner-template-editor.md` |
| The **Review campaign questions** branch in `src/studio/campaign/modules/brief/BriefModule.jsx` | The coordinator no longer provides `startReview` |

**Done in T1:** `src/studio/PresentationLibrary.jsx`, its test and `presentation-templates.css`.

**Keep:** `src/studio/campaign/testing/workspaceFixtures.js` — a test helper used by 30 live test files.

**Review individually** (tests mixing live and deleted code): `AtomicContracts.test.jsx`, `ExternalComposition.test.jsx`, `CampaignLayout.test.jsx`. Keep their live assertions; drop assertions about deleted modules.

**Update:** the `test:design-system` script in `package.json` (it names `AppButton.test.jsx`).

**Verify:** `npm run test:run`, `npm run design-system:check`, `npm run build`; repeat the reachability script — zero unreachable non-test files.

### T3 — Remove orphaned files and tags

| Change | Reason |
| --- | --- |
| Remove `<script src="http://localhost:8400/live.js…">` and the design-tool comment from `index.html` | Development tooling committed to production HTML |
| Delete `scripts/render-campaign-logic.mjs` | Reads an archived document; diagrams now come from recipes |
| Delete `.github/workflows/deploy-pages.yml` | Targets a `main` branch that does not exist; docs are served by the application (D32) |

**Verify:** `npm run build`, `node scripts/verify-build.mjs`.

### T4 — Generation job outcomes (server)

Implements the change in [domain model](../specs/domain-model.md#generation-job).

1. **Classify errors in `server/services/generationService.js`:**

   | Error | Status | Reason |
   | --- | --- | --- |
   | Input or result schema validation (`ZodError`) | `failed` | `invalid_request` / `invalid_output` |
   | Configuration or credential errors raised before the request is sent | `failed` | `provider_configuration` |
   | Provider responses 400, 401, 403, 404 not already classified by the provider | `failed` | `provider_rejected` |
   | Known provider limits (existing `knownProviderError`) | `failed` | unchanged |
   | Timeout after dispatch, aborted, network errors after sending | `unknown` | unchanged |

   Providers mark pre-dispatch failures explicitly (`error.dispatched = false`) so the service does not guess.
2. **Readiness before dispatch:** check `generationReadinessService` before creating a job; when generation is unavailable return `409 generation_unavailable` without creating a job.
3. **Resolve unknown jobs:** new `POST /api/v1/generation-jobs/:jobId/resolve` (requester or admin) marks an `unknown` job `failed` with `resolution: marked_failed` once `timeoutAt` plus **40 seconds** has passed (D33). Migration 054 adds `resolved_by`, `resolved_at`, `resolution`. A provider result arriving after resolution is discarded and its cost recorded. Audit event `generation.marked_failed`.
4. **Video jobs:** apply the same resolution rule to `unknown` video jobs.
5. **Reasons (D33):** the job serializer in `server/repositories/generationJobRepository.js` adds `unknownReason` (image jobs keep the uncertain cause there; video jobs keep it in `errorCode`). A new `generationReasonMessage(job)` in `shared/generationErrors.js`, extending `generationLimitMessage`, maps codes to plain language. Raw codes and provider messages are never shown. A job marked as failed keeps its original reason, shown after *Marked as failed*.

   | Codes | Shown as |
   | --- | --- |
   | `provider_timeout`; video `operation_timeout` | The AI service did not answer within the time limit, so we cannot tell whether it finished. |
   | `provider_call_ambiguous`; video `outcome_unknown` | The connection to the AI service was interrupted after the request was sent, so we cannot tell whether it finished. |
   | `timeout_recovery`, `ownership_recovery_timeout` | The server restarted while waiting for the result. |
   | `asset_object_exists`, `asset_upload_timeout`, `asset_upload_ambiguous`, `asset_readback_failed`, `asset_persistence_declined`, `asset_persistence_timeout`, `asset_persistence_ambiguous` | The result arrived but could not be saved. |
   | `provider_identity_mismatch` | The answer came from a different AI model or account than expected, so it was not used. |
   | `provider_configuration` (new; replaces the pre-dispatch `provider_configuration_missing` and `credential_version_changed`) | Generation is not set up, or its AI connection changed before the request was sent. |
   | `invalid_key` | The saved AI credential was rejected. |
   | `quota_exhausted`, `billing_required`, `rate_limited` | Existing messages |
   | `provider_unavailable` | The AI service is temporarily unavailable. |
   | `provider_rejected` (new) | The AI service rejected the request. |
   | `invalid_request` (new), `invalid_output` | The request or the AI result was not in the expected format. |
   | `provider_blocked` | The AI service blocked this request for safety reasons. |
   | `provider_failed` (video) | The video service reported an error. |
   | `brief_source_changed` | The brief changed during generation, so the result was not used. |
   | `brief_preparation_failed` | The brief could not be prepared for generation. |
   | Any other code | Something unexpected went wrong. The code is logged for support, not shown. |

**Tests:** unit tests for each classification row; integration test: an `unknown` job blocks a copy edit, cannot be resolved until 40 seconds after its timeout, is resolved after that, and the copy edit then succeeds; a late provider result does not revive a resolved job; every code in the reasons table has a message and an unmapped code falls back to the generic one.

**Verify:** `npm run test:run -- server/services/generationService server/repositories/generationJobRepository`, then the full suite.

### T5 — Generation job outcomes (interface)

Replace *Generation unknown. Check its status before trying again.* in `src/studio/campaign/campaignRuntime.js` with the patterns in [UX errors and recovery](../specs/asset-creation-flow-ux.md#errors-and-recovery):

- `failed`: the plain-language reason and **Try again**.
- `blocked`: the safety message and the edit or upload action.
- `unknown`: *Checking whether … was created…* with the reason (D33) while the 40-second wait runs; then *We could not confirm the result* with the reason, **Check again** and **Mark as failed** (calls the resolve endpoint).
- `generation_unavailable`: *Analysis is unavailable: …* with **Check again**; no job is created.
- Failed brief sources in `src/studio/campaign/modules/brief/BriefSourcesView.jsx` show a message instead of the raw `errorCode` (for example `brief_collection_text_too_large`).
- Module errors never show raw exception text (seen: *api.listVideoJobs is not a function* in Visuals with an incomplete API); unexpected errors use the generic message and are logged.

**Tests:** runtime mapping tests; Brief, Copy and Visuals module tests for each state; no request is sent on page load or refresh.

### T6 — AI-first project creation

**AI briefing always on (D37).** Today project creation returns 503 *The new briefing flow is not enabled yet* unless `BRIEFING_ENABLED=true`.

1. Remove `BRIEFING_ENABLED` and the `briefingEnabled` / `sourceBriefing` switches from `server/bootstrap.js`, `scripts/dev-studio.mjs`, `server/services/workflowService.js`, `server/services/generationReadinessService.js`, the test runtimes, `src/studio/useBriefingCapability.js` and `src/studio/StudioApp.jsx`.
2. Production already requires `GENERATION_PROVIDER=gemini`; it now also requires `VERTEX_AI_LOCATION=eu`, the managed connection the briefing needs. Development and tests keep explicit mock providers.
3. Home checks generation readiness before the user starts. When AI is unavailable, the prompt and uploads are disabled with the readiness message, so no project is created that cannot continue.

**Open the project immediately.** Today `create()` in `src/studio/StudioApp.jsx` uploads sources and runs analysis on Home before navigating.

1. Home creates the campaign (no uploads) and navigates to the Brief stage at once.
2. The pending submission (files and text) is handed to `CampaignPage` in memory, using the existing `analyzeOnOpen` mechanism extended with sources.
3. The Brief stage runs `coordinator.brief.submit(patch)`, which already supports the upload stage and analysis, and shows progress and per-file errors there.
4. A reload before uploads finish shows the draft with *Upload interrupted — add your files again*; nothing is re-sent automatically.
5. The new campaign appears in the sidebar immediately; an uncertain creation still checks the list before allowing another attempt.

**Tests:** configuration tests for the production AI requirement; readiness states on Home; `StudioApp` creation test (navigates before analysis completes); `CampaignPage` pending-submission test; reload does not re-dispatch; failed upload stays in Brief with retry.

### T7 — Product naming in code

Rename user-visible names to **Automation Studio**; keep persisted identifiers stable.

| Rename | Keep unchanged (persisted or contractual) |
| --- | --- |
| `index.html` title and description; studio wordmark; launcher; entry error screen; prototype titles; settings text; Figma pairing text; Figma plugin UI title and manifest display name; Dockerfile labels; server log messages; notification prefix; delivery download file name prefix; `package.json` name (`automation-studio`); AI prompt product name | Figma plugin data keys `banner-studio-output`, `banner-studio-version`; delivery digest salt `banner-studio-delivery`; Docker Compose volume `banner-studio-postgres`; prototype IndexedDB name; Firebase app instance names |

Record the kept identifiers in [known issues](../engineering/known-issues.md) as intentional.

**Verify:** tests that assert visible text updated; `npm run build`; Figma plugin build (`npm run build:figma`).

### T8 — Dependency review

| Finding | Action |
| --- | --- |
| `postcss` (high, direct) | Update to ≥ 8.5.28 |
| `lodash-es` (high, via Mermaid/VitePress) and `mermaid` (moderate, direct) | Update Mermaid and dependents where a non-breaking fix exists |
| `vite` inside VitePress (high, no fix) | Development server only; document and revisit on the next VitePress release |
| `firebase-admin` chain (8 moderate, production) | Needs `firebase-admin` 14 (major). Separate follow-up with authentication tests, not in M0 (D34) |
| `package-lock.json` out of sync for npm 11 (`npm ci` fails: missing `@emnapi/core`, `@emnapi/runtime`) | Regenerate the lockfile with the npm version of the Docker image (Node 22) and pin that npm version for development |

**Verify:** `npm audit` shows no high findings outside the documented development-only item; full suite and build pass.

### T9 — Documentation and pull request

- Update [known issues](../engineering/known-issues.md): mark resolved items, add intentional identifiers.
- Update [AI generation](../engineering/ai-generation.md) for the new statuses, reasons and resolve endpoint.
- Update the [adoption audit](../design-system/adoption-audit.md) unreachable-code section.
- Open the pull request with verification evidence.

## Final verification

```sh
npm run test:run
npm run design-system:check
npm run build
node scripts/verify-build.mjs
TEST_DATABASE_URL=postgresql:///banner_studio_test npm run test:workflow
npm run build:figma
```

Manual: create a banner project in the isolated studio launcher with mock providers; confirm it opens immediately, analysis progress shows in Brief, a forced provider failure shows its reason and **Try again**, and a forced timeout shows its reason and offers **Mark as failed** 40 seconds after the job's timeout.

## Risks

| Risk | Mitigation |
| --- | --- |
| Static reachability misses a dynamic import or script use | Full suite, build, `verify-build` and a search for file names before deleting |
| Misclassifying an uncertain outcome as failed causes a paid duplicate | Only pre-dispatch, validation and explicit 4xx errors become `failed`; network and timeout stay `unknown` |
| Renaming a persisted identifier breaks existing data | Explicit keep list in T7 |
| Creation flow change loses unsent files on reload | Clear interrupted-upload message; no automatic resend |

## Owner decisions

Taken on 17 September 2026.

| Question | Decision |
| --- | --- |
| Delete the GitHub Pages workflow? | Yes (D32) |
| When is **Mark as failed** offered? | 40 seconds after the job's timeout, always with the reason (D33) |
| Upgrade `firebase-admin` to 14 inside M0? | No, separate follow-up (D34) |
| One pull request for M0, or one per task? | One; the plan is reviewed with the documentation pull request (D35) |
| Keep a way to run without AI? | No. AI is at the centre of every creation flow; the briefing flag is removed (D37) |
| Reconnect or remove the unreachable banner template editor? | Remove it in T2 (D38) |

## Baseline test run

Run on 17 September 2026 against `v3` (commit `26c2598`, documentation changes only) with the local `banner_studio_test` database and mock providers.

| Measure | Result |
| --- | --- |
| Tests | 1,875 |
| Passed | 1,788 |
| Failed | 86 in the worktree run; **84** when the failing files were re-run from the main checkout |
| Skipped | 1 |

Failing files (main checkout re-run): `server/repositories/repositories.integration.test.js` (32), `server/services/videoGenerationService.integration.test.js` (8), `server/services/campaignRuntimeFlow.integration.test.js` (6), `server/services/visualsVersion.integration.test.js` (6), `src/studio/BannerTemplateEditor.test.jsx` (6), `src/studio/PresentationLibrary.test.jsx` (4), `server/services/visualUploadService.integration.test.js` (3), `src/studio/StudioApp.test.jsx` (3), `server/repositories/copyEditing.integration.test.js` (2), `src/studio/ConnectedStudio.review.integration.test.jsx` (2), and one each in `scripts/testing/demo-spending-safety.test.js`, `scripts/testing/start-isolated-studio.test.js`, `server/repositories/copyOptions.integration.test.js`, `server/repositories/visuals.integration.test.js`, `server/services/bannerBatch.integration.test.js`, `server/services/briefFlow.integration.test.js`, `server/services/briefingApiFlow.integration.test.js`, `server/services/copyRetention.integration.test.js`, `server/services/figmaHandoffService.integration.test.js`, `src/components/design-system/AtomicContracts.test.jsx`, `src/studio/admin/admin.test.jsx`, `src/studio/campaign/campaignChain.test.jsx`.
