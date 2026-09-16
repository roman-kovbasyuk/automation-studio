# Roadmap

**Status:** Target · **Updated:** 16 September 2026

The next goal is a **proof of concept**: banner sets and decks produced automatically from brand, templates and recipes, with escalation to designers when needed.

## Where we are

| Area | Current state |
| --- | --- |
| Banner flow | Built as a hard-coded six-module campaign flow with real Gemini integration. Designer review is mandatory. |
| Brands | Versioned brand systems with AI-assisted extraction. Colors, typography and logo only. |
| Templates | Three banner layouts; the brand is copied into new template versions. Five MSD slide layouts exist as data with AI content contracts, but no deck generation or renderer. |
| Recipes | A node-graph editor with simulation only. Not connected to flows. Frozen by D4. |
| Quality | Some automatic validation (text overflow, crops, sizes). No quality decision or escalation logic. |
| Documentation | Consolidated in `docs/` on 16 September 2026. |

Details and evidence: [architecture](../engineering/architecture.md) and [known issues](../engineering/known-issues.md).

## Phases

### Phase 1 — Documentation cleanup ✔ in review

Remove the legacy pipeline, archive superseded specs, make `docs/` the single source, rewrite agent instructions around the product concept. No application code changes.

### Phase 2 — Product requirements and specifications (next)

Write before any implementation:

1. **PRD** for Automation Studio and the proof of concept: users, jobs to be done, flows, requirements, non-goals, measures, risks.
2. **Specifications**:
   - Domain model: brand, template, capability, recipe, asset creation flow, escalation, and their versions.
   - Recipe schema and the `banner-set` and `deck` recipes.
   - Brand model extension: voice, wording rules, image style, mandatory lines, fonts.
   - Template model: brand-role references, slots, content contracts, per asset type.
   - Quality checks, AI review and escalation workflow.
   - Asset creation flow UX: the four stages, state visibility, error recovery.
   - Deck generation and rendering.
   - Migration from campaigns to asset creation flows.
3. **FigJam diagrams** of both recipes, generated from the recipe drafts with the Figma MCP.

### Phase 3 — Proof of concept build

| Milestone | Work | Exit check |
| --- | --- | --- |
| **M0 Stabilise** | Fix the issues in [known issues](../engineering/known-issues.md) marked *before build*: generation jobs that lock a flow, flow creation errors, dead code, the committed dev script tag, product naming in code. | No job can leave a flow unusable. |
| **M1 Brand as input** | Brand guidance fields; flows pin a brand version; templates reference brand roles; brand context in AI prompts. | One template renders two brands correctly; prompts include brand context. |
| **M2 Banner recipe and Assets stage** | Recipe loader and schema check; `banner-set` recipe drives the stages; checks, repair, accept, download, request design help; escalation replaces mandatory review. | A banner brief reaches downloaded files with no designer; an escalation round trip works. |
| **M3 Deck recipe** | Slide templates in the template model; outline and slide-fill capabilities; artwork; server-side text fit; PDF and PNG output. | A deck brief reaches a downloaded PDF with no designer. |
| **M4 Pilot** | Real briefs for both asset types with live AI. | Measures recorded; go/no-go decision written. |

**Design-system track (runs alongside M0–M2).** Defined in [design system integration](../specs/design-system-integration.md#rollout):

| Step | Work | Needed before |
| --- | --- | --- |
| DS1 | Adopt available components (audit items A1–A7) | M2 |
| DS2 | App artifact install mode; pipeline uses it; releases pushed to GitHub | First change request |
| DS3 | Protocol v2: shared allowed paths, pull mode, adapters, `CLAUDE.md` in Brutalist | First change request |
| DS4 | Checkable gap list; breaking-change gate | M2 |
| DS5 | First requests: routed steps (R1), autosave inline text (R2), controlled dialogs (R3) | M2 flow interface |

### Later

Carried forward from the [delivery stages proposal](../archive/docs-site-2026-09/decisions/delivery.md); to be re-planned after the pilot.

- Shared identities for projects, documents and versions across asset types.
- Durable recipe execution with a worker, saved questions and recovery.
- Admin operations: work queue, task assignment, run inspection.
- A recipe editing interface.
- Custom recipes for regulated brands.
- More asset types: landing pages, websites, template creation.
- Hosting, deployment, backup and operations.

## Proof of concept scope

**In scope**

- One pilot brand with banner and deck templates.
- `banner-set` and `deck` recipes, written by our team.
- Brand guidance in the brand model and in AI prompts.
- Templates that reference brand roles.
- Hard checks, AI review in shadow mode, repair and escalation through Figma.
- Live Gemini generation during the pilot.

**Out of scope**

- Recipe editor interface.
- Compliance workflows for regulated brands.
- Landing pages and websites.
- Editable PPTX or Google Slides output, unless the pilot requires it.
- Publishing to advertising platforms.
- Customer-facing workspace administration.
- New video capabilities. Existing video generation stays as it is.

## Measures

Targets are set before the pilot starts.

- **Auto-acceptance rate:** share of assets accepted without escalation, per asset type.
- **Escalation reasons:** counted by failed check or user reason.
- **Time from brief to files.**
- **Generation cost per accepted asset.**
- **AI review agreement:** how often the shadow score matches the user's accept or escalate decision.

## Open questions

Provisionally answered on 17 September 2026 ([decision log](decisions.md#provisional-decisions)); confirm before build.

| Question | Provisional answer |
| --- | --- |
| Is PDF enough for pilot decks, or is an editable format required? | PDF plus PNG per slide; PPTX only if the pilot requires it (P6) |
| Deck visuals: AI-generated artwork, a brand image library, or both? | AI-generated artwork or user uploads; brand library later (P7) |
| Which brand runs the pilot? | MSD (P8) |
| Is an asset creation flow the top-level record, or does a project hold several flows? | The flow is top-level for the proof of concept (P9) |
| Who is the pilot designer, and what escalation turnaround is expected? | **Still open:** needs a named person. Specifications assume a target of one business day. |
