# Decision log

**Status:** Current · **Updated:** 24 September 2026

Each decision records what was decided, when and what it replaces. A decision is not proof of implementation; check [known issues](../engineering/known-issues.md) and the code for the current state.

## Active decisions

| ID | Decision | Date | Replaces |
| --- | --- | --- | --- |
| D1 | Designer review is an **escalation path**, not a mandatory gate. The requester accepts assets; a designer is involved only when quality is not acceptable or help is requested. | 16 Sep 2026 | W06 (mandatory Figma design/approval inside Banners) |
| D2 | The **brand is an input to every flow**: flows pin a brand version, templates reference brand roles instead of storing copies, and brand guidance reaches AI prompts. | 16 Sep 2026 | Per-brand template versions in the shared catalog |
| D3 | **Acceptable quality is defined by automatic checks** (hard checks, AI review, repair) with explicit escalation triggers. | 16 Sep 2026 | — |
| D4 | For the pilot, **our team writes recipes**. No recipe editor is required. | 16 Sep 2026 | W02, W03 (node editor as the recipe tool) |
| D5 | Regulated brands get **custom recipes later**. The proof of concept does not model compliance approval. | 16 Sep 2026 | — |
| D6 | "Campaign" is replaced by the **asset creation flow**, with four stages for every asset type: Brief → Copy → Visuals → Assets. | 16 Sep 2026 | W06 (five campaign steps) |
| D7 | The **second asset type is decks**, after banner sets. | 16 Sep 2026 | Open choice "first end-to-end workflow" |
| D8 | **Recipe files are the single source of truth.** Their structure must allow diagrams to be generated from them. FigJam diagrams are produced with the standard Figma MCP and Figma skills; no custom generator is built. | 16 Sep 2026 | A04 (recipe versions stored by the node editor) |
| D9 | The product is named **Automation Studio**. | 16 Sep 2026 | Banner Studio, Lingu Studio, Lingu Agents |
| D10 | The **legacy marketing-agent pipeline is removed** from the repository: Claude agents, HyperFrames/video skills, their docs and `projects/`. Git history keeps them. | 16 Sep 2026 | The Claude Code pipeline described in the old README and CLAUDE.md |
| D11 | **`docs/` is the single documentation source.** The team site in `docs-site/` renders it. | 16 Sep 2026 | Separate content in `docs-site/` and `docs/` |
| D12 | Superseded specifications, plans and reports move to **`docs/archive/`** with an index. They are never an authority. | 16 Sep 2026 | Dated specs and plans kept beside current docs |
| D13 | **Use Brutalist components first.** Generic needs are added to Brutalist; product-specific compositions stay in the app. See [design system integration](../specs/design-system-integration.md). | 17 Sep 2026 | — |
| D17 | **Decks are delivered as editable PPTX only.** No PDF or slide PNG downloads. | 17 Sep 2026 | Provisional P6 (PDF plus PNG per slide) |
| D18 | **Escalated decks are improved in the PPTX itself.** The designer downloads the generated PPTX, edits it in PowerPoint or Keynote and uploads it back; the requester accepts it. Banners keep the Figma route. | 17 Sep 2026 | Figma round trip for decks |
| D19 | **Deck image slots use the placeholder defined in the template.** Each slide template declares what its image slots show until an image is inserted (for example a labelled grey box). No image generation or upload for decks in the proof of concept. | 17 Sep 2026 | Provisional P7 (AI-generated artwork or uploads) |
| D20 | **Folkeuniversitetet is the pilot brand.** Banner templates are used with role bindings; a Folkeuniversitetet slide template set is created for decks. | 17 Sep 2026 | Provisional P8 (MSD) |
| D21 | **Folkeuniversitetet uses its licensed heading font Matter in the pilot.** Licensed font files are uploaded to the brand, so brand font support (BRAND-4) is required for the pilot, and PPTX recipients need Matter available. | 17 Sep 2026 | Unconfirmed Matter with Inter fallback |
| D22 | **One project is one creation flow of one asset type, fixed at creation.** A banner project delivers any number of banners; a deck project delivers exactly one deck; a newsletter project exactly one newsletter. Reusing a brief in another project is not needed for the pilot. | 17 Sep 2026 | Provisional P9 (flow as top-level record) |
| D23 | **Users and documentation call the top-level record a Project.** "Asset creation flow" names the four-stage process inside a project. | 17 Sep 2026 | Naming part of D6 ("asset creation flow" as the record name) |
| D24 | **The design-system gap list is stored as JSON** and rendered into its documentation page. | 17 Sep 2026 | Provisional P1 |
| D25 | **Brutalist releases use semantic versions:** before 1.0, patch for additive changes and minor for breaking changes. | 17 Sep 2026 | Provisional P2; fixed `0.1.0-atomic.0` |
| D28 | **Roman Kovbasyuk is the pilot designer** and handles escalations. Target turnaround is **one business day** from request to returned asset. | 17 Sep 2026 | Open question (pilot designer and turnaround) |
| D29 | **Pilot measure targets are set after the first pilot week,** from the baseline measured in that week. | 17 Sep 2026 | Targets set before the pilot starts |
| D30 | **AI agents do not use the Observatory task tracker** in Automation Studio or Brutalist. The instruction is removed from Brutalist's `AGENTS.md`; the change pipeline may still report to Observatory when configured (D26). | 17 Sep 2026 | Brutalist `AGENTS.md` Task Observatory section |
| D31 | **Evolve the existing codebase; do not rewrite.** Keep the server foundation, AI layer, briefing, Figma handoff and delivery; extend brands, templates and the renderer; build a new project page shell on the existing APIs that reuses the Brief, Copy and Visuals views; replace the review gate and hard-coded sequencing; delete unreachable code. | 17 Sep 2026 | — |
| D32 | **Remove the GitHub Pages workflow.** Documentation is served by the application at `/docs`. | 17 Sep 2026 | `.github/workflows/deploy-pages.yml` |
| D33 | **Unknown generation outcomes can be marked as failed 40 seconds after the job's timeout,** and the interface always explains why the outcome is uncertain or why the job failed, in plain language. | 17 Sep 2026 | Unknown jobs with no resolution path |
| D34 | **The `firebase-admin` 14 upgrade is a separate follow-up** with its own authentication tests, not part of M0. | 17 Sep 2026 | — |
| D35 | **M0 is delivered as one pull request into `v3`;** its plan is reviewed with the documentation pull request. | 17 Sep 2026 | — |
| D36 | **Brutalist is a standalone product that Automation Studio consumes; during the pilot its source lives in this repository** as the workspace package `packages/brutalist-design-system`, imported with its history. It stays detachable: its own manifest, tests, build and documentation; no imports from application code; the application uses only its public exports; checks enforce all three. Generic gaps are fixed in the package in the same pull request as the feature that needs them. Additive changes need no extra approval; breaking changes need the owner's approval. The standalone repository is frozen until the package is split back out with its history. See [design system integration](../specs/design-system-integration.md). | 17 Sep 2026 | D14, D15, D16, D26, D27 (cross-repository change protocol, change queue and vendored releases) |
| D37 | **AI is at the centre of every creation flow.** Without AI the application has no purpose, so there is no non-AI mode: the source briefing flag is removed and the confirmed AI briefing is the only way to create a project. Production requires the managed AI connection (Vertex AI EU); development and tests use explicit mock providers. The interface checks AI readiness before work starts and explains when it is unavailable. | 17 Sep 2026 | `BRIEFING_ENABLED` switch and its 503 *briefing unavailable* path |
| D38 | **Remove the in-app banner template editor.** It can no longer be opened from the application; template authoring returns with the template model. | 17 Sep 2026 | Draft-only banner template editor on the Templates page |
| D39 | **Brief review is AI-prefilled and reviewed on one page.** One analysis fills the settings it has a basis for (age range from 18 to 65+, gender, goal, reach, the copy question and visual keywords) and marks them as suggested, never inferring age or gender from stereotypes. The requester reviews them in up to three sections shown together (Copy found, Settings and Visual context) and confirms once with **Proceed to copy**. A confirmed brief saves changes automatically, except a change that would write new copy, which needs that explicit action. Found copy is always kept, with optional new copy. Image prompts must use the keywords and audience settings. See [Brief review](../specs/brief-review.md). | 17 Sep 2026 | The single review form; choosing between keeping found copy and creating new copy |
| D40 | **The requester accepts rendered banners.** An editor (marketer or admin) accepts the current rendered version directly: `in_review → approved`, recorded as an `accepted` review event bound to the version's content and asset hashes and enforced by the database (migration `055_requester_acceptance.sql`). The designer route (a designer marks the version ready, someone else approves) stays available as design help. The owner accepted the [quality and escalation](../specs/quality-and-escalation.md) specification for this slice on 24 September 2026; its further checks, repair, AI review and escalation records follow in M2. | 24 Sep 2026 | Mandatory designer review before delivery |
| D41 | **Banner text shrinks to fit, and the catalog has ten layouts.** Each text slot uses the largest size between `fontSize` and `minFontSize` at which it fits (`shared/textFit.js`, shared by the PNG renderer and the browser preview). Current layouts set per-layout headline floors, body 22 px and tag 14 px; the call to action keeps its size. Ten layouts support all seven sizes; version 1.3.0 of the first three adds fitting and moves decoration clear of text. See [template model](../specs/template-model.md). | 24 Sep 2026 | Fixed text sizes that rejected copy within the AI limits; three layouts |

