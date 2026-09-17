# Known issues and technical debt

**Status:** Current · **Updated:** 17 September 2026

Issues found in the codebase review of 16 September 2026. **Before build** means the issue should be fixed in milestone M0 of the [roadmap](../product/roadmap.md), before proof-of-concept work starts. Each entry names its evidence so it can be verified.

## Reliability

Both issues found on 16 September 2026 were resolved in milestone M0 ([plan](../plans/2026-09-17-m0-stabilise.md)).

| Issue | Resolution |
| --- | --- |
| Generation jobs could lock a project: any provider error became `unknown`, with no way out | Known failures are classified as `failed`; reasons are shown in plain language; unknown outcomes can be marked as failed 40 seconds after their timeout; generation is refused before a job is created when AI is unavailable (T4–T6, D33, D37). See [AI generation](ai-generation.md#job-statuses) |
| Project creation could leave an orphan on Home when analysis failed | Home creates the project and opens it at once; uploads and analysis run in the Brief stage, and interrupted uploads are listed after a reload (T6) |

## Product model gaps

These are expected gaps between the current code and the [target model](../product/concept.md). They are planned work, not defects.

| Gap | Evidence | Decision |
| --- | --- | --- |
| Designer review is mandatory before delivery | `shared/workflowRules.js` transitions | D1 |
| Brands are copied into new global template versions; campaigns have no brand | `server/services/templateBrandService.js`, `templates` table | D2 |
| No brand information in AI prompts | `server/providers/geminiProvider.js` | D2 |
| Brand model lacks voice, wording rules, image style and mandatory lines | `shared/contracts.js` brand schemas | D2 |
| Renderer supports only Inter and Arimo at 400/600/700 | `server/rendering/inProcessRenderer.js`, `shared/resolveTemplateBrand.js` | D2 |
| No automatic quality decision or escalation | — | D3 |
| Flow logic is hard-coded; recipes are not used | `src/studio/campaign/workflowCoordinator.js` | D8 |
| Recipe node editor is disconnected from projects | `server/assetWorkflows/`, `src/studio/admin/` | D4, D8 |
| Create screen offers asset types that do not work | `shared/projectTypes.js` (only `banners` is `available`) | D6, D7 |

## Codebase hygiene

| Issue | Evidence | When |
| --- | --- | --- |
| Client brands are hard-coded alongside the brand database | `shared/msdBrand.js`, `shared/novartisBrand.js`, `shared/folkeuniversitetetBrand.js` | With M1 |
| Design tool records describe components removed in M0 | `.impeccable/surfaces` records for the Banners, Brief and Visuals modules reference `SelectionTile`, `MediaWorkflowCard`, `TextAction`, `FactGrid` and removed stylesheets | Refresh with the design tool during DS1 |
| Personal AI providers are wired but cannot run project generation | Project briefs accept only Vertex AI EU or the mock provider (D37); `personalProviderFactory` in `server/bootstrap.js` and `scripts/dev-studio.mjs` | Decide with M1: remove, or keep for brand tools only |
| After approving a version, the review step offers no action to continue to delivery | The workflow step navigation is the only way to Distribute | With the project page shell (M2) |
| Dependency audit warnings | 12 remaining after M0: the `firebase-admin` chain (8 moderate, production) needs `firebase-admin` 14; `vite`, `esbuild` and VitePress are development-only with no fix yet | `firebase-admin` 14 follow-up (D34) |

Resolved in M0: unreachable source files, the development script tags in `index.html`, inconsistent product naming, the outdated eight-stage list, the diagram script reading an archived document, the GitHub Pages workflow, the design tool record for the removed MVP, the failing test suite and the high-severity `postcss` and `lodash-es` findings.

### Intentional legacy identifiers

These identifiers keep the old product name because data, integrations or deployments depend on them. Do not rename them without a migration.

| Identifier | Where | Why it stays |
| --- | --- | --- |
| `banner-studio-output`, `banner-studio-version` | Figma plugin data keys (`figma-plugin/src/importScene.js`) | Stored on imported Figma frames and pages |
| `banner-studio-delivery` | Delivery digest salt (`server/services/deliveryService.js`) | Changing it changes every delivery digest |
| `banner-studio-postgres` | Docker Compose volume (`docker-compose.yml`) | Renaming detaches existing local databases |
| `banner-studio-prototype-v1` | Prototype IndexedDB name (`src/prototype/store.js`) | Renaming loses saved prototype data |
| `banner-studio-auth` | Firebase Admin app instance name (`server/auth/verifyToken.js`) | Internal to the running process; renaming has no benefit |

## Design-system integration

Found on 17 September 2026. The target fix is specified in [design system integration](../specs/design-system-integration.md): Brutalist moves into this repository as a workspace package (D36), which retires the cross-repository change pipeline.

| Issue | Evidence | When |
| --- | --- | --- |
| The change pipeline only runs Codex and assumes Observatory | Brutalist `scripts/changes/agent.mjs` builds `codex exec` arguments | Retired by DS0 |
| Pipeline installs are rejected by the app | Brutalist `scripts/changes/app-update.mjs` installs `file:<absolute path>`; the app's `scripts/design-system-check.mjs` requires `file:vendor/<artifact>` and provenance | Retired by DS0 |
| Pipeline releases are not pushed to GitHub | Brutalist worker promotes to local `main` only; the app's updater builds from GitHub `main` | Retired by DS0 |
| Pipeline prompt and file check allow different paths | Prompt allows fixtures and the usage guide; `allowedPath()` in Brutalist `scripts/changes/worker.mjs` allows only `src/atomic/` | Retired by DS0 |
| Local UI that published components could replace | Seven items A1–A7 in the [adoption audit](../design-system/adoption-audit.md#adopt-now) | DS1 |
| Brutalist has no `CLAUDE.md` | Claude Code does not load Brutalist's `AGENTS.md` automatically | DS0 adds one to the package |
| Every gap fix crosses two repositories | A Brutalist commit, a library build, an archive committed to `vendor/` (10 so far) and an app update | DS0 |

## Documentation

Resolved on 16 September 2026: legacy pipeline removed, superseded specs archived, `docs/` made the single source. Remaining documentation work is tracked in the [roadmap](../product/roadmap.md) (PRD and specifications).
