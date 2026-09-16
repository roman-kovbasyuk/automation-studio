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
