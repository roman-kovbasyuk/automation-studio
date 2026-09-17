# Known issues and technical debt

**Status:** Current · **Updated:** 16 September 2026

Issues found in the codebase review of 16 September 2026. **Before build** means the issue should be fixed in milestone M0 of the [roadmap](../product/roadmap.md), before proof-of-concept work starts. Each entry names its evidence so it can be verified.

## Reliability

### Generation jobs can lock a project

**Before build.** Any error thrown during a provider call is recorded as `unknown` with reason `provider_call_ambiguous`, including errors whose outcome is certain, such as missing credentials or an invalid response. `unknown` jobs block copy edits, keeping supplied copy and visual uploads for the campaign, and no code path resolves them. The interface says "Check its status before trying again" but offers no way to do so.

- Evidence: `server/services/generationService.js` (provider call error handling), `server/repositories/generationJobRepository.js` (`status IN ('pending','unknown')` checks), `src/studio/campaign/campaignRuntime.js`.
- The local demo database contained six such jobs on 16 September 2026.
- Fix direction: classify known errors as `failed`; add a user-facing resolve or retry action; check capability readiness before dispatch.

### Project creation can leave an orphan

**Before build.** On Home, the campaign is created before analysis runs. If analysis fails, the user stays on Home, the new campaign is not added to the sidebar and submitting again creates a duplicate.

- Evidence: `create()` in `src/studio/StudioApp.jsx`.
- Fix direction: open the project immediately and show analysis progress in the Brief stage.

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
| 73 source files (about 6,400 lines) are not reachable from the application entry point | Listed in the [adoption audit](../design-system/adoption-audit.md#unreachable-code): `src/mvp/`, `src/domain/`, `src/data/`, `src/components/ui/`, most of `src/components/` and `src/screens/`, unused design-system adapters and several `src/studio/` stage files | Before build |
| A development script tag is committed in the production HTML | `index.html` loads `http://localhost:8400/live.js` | Before build |
| Product name is inconsistent in code | "Banner Studio" in `index.html`, Dockerfile labels, Firebase app name; `lingu-studio` in `package.json` | Before build |
| A third, outdated stage list exists | `stages` in `src/studio/workflow.js` (eight stages) | Before build |
| Client brands are hard-coded alongside the brand database | `shared/msdBrand.js`, `shared/novartisBrand.js`, `shared/folkeuniversitetetBrand.js` | With M1 |
| Diagram script reads an archived document | `scripts/render-campaign-logic.mjs` reads `docs-site/recipes/campaign-flow.md`, now archived | Remove or replace in M0 |
| GitHub Pages workflow targets a branch that does not exist | `.github/workflows/deploy-pages.yml` runs on `main`; the default branch is `v3` | Remove in M0 (D32) |
| Design tool records point at unused code | `.impeccable/surfaces/src-mvp-mvpapp-jsx.md` | With dead code removal |
| Full test suite is not green | 84 failing tests in 22 files on 17 September 2026, mostly fixtures that predate the canonical briefing cutover; grouped in task T1 of the [M0 plan](../plans/2026-09-17-m0-stabilise.md) | Before build |
| Dependency audit warnings | `npm install` reports 20 vulnerabilities (17 moderate, 3 high) | Review in M0 |

## Design-system integration

Found on 17 September 2026. The target fixes are specified in [design system integration](../specs/design-system-integration.md) and Brutalist's change protocol v2.

| Issue | Evidence | When |
| --- | --- | --- |
| The change pipeline only runs Codex and assumes Observatory | Brutalist `scripts/changes/agent.mjs` builds `codex exec` arguments | Rollout step 3 |
| Pipeline installs are rejected by the app | Brutalist `scripts/changes/app-update.mjs` installs `file:<absolute path>`; the app's `scripts/design-system-check.mjs` requires `file:vendor/<artifact>` and provenance | Rollout step 2 |
| Pipeline releases are not pushed to GitHub | Brutalist worker promotes to local `main` only; the app's updater builds from GitHub `main` | Rollout step 2 |
| Pipeline prompt and file check allow different paths | Prompt allows fixtures and the usage guide; `allowedPath()` in Brutalist `scripts/changes/worker.mjs` allows only `src/atomic/` | Rollout step 3 |
| Local UI that published components could replace | Seven items A1–A7 in the [adoption audit](../design-system/adoption-audit.md#adopt-now) | Rollout step 1 |
| Brutalist has no `CLAUDE.md` | Claude Code does not load Brutalist's `AGENTS.md` automatically | Rollout step 3 |

## Documentation

Resolved on 16 September 2026: legacy pipeline removed, superseded specs archived, `docs/` made the single source. Remaining documentation work is tracked in the [roadmap](../product/roadmap.md) (PRD and specifications).
