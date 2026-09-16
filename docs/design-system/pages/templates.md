# Templates catalog — design brief

## Identity and authority

- Surface: Templates. Mode: Operate.
- Owner: Template redesign. Observatory task: `f547fc26-c531-4076-9e9f-32e149c147b2`.
- Status: **implemented**. The user authorized implementation on 15 September 2026 after reviewing the plan.
- Existing route: `/mvp/templates#template-categories`.
- Existing entry: `src/studio/TemplateLibrary.jsx` inside `src/studio/StudioApp.jsx`.
- Governing rules: [FRONTEND.md](../../../FRONTEND.md), [DESIGN.md](../../../DESIGN.md), installed Brutalist public APIs.
- Visual reference: [latest user mockup](../references/templates-catalog-layout.png). This supersedes the two earlier images. Gray thumbnails, repeated names and sample dates are placeholders.
- Implementation plan: [Templates redesign](../../superpowers/plans/2026-09-15-templates-redesign.md).

## Confirmed user requirements

1. Keep the left sidebar unchanged.
2. Make template cards the core browsing experience.
3. Arrange cards in named groups. The mockup's Banners and Slides are examples; the page must support additional groups through data/configuration, without another page implementation.
4. Keep the heading and toolbar: search, brand selector, template-type filter and last-used sorting.
5. Use stacked group panels and a two-column desktop card grid. Keep banner previews square and slide previews landscape.
6. Show the template name and last-used metadata below the preview.
7. Reveal **Create with template** and **⋯** on card hover. The menu contains **Edit** and **Delete**, acting on the reusable template.
8. Retain an Add tile within each group. Its destination has not been specified.
9. The implementation follows the approved plan; unresolved authoring and deletion destinations remain callback boundaries.

The later card/group clarification supersedes the first draft's fixed-two-group layout and title-only action. The new mockup supersedes the old campaign callout/category-tabs composition. Existing editors keep their working contracts; this redesign does not resurrect historical inline-canvas editing requirements.

## Implementation evidence

- `src/studio/TemplateLibrary.jsx` owns the toolbar, URL state, catalog scope and action feedback.
- `src/studio/templateCatalog.js` normalizes published manifests and reference entries into extensible groups, with deterministic last-used/name sorting and legacy category aliases.
- `src/studio/TemplateGroup.jsx` and `src/studio/TemplateCard.jsx` provide shared group/card anatomy. Card actions reveal on hover, keyboard focus and coarse pointers.
- `src/studio/template-library.css` provides the two-column desktop grid, stacked panels and one-column narrow-screen reflow using application layout containers and installed tokens.
- `src/studio/DesignSystemTemplateCatalog.test.jsx` covers groups, search, brand/type controls, actions, sorting and URL state.
- Focused catalog tests, the production build and `npm run design-system:check` pass. Browser inspection confirmed the route, anchor, toolbar alignment and grouped cards at the local route.

## Proposed implementation choices

These are recommendations, not additional user requirements:

- Hover actions sit together over the lower preview area: primary Create with template and secondary ellipsis. Reserve their footprint so metadata and neighboring cards never jump.
- Reveal the same actions on keyboard focus. On touch/coarse-pointer devices, keep them visible. Keep the menu usable when the pointer leaves the card for its portalled menu.
- Treat Add as creating a reusable template in the current group and brand; keep it distinct from Create with template. Confirm this before implementing the Add workflow.
- Edit opens a template-authoring flow; Create with template opens an output draft. Never rename the existing output editor to imply template authoring.
- Delete removes a catalog entry from future selection while preserving immutable versions referenced by existing work. Scope and recovery require a product decision before this write path is implemented.
- Last used is a server-backed timestamp from a confirmed use in the owning creation flow. When absent, display **Usage not recorded**. Never substitute created/updated dates or preview-open time.
- Preserve an explicitly selected brand through navigation. Otherwise use a valid available brand. The mockup does not establish a permanently hard-coded brand default.
- Two equal desktop columns, one column on narrow screens. Begin with an 880px work-column cap and a 600px grid breakpoint, then verify against the reference, actual shell width and 320px reflow. These are application layout choices, not new design tokens.

## Master and inheritance

| Master | Descendant / permitted variation | Guarantees retained |
| --- | --- | --- |
| StudioApp shell | Templates main-content surface | Sidebar, navigation, identity, breadcrumbs, skip link and mobile shell behavior |
| FRONTEND Browse and choose | Grouped template catalog | Scope controls before results; consistent object anatomy; explicit actions; visible recovery |
| TemplateGroup application composition (new) | Banners, Slides and further registered groups | Heading, same card grid, Add position, empty behavior and reading order |
| TemplateCard application composition (new) | Template data and preview supplied through props | Preview/name/usage anatomy; hover/focus/touch action behavior; capability and busy states |
| Brutalist primitives | Public supported props and slots | Typography, borders, corner roles, keyboard/focus, menu/dialog semantics and tokens |
| Versioned output templates | Existing brand-specific previews and editors | Brand identity, manifest version, geometry, validation and output capability |

This creates application compositions, not a local UI component skin or a new framework. No shared shell/master outside this surface is redesigned.

