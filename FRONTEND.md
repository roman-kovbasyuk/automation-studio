# Front-end design contract

Version 1.1 · 15 September 2026 · Owner: product owner, with design and engineering review.

**Every component, composition and flow must inherit a clear contract from its governing foundation. Brutalist owns application UI primitives; application patterns own composition and product behavior; published output systems own generated artifacts. Descendants specialize through supported configuration and composition while preserving their parent’s guarantees.**

This document governs all application components, surfaces and flows, including future descendants of master components and patterns. It defines durable principles and boundaries. Specific screens, brands, routes, workflow sequences and implementation status belong in their own specifications and briefs. Compliance must be verified for each implementation.

## Start here

Before coding, identify the user’s task, the governing master component or flow, the owning design layer, inherited guarantees, supported variation, data/state contract and evidence of success. Use the [design brief](docs/design-system/page-brief-template.md) for a component, surface or flow. For a small correction, record only changed decisions and verification; do not repeat an existing brief.

### Contents

1. [Authority and scope](#1-authority-and-scope)
2. [Product purpose and behavior](#2-product-purpose-and-behavior)
3. [Three design layers](#3-three-design-layers)
4. [Design principles](#4-design-principles)
5. [Application visual language](#5-application-visual-language)
6. [Page patterns and composition](#6-page-patterns-and-composition)
7. [Interactions and states](#7-interactions-and-states)
8. [Brand systems and asset automation](#8-brand-systems-and-asset-automation)
9. [Front-end architecture](#9-front-end-architecture)
10. [Design and development workflow](#10-design-and-development-workflow)
11. [Verification and acceptance](#11-verification-and-acceptance)
12. [Governance and adoption](#12-governance-and-adoption)
13. [Evidence and references](#13-evidence-and-references)

## 1. Authority and scope

### Which source answers which question?

| Question | Authority |
| --- | --- |
| What is requested now? | The latest explicit user decision and its recorded scope. Ask about material unresolved product choices; do not manufacture consent. |
| What should the product do? | The current, explicitly accepted product and feature/flow specifications, interpreted under this contract’s general rules. A plan is not proof of implementation or approval. |
| How do shared UI controls look and behave? | The verified, installed `brutalist-design-system` public API, tokens and behavior. |
| How should a page arrange work? | The governing master pattern and current design brief. Existing implementations are evidence to assess, not unconditional examples to copy. |
| How should generated creative look? | The selected published brand version, template manifest and authorized source reference. |
| What actually works today? | Reachable source, schemas, running UI and fresh tests. Code is evidence of implementation, not automatic approval of its UX. |
| What may the user change or publish? | Server authorization, current record/version integrity and the explicit user action. Client state is never permission. |

Use older plans, audits, screenshots and prototype documents as historical context where they conflict with these sources. Do not resolve a disagreement by choosing the newest file date alone. Record the conflicting claims and the user decision or source that settles them. Preserve unrelated constraints.

### Scope boundary

Keep global policy, master contracts and instance specifications separate. This document owns the global rules. Master contracts define reusable guarantees and supported variation. Instance briefs identify the task-specific data, content and choices within those boundaries.

Confirm the live application source before editing. Coordination records, exploratory prototypes, migration copies and generated build output do not automatically define production behavior. The external Brutalist repository remains read-only during application work.

## 2. Product purpose and behavior

### Purpose

Every surface and flow must serve an explicit user need established in the accepted product specification. Define the actor, intended outcome, permitted actions and evidence of completion. Derive presentation from that purpose rather than inferring functionality from available components or a visual reference.

The user should be able to answer: **What am I working on? What is saved? What needs my decision? What happens if I press this action?**

### Behavior contract

- A flow defines its inputs, prerequisites, allowed transitions, side effects, outputs and recovery paths. Child flows inherit those guarantees and declare any permitted specialization.
- Visible navigation is a presentation of the flow, not the source of its business rules. Internal stages and visible steps need not correspond one to one. No universal step count or sequence is prescribed here.
- Selection, saving, confirmation, execution, publication and approval have distinct meanings. Combine them only when the accepted flow explicitly defines the combined action and its consequences are clear to the user.
- Preserve the accepted terminology, language and permission model. A descendant must not invent new product behavior or reintroduce a historical requirement.
- Represent real capabilities. A demonstration, reference or simulated operation is not evidence that its production counterpart is available.
- Keep proposed behavior separate from accepted behavior. Preserve current integrity and authorization guarantees while a product decision remains unresolved.

### AI and automation rules

Opening a surface, changing a view, refreshing, reconnecting or checking status must not implicitly dispatch generation. Explicit commands own dispatch; observers follow existing operations. Preserve request identity when reconciling an uncertain outcome. Never turn a timeout into a fresh paid retry automatically.

Preserve sources, user edits, selections, valid partial results and captured revisions. Show suggestions as suggestions until confirmed. Invalidate only outputs whose declared dependencies changed; retain unrelated work. Do not invent inputs, associations or approvals to advance a flow.

Dispatch, acceptance, execution and verified completion are different states. Completion requires authoritative evidence that the requested result exists and satisfies its output contract. A link, preview or submission receipt alone does not establish downstream completion.

## 3. Three design layers

| Layer | Owns | Must not own |
| --- | --- | --- |
| **1. Brutalist UI foundation** | Application tokens, typography primitives, controls, shared interaction behavior and published UI blocks. | Domain rules, brand artwork or application data. |
| **2. Application patterns** | Shell composition, routing, page patterns, toolbars, task ordering, state presentation and bindings to domain commands. | A second button/card/field skin, replacement token palette or private fork of the shared library. |
| **3. Brand/output systems** | Versioned brand colors, type, logos, graphics, content rules, composition presets, templates and renderer constraints for produced assets. | App navigation, dialogs, form controls, focus styling or application status colors. |

**Terminology:** “Application design system” means layers 1 and 2 together. “Brand system” or “output design system” means layer 3. Avoid the unqualified phrase “product design system” in a technical brief: name which layer is intended.

```text
Brutalist package ──→ application shell, controls and page patterns
                                      │ edits / selects
                                      ▼
Published brand version + template + content + output requirements
                                      │ validated rendering
                                      ▼
                         preview, handoff and export artifacts
```

### Master and descendant contracts

A **master** is the canonical reusable definition of a component, composition or flow. A **descendant** is a configured instance, supported variant or composition that consumes that definition. These terms describe contract relationships; they do not require object-oriented inheritance or a new component framework.

| Master owns | Descendants may specialize | Descendants must preserve |
| --- | --- | --- |
| UI component: semantic role, supported states, visual tokens and interaction behavior. | Public props, content, supported variants and documented slots. | Accessible semantics, keyboard/focus behavior, state meaning and upstream appearance. |
| Application composition: hierarchy, responsibility boundaries and responsive relationships. | Domain content, permitted regions and layout choices declared by the pattern. | Shared structure, action hierarchy, reading order and ownership boundaries. |
| Flow: prerequisites, transitions, command effects, dependency rules and completion evidence. | Declared inputs, optional branches, parameters and outputs allowed by the flow contract. | Authorization, required decisions, data integrity, recovery and truthful completion. |
| Output system: versioned foundations, composition rules and renderer constraints. | Approved content, assets, parameters and supported formats. | Brand references, version identity, required content, fit rules and output validity. |

1. Identify the master and its contract before creating a descendant. Extend the nearest appropriate master through supported configuration or composition; do not copy its implementation and begin an independent variant.
2. A descendant may add constraints within the documented extension contract, but must not silently weaken a parent guarantee or introduce incompatible behavior under the same API. An incompatible change requires an explicit contract/version decision.
3. Keep inherited defaults in the master. Record only the descendant’s permitted differences and rationale. Do not duplicate token values or interaction rules in every instance.
4. Compose public components inside application-owned regions. Parent layout must not override a child component’s internal styling or interaction. Visual containment does not transfer design ownership.
5. Flow specialization must declare changed inputs, branches and dependencies. Rendering a child does not authorize its side effects, and a child’s local completion does not prove the parent flow is complete.
6. Validate master changes against representative descendants, and validate descendant changes against the inherited guarantees. Updating a master never licenses an unreviewed breaking migration.
7. When the contract cannot express a required variation, record the gap and propose a change at the owning layer. Do not hide the variation in CSS overrides, copied controls or an independent flow engine.

### Isolation between layers

Changing the selected output system may change content, specimens and generated artifacts. It must not change application navigation, control styling or status semantics. Artifact content and the controls used to edit it remain separate design contexts.

Bound and isolate specimens so their styling cannot escape into operational UI. Never apply an output palette or font to the application root or a parent of operational controls. Inheritance operates within the owning design layer, not indiscriminately through the rendered tree.

## 4. Design principles

| Principle | Required decision | Review question |
| --- | --- | --- |
| Task before decoration | State the user’s job and success condition before arranging components. | What task becomes easier because this element exists? |
| Familiar structure | Choose a page pattern; keep sibling pages structurally consistent. | Can a user predict where the title, controls and result will be? |
| Work receives the space | Give the editor, catalog or decision material priority over promotion. | Is useful work visible in the initial desktop viewport? |
| Explicit consequence | Label commands with a verb and object; distinguish navigation from mutations. | Can the user predict cost, persistence and next state? |
| Truthful state | Show saved, draft, stale, unavailable and pending states from real evidence. | What proves this badge or completion claim? |
| Preserve effort | Keep drafts and valid results through recoverable failure and navigation within work. | What does the user lose if a request fails? |
| Progressive disclosure | Show what the current decision needs; place optional detail near its owner. | Is this information needed now or only for inspection? |
| One visual foundation | Use the installed public library without local reinterpretation. | Did this task introduce a new visual dialect? |
| Creative fidelity | Judge artwork against its brand/template; judge controls against Brutalist. | Are UI conventions accidentally changing the output? |
| Accessible operation | Make every action usable with keyboard, readable labels and responsive layout. | Can the task still be completed without hover or a wide screen? |

These principles apply to every master and descendant, including prototypes intended for integration. Explorations may compare alternative compositions, but must be labeled exploratory and cannot become production precedent merely by being committed.

## 5. Application visual language

### Intent

The application is an **Operate** interface: clear hierarchy, decisive controls, restrained color and visible boundaries around useful work. The installed Brutalist system supplies its character. “Brutalist” is the name of the dependency and its actual contracts; it is not permission to invent oversized type, random thick borders, brutalist poster layouts or decorative asymmetry.

### Token authority

Read public tokens, typography and component declarations from the Brutalist package. Never maintain another authoritative copy of numeric UI values in this document, a design brief or local CSS. The installed foundation defines the visual language; component APIs define its supported application. Recheck those contracts when the dependency changes.

- **Color:** reserve semantic roles for their purpose. Brand palettes belong to artwork. Do not create per-page accent colors or infer status from color alone.
- **Typography:** use public text/heading roles and semantic heading levels separately. One page title; subordinate section headings; readable body and metadata. Do not select the largest heading just because it exists. Do not encode arbitrary visual role names as invalid HTML headings.
- **Spacing:** use the public spacing scale. In a design brief name the supported spacing values chosen for page inset, sections and item gaps. Preserve an established pattern unless the task calls for changing it. Fix structure before repeatedly increasing padding.
- **Surfaces and depth:** use plain regions for ordinary grouping. Add a Surface or Panel for a real boundary: independent object, editable group or contained preview. Avoid panel-inside-panel decoration and shadows on every block.
- **Shape:** inherit supported component shapes. Do not impose a universal corner radius on all components, including tabs and panels.
- **Motion:** use upstream interactions. Application-owned motion must explain progress, causality or spatial change, use available motion tokens and respect reduced motion. No looping decorative motion, staggered work lists or delayed access to ordinary controls.
- **Icons:** use the package’s supported icon contract. Keep actions named; provide accessible labels for icon-only controls. Never add decorative icons to every label as a substitute for hierarchy.
- **Theme:** preserve the supported application theme. A dark specimen or a brand’s inverse palette does not authorize a global dark mode.

### Component selection order

1. Read the installed public export and its actual props/behavior.
2. Reuse a suitable public component or UI block directly.
3. Compose public components inside plain application containers for a domain pattern.
4. Use a small adapter only for callback, value or legacy-prop translation; preserve appearance and interaction.
5. If the required interaction is unavailable, use unstyled native behavior and record the gap in [missing components](docs/design-system/missing-components.md), including the route, behavior, limitation and replacement condition.

Do not style a native fallback to imitate an absent library control. Do not replace required behavior with a superficially similar component. If no safe usable fallback exists, retain the known working interaction, explain the gap and limit the dependent change.

Do not pass `className` or `style` to upstream component roots, target their private CSS classes, redefine upstream tokens, inject a second theme provider or recreate skins through ancestors. Layout CSS may affect the application-owned container itself; broad descendant selectors can still violate the boundary. Existing compatibility adapters are migration debt, not a template for new controls.

## 6. Page patterns and composition

These are application composition patterns, **not claims that matching components are exported upstream**. A new page must select one, or explain why the existing patterns cannot support the user’s task.

### Shared shell

The master shell owns global navigation, identity, shared context, accessibility entry points and the main content region. Descendant surfaces own their local title, task-specific actions and work area. Preserve that division instead of duplicating the application frame within each surface. Use suitable public UI blocks; unsupported interactions follow section 5.

Keep the title and relevant action recognizable across sibling routes. One primary action per decision region; global creation may coexist with a local action only when their scope is clear. A repeated global action must not dominate every page.

### Pattern catalog

These archetypes describe reusable user tasks. They do not prescribe particular destinations, products or fixed flow sequences.

| Pattern | User intent | Composition | Avoid |
| --- | --- | --- | --- |
| Start a task | Supply enough context to begin work. | Instruction → required input → explicit start action. | Multiple competing starts or hidden prerequisites. |
| Browse and choose | Find and select suitable objects. | Scope/filter controls → results → object detail or selection. | Promotion displacing results; inconsistent sibling anatomy. |
| Edit an object | Make and persist a bounded change. | Identity/status → grouped fields → relevant feedback → commit action. | Ambiguous save modes or unrelated edits in one group. |
| Perform a flow step | Satisfy a decision or operation in a larger process. | Prerequisites → working content → local action → result/recovery. | A separate flow engine inside each child step. |
| Inspect a reference | Understand a stable or published object. | Identity/version → section navigation → structured evidence. | Editable-looking affordances on immutable content. |
| Operate records | Compare and manage structured objects. | Scope → useful filters → table/list → bounded detail/actions. | Decorative metrics without an operational decision. |

### Layout contract

Each design brief states its content width strategy, section order, action location, scrolling owner and narrow-screen transformation. Use the selected pattern’s spacing tokens and public layout props. Use a plain container where routing or grid placement is app-owned.

- Use a table for comparing structured records, a list for scanning text, and a preview grid when appearance is the selection criterion. Do not default to cards for everything.
- Align the toolbar and its results to the same work region. Filters should not accidentally reserve a permanent empty column below them.
- Keep the first useful result, input or decision visible at a representative desktop size. A tall callout above a catalog must demonstrate a user need and leave room for work.
- Let text wrap naturally. Do not create a narrow headline column between fixed-width art and actions, or solve wrapping by shrinking text below the public readable role.
- On narrow screens, stack toolbar groups and work regions in logical reading order. Avoid document-level horizontal scrolling. Tables and genuine canvases may use a contained, labeled overflow region with reachable controls.
- Preserve artwork aspect ratios. Responsive **UI** rearranges the editor; responsive **artwork** uses the template’s declared layout per format. Neither is permission to stretch the other.
- Give long content a strategy: wrapping, a recoverable truncated label, pagination or measured virtualization. Do not hide essential identity or actions only to make a screenshot tidy.

### Consistency across descendants

Sibling surfaces serving the same task inherit the same information hierarchy, object anatomy, action semantics and responsive behavior. Content differences do not justify independent shells or interaction models.

Expose scope before the content it governs. Keep prerequisites and recovery near their owning operation. Use capability labels that match real behavior, distinguish inspection from editing, and keep versioned reference states separate from mutable drafts.

## 7. Interactions and states

### Required state inventory

For each data-dependent region and command, define applicable states; mark an inapplicable state with a reason in the brief.

| State | User-facing behavior |
| --- | --- |
| Loading | Retain shell/context; use an honest skeleton or progress indicator for the pending region. |
| Empty | Explain what is absent and provide the authorized next action. |
| No filter results | Preserve filters and provide a way to broaden/reset them; distinguish from an empty library. |
| Ready | Show actual data, selection, scope and available actions. |
| Editing / unsaved | Preserve draft identity; communicate save mode and navigation consequences. |
| Saving / generating / sending | Name the operation; prevent duplicate submission; retain readable work. |
| Saved / succeeded | Show confirmation only after the authoritative result; retain the relevant version or receipt. |
| Partial success | Preserve valid results, state what failed and offer a scoped retry or explicit acceptance where supported. |
| Error | Explain the failure near its owner, retain user input and offer a meaningful recovery. |
| Stale / conflict | Show what changed; retain the draft and require reconciliation before an unsafe write. |
| Permission denied / read-only | Explain the restriction and keep permitted inspection available. |
| Unavailable / unknown outcome | Preserve context; distinguish absent capability from failure and uncertain completion. Reconcile before repeating work. |

### Interaction conventions

- Links navigate; buttons execute commands. Tabs switch peer views; they are not a hidden approval mechanism or substitute for sequential task prerequisites.
- Use radios for a single mutually exclusive choice and checkboxes for independent choices. Selection must remain legible and keyboard-operable; never rely only on hover or outline color.
- Forms have persistent labels, associated help/errors and a stated save model. Keep sensitive drafts out of URLs. Preserve IME composition and captured revisions during autosave.
- Dialogs contain a focused decision or short edit; drawers hold contextual detail. Long multi-step work needs a route. Overlays must preserve focus, have an accessible name and restore focus on close. Keep a keyboard alternative to drag-only actions.
- Put errors and required decisions inline. A transient toast may confirm a completed small action; it must not be the only place to find an unresolved failure or blocked workflow.
- Keep dangerous actions distinct. Use confirmation where consequences warrant it; do not add repetitive confirmations to harmless, reversible choices.
- Never display a fake percentage, invented ETA or blanket “Saved” while writes remain unresolved. “Saving…”, “Saved”, “Could not save” and “Checking result…” have different meanings.

### Accessibility baseline

Target WCAG 2.2 AA: keyboard operation, meaningful landmarks/headings, accessible names, visible unobscured focus, associated errors, appropriate status announcements and sufficient contrast. Check text resizing and reflow at 320 CSS pixels, allowing the standard’s essential two-dimensional-content exceptions. Text contrast is normally 4.5:1, with 3:1 for qualifying large text; relevant non-text indicators need 3:1. Target size at AA is 24×24 CSS pixels or an applicable exception, including spacing. Use larger supported control sizes for comfortable frequent actions. See [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and the [ARIA pattern guidance](https://www.w3.org/WAI/ARIA/apg/patterns/).

A shared component does not prove the assembled page is accessible. If an upstream defect blocks the task, report it and use a permitted fallback; do not silently patch package CSS or claim compliance.

## 8. Brand systems and asset automation

The output design system is a **versioned production contract**. It must tell a renderer what is allowed and give a reviewer evidence of what was produced. A swatch page, inspiration board or static screenshot alone cannot supply that contract.

### Required information for an automation-ready output

| Contract area | Required information |
| --- | --- |
| Identity | Brand ID, published version and source/provenance. Drafts and published versions are distinct. |
| Foundations | Named palette/semantic roles, typography and usable font assets, logos and approved variants. |
| Composition | Reusable graphic/text arrangements, safe areas, alignment, image crop/focal behavior and allowed variants. |
| Content | Declared slots, required/optional fields, fit/length limits and permitted image replacements. |
| Template | Stable template ID/version, bound brand version, supported formats and renderer capabilities. |
| Output | Dimensions/units, static or animated intent, file format and any print bleed/safe-area requirements. |
| Validation | Missing assets, invalid references, font availability, text overflow, required media and unsupported output combinations. |
| Receipt | Exact source/template/brand versions, selected pairings, output list and actual artifact or handoff identity. |

These are acceptance requirements for future automation-capable work, not an assertion that every field exists in today’s schema. Map them to the real schemas before implementation. A missing schema or renderer capability is a product gap; do not invent client-only fields that disappear on save.

### Rules

1. **Author once, reference by identity.** Templates reference published brand data; do not duplicate palette values per template or store brand identity only in a screenshot.
2. **Version intentionally.** Editing a draft does not publish it or alter existing approved outputs. Upgrading a template/brand version is explicit and shows affected results.
3. **Keep deterministic composition.** Identical validated inputs and versions should reproduce composition. Persist procedural shape parameters/seeds. AI generation is a separate operation; freeze its accepted output as an asset rather than expecting regeneration to match pixels.
4. **Validate every requested output.** Never truncate copy, omit required media, substitute an unrelated font or discard a requested size silently. Show the failing template/size/slot and preserve the selection.
5. **Use explicit combinations.** Combine inputs only according to declared associations and output rules. Enumerate the requested result set, make its size understandable and validate every member. Do not create an implicit Cartesian expansion.
6. **Preserve reference fidelity.** Reference images establish visual intent, not editable source, approved claims or asset rights. Label concept/demo content and reference-only previews honestly.
7. **Match preview and output.** Preview and export must use the same versioned composition rules, fonts, content and crops. A browser screenshot cannot prove an editable export works.
8. **Respect supported capability.** Distinguish reference-only, previewable, editable, exportable and automation-ready in data and UI copy. These labels are not interchangeable.

Use the existing brand readiness checks and server publication boundary. For future token interchange, evaluate a deliberate mapping to the [Design Tokens format](https://www.designtokens.org/tr/2025.10/format/); this document does not require changing current schemas or adopting a draft format during UI work.

## 9. Front-end architecture

### Ownership

| Unit | Responsibility |
| --- | --- |
| App entry and shell | Routing, identity, navigation, page boundaries and global layout. |
| Page | Compose the selected page pattern and connect route-level context. |
| Feature/module | Own its task, draft state, validation presentation and named commands. |
| Runtime/coordinator | Scope data, jobs, conflicts, dependencies and cross-module operations. |
| Server/shared contracts | Persisted truth, validation, authorization, version integrity and supported transitions. |
| Renderer | Convert validated versioned content into the specified creative output. |
| Brutalist library | Shared visual primitives and interaction contracts. |

Feature views consume an explicit input/action boundary. They must not bypass the owning command layer, receive unrelated application state unnecessarily or mutate siblings’ drafts. Keep stable mounts and keys; a revision refresh must not remount editors or replace the whole page with a spinner. Capture the input identity at draft creation and carry it to save. Never substitute the latest revision to conceal a conflict.

Use existing named commands and contracts. Check dependents when a contract changes. Do not invent a second workflow state machine in a page, let URL parameters grant access or treat local dirty state as server authorization.

Keep new code near the owning feature; extract a shared **application composition** when its responsibility and reuse are clear. Avoid blanket refactors, new UI libraries or abstractions introduced just to make one page feel novel.

Scope artwork CSS and resource lifecycle. Release object URLs, observers and subscriptions. Load heavy editors/renderers when needed; measure representative bundle and runtime impact before claiming an optimization. Do not animate or remount large result lists on routine updates.

Brutalist lives in this repository as the workspace package `packages/brutalist-design-system`. Change it in the pull request that needs the change, following [design system integration](docs/specs/design-system-integration.md): generic needs go into the package with tests and a documentation example, and breaking public API changes need the owner's approval with consumers migrated in the same change. Application code imports only `brutalist-design-system` and `brutalist-design-system/styles.css`. The dev server and tests use package source, so edits need no rebuild; production builds use the built library.

## 10. Design and development workflow

### A. Discover

Follow the repository’s task-tracking instructions and reuse the matching request. Identify the live source and relevant component, surface or flow. Read this contract, the accepted feature spec, the installed public APIs and existing pattern. Separate current implementation, accepted intent, proposal and historical material.

### B. Define the descendant

Complete the [design brief](docs/design-system/page-brief-template.md) before substantial implementation. Identify the master, inherited guarantees and permitted differences. Specify the user/task, entry and exit, data, hierarchy, component map, behavior/states, responsive rules and acceptance evidence. Sketch composition and state relationships before visual polish.

For a new interaction or uncertain product behavior, compare a small number of concrete alternatives and recommend one based on the task. Ask only about unresolved decisions that materially change scope, workflow, permissions or outputs. Existing user authorization covers routine composition and implementation choices.

### C. Build the smallest complete path

Implement the actual task from entry through its truthful result, including failure recovery. Reuse public components and named domain commands. Use synthetic fixtures to exercise difficult states. Keep any unavailable operation honest; a polished mock must not masquerade as an integrated feature.

### D. Verify the outcome

Run focused checks for the changed behavior and relevant boundaries. Inspect the actual route at wide and narrow widths, keyboard operation and difficult content. Fix observed problems in one coherent pass, then confirm the fixes. Do not continue aesthetic experimentation after the acceptance criteria pass.

### E. Record and deliver

Record what changed, commands and outcomes, inspected instances/states, known limitations and any design-system gap. Update the design brief when the final decision differs. Follow repository requirements for task status, surface identity and verified navigation targets.

## 11. Verification and acceptance

### Required evidence by change

| Change | Minimum evidence |
| --- | --- |
| Documentation only | Check source claims, authority conflicts, links and Markdown; do not claim a UI redesign or full accessibility audit. |
| Layout/copy refinement | Inspect affected route at desktop and narrow widths, long content and keyboard path; run the design-system check for consumer changes. Avoid tests that only mirror CSS. |
| Interaction or state change | Meaningful user-action tests including failure/draft retention; rendered state/keyboard checks; design-system check and build. |
| Shared component consumer or shell | Test affected consumers and navigation/focus; representative route families and responsive states; design-system check and build. |
| Workflow/contract change | Module/command and dependent-chain tests, relevant server authorization/integrity tests, explicit entry-to-result evidence. Never use live paid generation just to obtain a passing screenshot. |
| Template/brand automation | Version/readiness/validation tests plus preview/export comparison for every requested format and capability. |

Application commands, run from the application checkout:

```sh
npm run design-system:check
npm run test:run -- path/to/relevant.test.jsx
npm run build
```

The test path above is an instruction placeholder, not a runnable universal test target. Select actual tests from the changed feature. Run broader suites when shared boundaries or the release scope require them. Isolate tests that mutate shared fixtures or coordinate exclusive access to their test resources.

The design-system check verifies the workspace link, package isolation and vocabulary, public entry points and named imports, token/class boundaries and explicit component-root styling. It does not prove arbitrary spread props, every ancestor selector, correct page composition, accessibility, brand fidelity or workflow behavior. Visual and interaction evidence remains required.

### Review gates

- **Purpose:** the page has a specific user task and success condition.
- **Product:** actions and states match accepted behavior; proposals are identified.
- **Layer:** UI and artwork have separate authorities and styling boundaries.
- **Inheritance:** the descendant preserves its master’s guarantees and uses supported variation.
- **Composition:** the surface follows its pattern; useful work has visual priority.
- **Interaction:** keyboard, focus, labels, responsive use and recoverable failure work.
- **Integrity:** drafts, selected identities, revisions and server permissions survive changes.
- **Evidence:** the checks demonstrate the requested result; no unverified completion claims.

A boundary violation, fabricated capability/state, lost draft, broken authorization, unusable primary task or unverified required output blocks readiness. Minor unrelated historical issues are recorded with scope; they do not justify rewriting the application during a narrow task.

## 12. Governance and adoption

### One contract, clear supporting files

This file owns general front-end design and development policy. Product specifications define user needs and accepted capabilities. Master contracts define reusable components, compositions and flows. Instance briefs define permitted specializations. [DESIGN.md](DESIGN.md) is the current visual guide; it describes how to apply the foundation without duplicating its token authority. Domain schemas and the installed package remain executable authorities within their scope.

Keep named screens, brand examples, route maps, fixed workflow sequences, implementation inventories and dated audits in their owning specifications or records. They must not become global rules for unrelated descendants.

A skill may help apply the process, but must link to this file rather than duplicate its rules. Merely installing a skill does not make agents invoke it; therefore `AGENTS.md` and `CLAUDE.md` explicitly route front-end work here. This is instructional enforcement plus existing checks, not an automatic universal guarantee.

### Decision and exception record

Record an exception in the affected design brief or feature spec with: rule, concrete user need, evidence, chosen alternative, approving decision where required, affected routes, verification and removal/review condition. Routine use of an existing pattern is not an exception. Workspace-package changes follow [design system integration](docs/specs/design-system-integration.md): additive changes are pre-approved, breaking changes require the owner's approval (D36). Do not weaken this contract silently to make a local patch pass.

Change global principles only when a recorded product decision or repeated evidence justifies it. Update the contract and affected briefs together; identify which earlier rule is superseded. Review reusable patterns for demonstrated need, usability, consistency and applicability across real uses, following the reasoning behind [GOV.UK’s contribution criteria](https://design-system.service.gov.uk/community/contribution-criteria/), while retaining Brutalist as the visual authority.

### Adoption order

1. **Establish authority:** keep the governing contract and design-brief template discoverable from the application’s agent instructions.
2. **Apply on authorized work:** identify the master, record the descendant’s permitted differences and correct the touched inconsistencies. Do not treat existing instances as automatic compliance examples.
3. **Review shared foundations:** prioritize masters by user impact and the number of descendants they affect; establish a verified reference for each pattern.
4. **Automate stable checks:** consider master/descendant contract coverage and targeted visual regressions once the patterns are established. Specify and implement these checks separately.

Track reopened design decisions, repeated local overrides, task completion failures, lost-work defects and duplicate page patterns. Use real findings to refine guidance; do not invent adoption statistics or promise consistency solely because this file exists.

## 13. Evidence and references

Apply this contract using current evidence from the owning layer:

- The accepted product/feature specification for intent, permissions and flow behavior.
- The Brutalist package's public API and version for component and token contracts.
- The master composition or flow specification for inherited guarantees and supported variation.
- The descendant’s design brief for task-specific choices and verification.
- Domain schemas and fresh tests for supported states, persistence and completion evidence.
- Published output-system and template versions for artifact composition and validity.

Inspect [the application manifest](package.json), [the Brutalist package manifest](packages/brutalist-design-system/package.json) and [recorded component gaps](docs/design-system/missing-components.md) when evaluating implementation compatibility. Store exact versions, source paths and audit findings in the relevant verification record rather than freezing them into this policy.

The [DESIGN.md format](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md) is useful for a portable visual description. This contract is deliberately broader: product behavior, page patterns, data ownership and delivery gates cannot be communicated by a palette and typography specification alone. It does not introduce a second machine-readable UI token source.
