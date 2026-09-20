# Known issues and technical debt

**Status:** Current · **Updated:** 20 September 2026

Current product gaps and retained debt, updated after the [20 September preparation review](phase-preparation-review.md). M0 is complete; next-phase work is scoped by the [M1 plan](../plans/2026-09-20-m1-brand-input.md).

## Reliability

Both issues found on 16 September 2026 were resolved in milestone M0; see the [current preparation review](phase-preparation-review.md).

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
| Personal AI providers are wired but cannot run project generation | Project briefs accept only Vertex AI EU or the mock provider (D37); `personalProviderFactory` in `server/bootstrap.js` and `scripts/dev-studio.mjs` | Decide with M1: remove, or keep for brand tools only |
| After approving a version, the review step offers no action to continue to delivery | The workflow step navigation is the only way to Distribute | With the project page shell (M2) |
| Dependency audit warnings | Historical M0 audit (not rerun in this preparation): 12 findings; the `firebase-admin` chain (8 moderate, production) needs `firebase-admin` 14; `vite`, `esbuild` and VitePress are development-only with no fix yet | `firebase-admin` 14 follow-up (D34) |

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

Found on 17 September 2026. DS0 moved Brutalist into this repository as a workspace package (D36, [design system integration](../specs/design-system-integration.md)), which retired the cross-repository change pipeline and its issues: Codex-only agents, rejected pipeline installs, releases kept on one machine, mismatched path rules, the missing package `CLAUDE.md` and gap fixes spanning two repositories.

| Issue | Evidence | When |
| --- | --- | --- |
| Local UI that published components could replace | Seven items A1–A7 in the [adoption audit](../design-system/adoption-audit.md#adopt-now) | DS1 |

## Documentation

Resolved on 16 September 2026: legacy pipeline removed, superseded specs consolidated (obsolete archives removed under D40 on 20 September), `docs/` made the single source. Remaining documentation work is tracked in the [roadmap](../product/roadmap.md) (PRD and specifications).