## Component and layout map

| Region | Public export / application owner | Notes |
| --- | --- | --- |
| Title / group headings | `Heading` | One h1; each group is an h2 region |
| Toolbar | Plain layout container | Same content width/alignment as groups; wraps without horizontal page scrolling |
| Search | `Button`, `SearchField` | Accessible name; expand, type, clear, Escape and focus return |
| Brand and type | `Select` | Real options and explicit selection; keep labels accessible |
| Sort | `Menu` | Last used first; Name A–Z as a proposed secondary option |
| Group/card containment | `Surface` | Large/small supported radius, padding and neutral tone |
| Card action area | Plain positioned wrapper around `Button` and `Menu` | Wrapper controls layout/reveal; never targets upstream classes or changes control skin |
| Preview | Existing `AnimatedBanner`, slide renderers or reference images | Output-only styling, native aspect ratios, no stretching or invented artwork |
| Add tile | Public `Surface` and named `Button` composition | The package does not expose a dashed add-card variant; do not fake a dropzone |
| Confirm/recovery | Supported public confirmation controls, otherwise native dialog | Current Dialog requires its own string trigger; inspect focus implications before choosing it |

Installed baseline: Brutalist `0.1.0-atomic.0`, provenance commit `7b06e5e01c7a64ed0bd509e0d7850acfc3c618b7`. Revalidate when implementation starts. No package refresh or external modification is required by this plan.

Spacing uses the installed scale: page/group separation 8/12, card/toolbar gaps 4/6, metadata spacing 1/2/3. Exact control typography and shapes remain upstream. Do not copy the wireframe gray into a new theme.

## Data and actions

The catalog is a normalized read model over existing sources, not a second collection of invented templates. API manifests, bundled slide definitions and reference-only artwork must retain distinct capabilities. Brand matching uses authoritative IDs where available; legacy aliases remain an explicit migration path, not a fallback that assigns every unbranded template to every brand.

Group IDs identify browse groups; they are separate from renderer families, high-level Ads/Web categories, and template IDs. New groups need metadata and existing renderer/action adapters. A new unsupported output family needs its own capability work.

URL state owns brand, group/type, query and sort. Local state owns search expansion, hover, active menu and bounded confirmation. Drafts keep captured template ID/version and their established persistence owner. Returning from an editor restores filters, scroll and focus to the originating card, or the nearest remaining card after deletion.

No catalog navigation, hover, search or sort dispatches generation, publishes a template or counts as a use. Catalog commands must not mutate existing campaigns or immutable template versions.

## State matrix

| State | Visible behavior | Retained / evidence |
| --- | --- | --- |
| Loading | Stable shell and toolbar; skeletons in pending region | Selected scope, existing usable results where safe |
| Empty brand/group | Explain absence and expose permitted Add action | Group identity and scope |
| No matches | No-results message and Clear search/reset controls | Other filters and selected brand |
| Ready | Actual grouped cards and permitted actions | Verified source and version |
| Missing preview | Named fallback in same preview frame | Card identity and valid actions |
| Unknown use | Usage not recorded | No fabricated timestamp |
| Hover/focus/touch | Reachable Create and ellipsis controls | Stable card geometry |
| Read-only/reference | Clear unavailable capability; no fake successful command | Preview remains available |
| Starting / saving / deleting | Name operation and prevent duplicate command | Card/draft remains visible |
| Success | Update only from authoritative command result | New version/draft/archive receipt |
| Failure | Inline explanation with scoped retry | Filter state, card and unsaved work |
| Conflict | Explain changed version or permission; reconcile | Original draft/revision; no blind retry |
| Partial availability | Keep successful sources; identify failed source and retry it | Valid cards not relabeled as a complete library |

## Output and workflow boundaries

The existing banner editor can export draft PNG packages; the existing slide editor edits slide content and exports JSON packages. Static reference artwork does not automatically have either capability. This page change does not add native PPTX generation, paid AI, a general canvas editor, group-management UI, or permanent database purging.

The management workflow must be specified before its dependent implementation. In particular, the existing backend permits admin template-version creation, while general banner use and brand management follow different permissions. Do not copy brand-designer rights into template-management rights implicitly.

## Acceptance

The plan maps every confirmed requirement to a task and a check. Implementation acceptance requires actual entry-to-result tests for enabled actions; desktop, touch and keyboard inspection; long content and missing preview checks; responsive reflow; design-system check; build; existing editor regressions; and a verified Observatory section link.

A build or screenshot alone cannot pass action integration. Fixture results and real integration results must be listed separately. The catalog implementation is complete; Add, Edit and Delete remain capability-gated callbacks and report unavailable operations when no callback is supplied.

## Exceptions and remaining decisions

No exception to the external design-system boundary is authorized. Solid supported add-tile containment replaces the wireframe's dashed treatment unless a compatible public variant is supplied later.

Before management work: settle Add destination, editable template fields/authoring surface, Delete scope/recovery, and management roles. Before usage instrumentation: settle whose use is shown and the qualifying persisted event. The implementation plan gives recommendations and isolates these dependencies from the catalog composition work.
