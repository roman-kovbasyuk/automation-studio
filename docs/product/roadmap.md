# Roadmap

**Status:** Target · **Updated:** 20 September 2026

The next goal is a **proof of concept**: banner sets and decks produced automatically from brand, templates and recipes for the pilot brand Folkeuniversitetet, with escalation to designers when needed.

## Where we are

| Area | Current state |
| --- | --- |
| Banner projects | Built as a hard-coded six-module "campaign" flow with real Gemini integration. Designer review is mandatory. |
| Brands | Versioned brand systems with AI-assisted extraction. Colors, typography and logo only. Rendering supports only Inter and Arimo. |
| Templates | Three banner layouts; the brand is copied into new template versions. Five MSD slide layouts exist as data with AI content contracts, but no deck generation or export. No Folkeuniversitetet slide templates. |
| Recipes | A node-graph editor with simulation only. Not connected to projects. Frozen by D4. |
| Quality | Some automatic validation (text overflow, crops, sizes). No quality decision or escalation logic. |
| Documentation | Consolidated in `docs/`; PRD and specifications drafted on 17 September 2026. |

Details and evidence: [architecture](../engineering/architecture.md) and [known issues](../engineering/known-issues.md).

## Phases

### Phase 1 — Documentation cleanup ✔ done

Remove the legacy pipeline, archive superseded specs, make `docs/` the single source, rewrite agent instructions around the product concept. No application code changes.

### Phase 2 — Product requirements and specifications ✔ drafted, in owner review

Drafted on 17 September 2026 and updated for decisions D17–D30 the same day:

1. The [PRD](prd.md): goals, users, journeys, requirements, non-goals, measures, risks.
2. The [specifications](../specs/index.md): domain model, recipes, brand model, template model, quality and escalation, asset creation flow UX, deck generation, migration from campaigns, design system integration.
3. **FigJam diagrams** of both recipes, generated from the recipe definitions with the Figma MCP. Waiting for the Figma connector to be authorised.

### Phase 3 — Proof of concept build

| Milestone | Work | Exit check |
| --- | --- | --- |
| **M0 Stabilise** | Implemented; [current baseline review](../engineering/phase-preparation-review.md). Fix the issues in [known issues](../engineering/known-issues.md) marked *before build*: generation jobs that lock a project, project creation errors, dead code, the committed dev script tag, product naming in code. | No job can leave a project unusable. |
| **M1 Brand as input** | [Implementation plan](../plans/2026-09-20-m1-brand-input.md). Brand guidance fields; licensed brand fonts in the renderer (Matter); projects pin a brand version; templates reference brand roles; brand context in AI prompts. Folkeuniversitetet made automation-ready. | One template renders two brands correctly; Matter renders in banners; prompts include brand context. |
| **M2 Banner recipe and Assets stage** | Recipe loader and schema check; `banner-set` recipe drives the stages; checks, repair, accept, download, request design help; Figma escalation replaces mandatory review. | A banner brief reaches downloaded files with no designer; a Figma escalation round trip works. |
| **M3 Deck recipe** | Folkeuniversitetet slide template set with placeholders; outline and slide-fill capabilities; server-side text fit; PPTX export; PPTX escalation (download, edit, upload). | A deck brief reaches a downloaded PPTX with no designer; a PPTX escalation round trip works. |
| **M4 Pilot** | Real Folkeuniversitetet briefs for both asset types with live AI; baseline week; targets set (D29). | Measures recorded; go/no-go decision written. |

**Design-system track (runs alongside M0–M2).** Defined in [design system integration](../specs/design-system-integration.md#rollout):

| Step | Work | Needed before |
| --- | --- | --- |
| DS0 | Implemented; [current baseline review](../engineering/phase-preparation-review.md). Import Brutalist as the workspace package `packages/brutalist-design-system` with its history; boundary checks and CI; remove vendored archives and the change pipeline; freeze the standalone repository (D36) | First gap fix |
| DS1 | Adopt available components (audit items A1–A7) | M2 |
| DS2 | Checkable gap list (JSON); breaking-change gate | M2 |
| DS3 | First gap fixes in the package: routed steps (R1), autosave inline text (R2), controlled dialogs (R3) | M2 interface |

**Brief review (after DS0).** [Specification](../specs/brief-review.md), implemented with regression hardening in the [preparation review](../engineering/phase-preparation-review.md): AI-prefilled settings reviewed on one page and saved automatically once confirmed, found copy always kept with optional new copy, keywords and audience settings in image prompts (D39).

**Preparation outside the build:** the pilot designer (D28) creates the Folkeuniversitetet slide template set and uploads the licensed Matter font files before M3.

### Later

Deferred until after the pilot; the earlier delivery proposal is available in Git history.

- Grouping several projects, and reusing a brief across projects.
- Durable recipe execution with a worker, saved questions and recovery.
- Admin operations: work queue, task assignment, run inspection.
- A recipe editing interface.
- Custom recipes for regulated brands.
- Image generation or upload for decks.
- More asset types: newsletters, landing pages, websites, template creation.
- Hosting, deployment, backup and operations.

## Proof of concept scope

**In scope**

- Pilot brand Folkeuniversitetet (D20) with its licensed Matter heading font (D21).
- Banner sets (PNG) and decks (editable PPTX, D17).
- `banner-set` and `deck` recipes, written by our team.
- Brand guidance in the brand model and in AI prompts.
- Templates that reference brand roles; slide templates with placeholders (D19).
- Hard checks, AI review in shadow mode, repair and escalation: Figma for banners, PPTX editing for decks (D18).
- Live Gemini generation during the pilot.

**Out of scope**

- Recipe editor interface.
- Compliance workflows for regulated brands.
- Newsletters, landing pages and websites.
- Deck output as PDF or Google Slides.
- Image generation or upload for decks.
- Publishing to advertising platforms.
- Customer-facing workspace administration.
- New video capabilities. Existing video generation stays as it is.

## Measures

Targets are set from the baseline of the first pilot week (D29).

- **Auto-acceptance rate:** share of assets accepted without escalation, per asset type.
- **Escalation reasons:** counted by failed check or user reason.
- **Designer turnaround:** target one business day (D28).
- **Time from brief to first package.**
- **Generation cost per accepted asset.**
- **AI review agreement:** how often the shadow score matches the user's accept or escalate decision.

## Open questions

| Question | Needed by |
| --- | --- |
| Should generated PPTX files embed fonts, or is installing Matter a documented requirement? | M3 |
| Is a file-based banner escalation fallback (without the Figma plugin) needed for the pilot? | M2 |
| Should assets failing only the AI review be acceptable once review leaves shadow mode? | After M4 |
