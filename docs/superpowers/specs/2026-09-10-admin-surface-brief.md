# Admin foundation — surface brief

## Purpose and users

An internal operations administrator needs to understand current application records and configure product recipes without changing source code. The user requested a separate admin shell, a canvas-first node editor, and a foundation for future system monitoring and tasks. This release delivers system visibility and recipe authoring; durable execution and task assignment remain later stages.

## Visual direction

Inherit `DESIGN.md` and the installed application design system: Avenir typography, neutral surfaces, cyan primary actions and black structural rules. Reuse canonical components backed by `brutalist-design-system`. This is an operational workspace in the same product, not a new visual brand.

Use a distinct admin navigation menu and a visible Back to Studio destination. Retain consistent controls, spacing and focus behavior. The menu contains Overview; Users, Projects, Assets; Product recipes, Modules; System work, Activity. Campaign creation and recent-campaign shortcuts belong to the Studio shell.

## Hierarchy

The overview answers how much work exists, what state it is in, and where to investigate. Use actual record counts and bounded activity. Each metric states its scope or time window; absent measurements remain unavailable. Tables have search, relevant filters, pagination and related-record links.

The recipe list contains the persisted product families. Opening a recipe gives most of the workspace to React Flow. Nodes are draggable, arranged left to right initially, and connected by visible directional edges. Conditions expose distinct true/false branches. Compact secondary controls provide save, validation, simulation and publication. Clicking a node opens its labelled settings and AI-instruction inspector while retaining usable canvas space.

## Authoring states

- Loading, empty and request-error states explain what happened and provide an appropriate next action.
- Unsaved changes remain visible and survive failed requests. Conflicts offer reload without silently discarding the local draft.
- Validation identifies the node/edge requiring attention.
- Simulation shows fixture inputs, visited nodes, decisions and pending questions. AI/render steps are explicitly synthetic.
- Publishing records a change note and immutable version. Activation is separate; switching the active version preserves the draft.
- Unauthorized direct routes show denied access. UI hiding supplements backend authorization.

## Interaction and responsive checks

Use stable node identity so editing does not remount the inspector or lose focus. Keep fields labelled and actions keyboard reachable. Navigation must protect unsaved edits, including browser history. On narrow screens, navigation and the inspector must remain reachable without forcing the page itself into horizontal overflow; data tables may scroll locally. A drawer/dialog, when used, handles Escape and focus return.

## Source of truth and acceptance

The shared recipe contracts and backend catalog define supported capabilities. The draft is the editable graph source of truth. A published reference is derived from the exact immutable definition. The UI must not fabricate runtime results or fall back to hard-coded recipes when API data is missing.

Acceptance covers save/reload, graph edits, condition and question policies, exact saved-hash simulation, publish/activate/history, admin permissions, read-only record navigation and desktop/narrow inspection. Use the isolated local preview and synthetic data. Preserve the existing six campaign modules and review authority.