## Provisional decisions

None open. Provisional decisions P1–P9, taken on 17 September 2026 while the owner was unavailable, were reviewed the same day and replaced by D17–D27.

## Earlier decisions still in force

From the register consolidated on 10 September 2026 ([archived](../archive/docs-site-2026-09/decisions/index.md)).

| ID | Decision | Status now |
| --- | --- | --- |
| W01 | Each asset type has its own recipe. | Kept. Recipes are files (D8). |
| W04 | Ask for missing information or conflicting requirements at meaningful checkpoints. | Kept. Expressed as recipe questions. |
| W05 | Output uses the brand and templates managed in the application. | Kept and strengthened by D2. |
| A01 | The wider admin area includes users, projects, assets, workflows and a task manager. | Kept as a later stage. |
| A02 | One modular backend with PostgreSQL and object storage; separate API and worker processes. | Proposal. Not yet accepted. |
| A03 | Separate project, logical document, version, file, workflow run, system work and human task. | Proposal. Must be reconciled with the asset creation flow model. |
| A05 | Sequential execution with conditional branches first. | Kept. Matches recipe stages. |
| H01 | Hosting provider, region and budget. | Open. See [hosting](../operations/hosting.md). |
| I01 | Terraform plus CLI/SSH-driven setup once hosting is chosen. | Open. See [infrastructure](../operations/infrastructure.md). |

## Superseded decisions

| ID | Decision | Superseded by |
| --- | --- | --- |
| W02 | The product logic designer (node editor) is the main recipe tool. | D4, D8 |
| W03 | Keep React Flow for the real recipe editor. | D4, D8 |
| W06 | Five campaign steps with mandatory Figma design and approval inside Banners. | D1, D6 |
| A04 | Mutable recipe drafts and immutable versions stored by the editor. | D8 (file versions pinned by content hash) |
| D14 | Brutalist changes go only through the change protocol; additive requests from Automation Studio are pre-approved, breaking changes need the owner's approval. | D36 (the approval policy is kept) |
| D15 | The change protocol is agent-agnostic: pull mode by default, optional Codex, Claude Code and command adapters. | D36 |
| D16 | One install path owned by the app: vendored release archive plus provenance; releases pushed to GitHub before installation. | D36 |
| D26 | The change queue runs on the owner's machine for the pilot; Observatory reporting is optional. | D36 |
| D27 | Pull-mode claims do not expire. | D36 |

## How to record a decision

Add a row with the next ID, the date and what it replaces. Update the pages the decision affects in the same change. If a decision reverses an earlier one, move the earlier row to **Superseded decisions**.
