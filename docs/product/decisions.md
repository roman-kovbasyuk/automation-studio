# Decision log

**Status:** Current · **Updated:** 16 September 2026

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
| D14 | **Brutalist changes go only through the change protocol.** Additive requests from Automation Studio are pre-approved; breaking changes need the owner's approval. | 17 Sep 2026 | The rule requiring explicit authorization for every external-package change |
| D15 | **The change protocol is agent-agnostic.** Any agent or person can implement a request; pull mode is the default; Codex, Claude Code and command adapters are optional. | 17 Sep 2026 | Codex-only implementation in the v1 pipeline |
| D16 | **One install path, owned by the app.** Releases are installed only through the app's updater (vendored artifact plus provenance). Brutalist releases are pushed to GitHub (`main` and a version tag) before any app installs them. | 17 Sep 2026 | Direct installation of local absolute package paths by the v1 pipeline |
| D17 | **Decks are delivered as editable PPTX only.** No PDF or slide PNG downloads. | 17 Sep 2026 | Provisional P6 (PDF plus PNG per slide) |
| D18 | **Escalated decks are improved in the PPTX itself.** The designer downloads the generated PPTX, edits it in PowerPoint or Keynote and uploads it back; the requester accepts it. Banners keep the Figma route. | 17 Sep 2026 | Figma round trip for decks |
| D19 | **Deck image slots use the placeholder defined in the template.** Each slide template declares what its image slots show until an image is inserted (for example a labelled grey box). No image generation or upload for decks in the proof of concept. | 17 Sep 2026 | Provisional P7 (AI-generated artwork or uploads) |
| D20 | **Folkeuniversitetet is the pilot brand.** Banner templates are used with role bindings; a Folkeuniversitetet slide template set is created for decks. | 17 Sep 2026 | Provisional P8 (MSD) |
| D21 | **Folkeuniversitetet uses its licensed heading font Matter in the pilot.** Licensed font files are uploaded to the brand, so brand font support (BRAND-4) is required for the pilot, and PPTX recipients need Matter available. | 17 Sep 2026 | Unconfirmed Matter with Inter fallback |
| D22 | **One project is one creation flow of one asset type, fixed at creation.** A banner project delivers any number of banners; a deck project delivers exactly one deck; a newsletter project exactly one newsletter. Reusing a brief in another project is not needed for the pilot. | 17 Sep 2026 | Provisional P9 (flow as top-level record) |
| D23 | **Users and documentation call the top-level record a Project.** "Asset creation flow" names the four-stage process inside a project. | 17 Sep 2026 | Naming part of D6 ("asset creation flow" as the record name) |
| D24 | **The design-system gap list is stored as JSON** and rendered into its documentation page. | 17 Sep 2026 | Provisional P1 |
| D25 | **Brutalist releases use semantic versions:** before 1.0, patch for additive changes and minor for breaking changes. | 17 Sep 2026 | Provisional P2; fixed `0.1.0-atomic.0` |
| D26 | **The change queue runs on the owner's machine for the pilot; Observatory reporting is optional.** | 17 Sep 2026 | Provisional P3, P4 |
| D27 | **Pull-mode claims do not expire.** A claimed request stays with its claimant until submitted or released. | 17 Sep 2026 | Provisional P5 (2-hour renewable claims) |
| D28 | **Roman Kovbasyuk is the pilot designer** and handles escalations. Target turnaround is **one business day** from request to returned asset. | 17 Sep 2026 | Open question (pilot designer and turnaround) |
| D29 | **Pilot measure targets are set after the first pilot week,** from the baseline measured in that week. | 17 Sep 2026 | Targets set before the pilot starts |
| D30 | **AI agents do not use the Observatory task tracker** in Automation Studio or Brutalist. The instruction is removed from Brutalist's `AGENTS.md`; the change pipeline may still report to Observatory when configured (D26). | 17 Sep 2026 | Brutalist `AGENTS.md` Task Observatory section |

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

## How to record a decision

Add a row with the next ID, the date and what it replaces. Update the pages the decision affects in the same change. If a decision reverses an earlier one, move the earlier row to **Superseded decisions**.
