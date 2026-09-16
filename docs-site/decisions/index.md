# Decisions and explorations {#decisions-and-explorations}

**Discussion:** 8–10 September 2026 · **Last consolidated:** 10 September 2026

We are defining a configurable asset-creation system and a broader backend admin area, then choosing a practical way to operate it. This register separates explicit product requirements from architecture recommendations and unresolved choices.

::: info Scope
V1 implements a dedicated internal admin shell, read-only system records and persisted recipe authoring with validation, fixture simulation and immutable publications. Durable recipe execution, human tasks and additional renderers remain planned. No hosting provider was selected, Terraform applied, or server provisioned in this discussion.
:::

## Decision register {#decision-register}

| ID | Subject | Status | Recorded direction |
| --- | --- | --- | --- |
| W01 | Product recipes | Confirmed requirement | Asset creation workflows belong to one Product recipes category: Banner creation, Slide deck creation, Website creation and Template creation. Each has its own recipe. |
| W02 | Product logic designer | Confirmed requirement | Recipe documentation links to the node editor. Canvas is the main tool, with draggable nodes and settings/AI instructions in a side drawer. |
| W03 | Editor library | Observed in source | React Flow (`@xyflow/react`) is used; retain it for the real editor. |
| W04 | User interaction | Confirmed requirement | Ask at meaningful checkpoints for missing information or conflicting requirements. Define the intended output. |
| W05 | Design context | Confirmed requirement | Use the design system managed in the application, plus selected templates and output rules. |
| W06 | Campaign Banners lifecycle | Confirmed product direction; implementation pending | Five steps: Brief, Copy, Visuals, Banners, Distribute. Banners has selection/handoff, Figma design/approval and final-file states. Approval triggers final import. See the [flow specification](/recipes/campaign-flow). |
| A01 | Wider admin | Confirmed requirement | Include users, projects, assets, workflows and a task manager. |
| A02 | Backend shape | Recommendation | One modular backend, PostgreSQL and object storage; separate API and worker processes. |
| A03 | Data boundaries | Recommendation | Separate project, logical document, version, file, workflow run, system work and human task. |
| A04 | Workflow persistence | V1 authoring implemented | Mutable drafts and immutable published versions; run pinning remains a later runtime stage. |
| A05 | Initial runtime | Recommendation | Sequential nodes with conditional branches; durable scheduling and recovery before live generation. |
| H01 | Hosting | Open | Managed cloud, rented VM with managed services, and physical dedicated hardware were compared. |
| I01 | Infrastructure setup | Discussed approach | Terraform plus CLI/SSH-driven configuration and deployment; account and budget choices remain open. |

Confirmed requirements do not imply implementation completion. Recommendations become accepted decisions only when the team explicitly adopts them.

## Explore the proposal

- [Product recipes](/workflow): the shared category for banner, slide deck, website and template creation.
- [Campaign flow specification](/recipes/campaign-flow): Mermaid diagrams, three Banners states, approval/export conditions and migration from the separate Review step.
- [Product logic designer](/decisions/asset-workflows): node-editor link, node contracts, clarification and output validation.
- [Admin and data model](/decisions/admin-data): entities, existing records, scheduling and human tasks.
- [Hosting options](/decisions/hosting): managed cloud, virtual and dedicated servers, resource estimates and cost tradeoffs.
- [Terraform and CLI setup](/decisions/infrastructure): provisioning, deployment, state and verification.
- [Delivery stages](/decisions/delivery): a small first release and the path to additional formats.
- [Detailed backend proposal](/decisions/backend-reference): the preserved architecture specification.

## Open choices {#open-choices}

| Choice | Why it matters |
| --- | --- |
| Customer workspace administration? | V1 is internal operations admin; customer access needs membership and scoped queries. |
| First end-to-end workflow to ship? | A deterministic harness and one existing banner capability are proposed before adding presentation rendering. |
| Hosting provider, region and budget? | Determines provisioning, service availability and recurring cost. |
| Who owns operational maintenance? | A rented server needs an owner for patching, monitoring and recovery. |
| Expected traffic and simultaneous renders? | Resource sizes so far are estimates, not load-test results. |
| Managed or self-hosted PostgreSQL? | Changes cost, backup responsibility and failure recovery. |
| Output contracts for each new format? | Defines editable files, preview/export behavior and acceptance checks. |

## Discussion timeline

**8 September — workflow and admin design.** The flow editor evolved toward a canvas-first interface. The discussion expanded to users, all projects/assets, tasks and the database foundation. The proposal separated reusable recipes from executions and human responses.

**8–9 September — hosting.** Managed Google Cloud services were proposed because the source already integrates with Firebase, Gemini and Google Cloud Storage. Rented virtual and physical servers were compared for cost, utilization and maintenance.

**9 September — infrastructure and documentation.** Terraform and CLI-based setup were discussed as the implementation approach once provider, access and budget are chosen. VitePress was found already installed and is being used to consolidate this material.

**9 September — product naming.** Asset creation workflows are grouped under Product recipes, with one entry per product and links to the product logic node editor. This is the documentation and product vocabulary; it does not rename backend tables or turn the preview into a persisted editor.

## Current evidence

The source contains the six-module campaign workflow, PostgreSQL persistence, provider/file adapters, read-only admin APIs and the React Flow recipe editor. Recipe contracts, concurrent revision/publication checks and immutable database constraints are covered by focused tests. Simulation uses synthetic fixtures; it does not verify paid providers or new output renderers. The application runbook is `docs/admin-backend.md` in the repository.
