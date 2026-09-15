# Offline prototype launch brief

## Identity and authority

- Component / surface / flow: Offline prototype entry surface
- Task ID and owner: Task A1, prototype-first integration
- Status: implemented; focused tests and prototype build are the evidence.
- Actual route and stable section anchor: `/` in prototype mode, `#prototype-title`
- Source entry point: `src/main.jsx`
- Accepted user request / feature specification: launch a bounded prototype without live authentication, API services or provider requests.
- Decision history: 15 September 2026, prototype mode is selected by Vite mode; URL flags do not select it.

## Master and inheritance

- Owning design layer: application patterns, using Brutalist foundations.
- Master component, composition or flow and its contract/version: application root and existing public styles.
- Is this a new master, configured instance, supported variant or composition? A configured prototype entry composition.
- Inherited visual, semantic, interaction and data guarantees: semantic heading, readable status, existing global styles and React StrictMode.
- Public extension points used: Vite mode and lazy React entry.
- Permitted differences and rationale: bundled offline loading copy is the only A1 variation; A3 owns the workspace composition.
- Parent/child flow prerequisites, side effects and completion evidence: no side effects; entry renders a bounded loading state.
- How contract preservation will be verified: entry tests, network guard tests and both normal/prototype builds.

## User and outcome

- Who is using this surface: a local evaluator with no service credentials.
- What are they trying to do in one sentence? Open the prototype and see that it starts without authentication or a running backend.
- What brings them here? The prototype launch command; success is the offline entry visible at `/`.
- What is explicitly outside this change? Workspace data, generation, media, review and delivery, which are later tasks.

## Pattern and hierarchy

- Pattern from FRONTEND.md: Operate surface with title/context, then bounded status and recovery messaging.
- Surface mode: Operate, with no external artwork region.
- Content order: title/context → loading status.
- Primary action: none in A1; A3 adds the workspace actions.
- Initial desktop viewport: title and status are visible immediately.
- Container strategy: plain application-owned main region; no new component skin or token source.

## Data and behavior

- Real object/schema and data source: none in A1; bundled static entry only.
- Draft owner, persistence mode and captured revision/input identity: not applicable.
- URL state versus local transient state: Vite mode selects the entry; `?prototype=true` is ignored in normal builds.
- Named commands and server authorization: none.
- Entry → action → authoritative result → next state: mode selection → lazy entry import → bounded prototype view.
- Back/refresh/deep-link behavior: root refresh stays in the selected build; normal build always uses the live application entry.
- AI dispatch versus observation: no dispatch or observer.
- Effects on dependent outputs and stale-state rules: none.

## State matrix

| Region + state | Trigger / source evidence | What the user sees and can do | What is retained | Verification |
| --- | --- | --- | --- | --- |
| Entry loading | Lazy import pending | Accessible loading status | Nothing | `entry.test.jsx` |
| Entry ready | Prototype module loaded | Offline prototype heading and explanation | Nothing | `entry.test.jsx` |
| Network unavailable | Any blocked API/service/external fetch | Rejected promise with stable error code | No request sent | `networkGuard.test.js` |

## Responsive and accessible operation

- Desktop and narrow widths to inspect: title/status use normal document flow and remain readable at narrow widths.
- Keyboard path: no interactive controls in A1; heading and status are semantic.
- Reduced motion, announcements, errors and non-color state indicators: status uses `role=status`; no motion or color-only state.

## Acceptance and evidence

| Scenario / action | Expected visible and persisted result | Test or browser evidence |
| --- | --- | --- |
| Open prototype build | Offline prototype entry renders without live initialization | `entry.test.jsx`, `npm run build:prototype` |
| Request `/api`, `/healthz`, `/readyz` or external URL | Promise rejects with `prototype_network_blocked`; implementation is not called | `networkGuard.test.js` |
| Open normal build with `?prototype=true` | Normal application entry remains selected | `entry.test.jsx`, `npm run build` |

- Focused tests and outcomes: A1 tests pass after implementation.
- `npm run design-system:check` outcome: run as part of prototype build pre-script.
- Build outcome when required: prototype and normal production builds verified.
- Known gaps, owner and next action: A3 connects the local workspace to this entry.

## Exceptions

None.
