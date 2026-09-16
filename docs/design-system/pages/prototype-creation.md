# Offline prototype creation flow brief

## Identity and authority

- Component / surface / flow: Offline prototype entry and end-to-end campaign creation flow
- Task ID and owner: `fd42bdb8-9e37-4c86-95c9-c72c106b5ca2`, prototype-first integration
- Status: implemented for the banner journey; focused tests, build and browser flow are the evidence.
- Actual route and stable section anchor: `/` in prototype mode; campaign workspace uses `#campaign-module-brief`, `#campaign-module-copy`, `#campaign-module-visuals`, `#campaign-module-banners`, and `#campaign-module-distribute`.
- Source entry point: `src/main.jsx` → `src/prototype/PrototypeApp.jsx` → `src/studio/StudioApp.jsx` / `src/studio/campaign/CampaignPage.jsx`
- Accepted user request / feature specification: launch a reversible, backend-independent clickable prototype for evaluating the complete banner creation flow before reconnecting backend and AI providers.
- Decision history: 15 September 2026, prototype mode is selected by Vite mode; URL flags do not select it. Brief clarification is intentionally a sequential preflight before the full workspace appears.

## Master and inheritance

- Owning design layer: application patterns, using Brutalist foundations.
- Master component, composition or flow and its contract/version: `ConnectedStudio` owns the application shell, `CampaignPage` owns campaign composition and module navigation, and `BriefingClarificationWizard` is the prototype-only briefing preflight descendant.
- Is this a new master, configured instance, supported variant or composition? A configured offline runtime with the existing campaign composition plus a sequential briefing variant.
- Inherited visual, semantic, interaction and data guarantees: Brutalist public controls and tokens, application-owned layout containers, semantic headings/statuses, keyboard-accessible controls and React StrictMode.
- Public extension points used: Vite prototype mode, lazy entry, module `prototypeMode` prop, memory/IndexedDB store and local API-compatible adapters.
- Permitted differences and rationale: the prototype owns local persistence, deterministic generation/jobs and demo role switching; it does not restyle or fork shared controls. Before confirmation, only the wizard is shown. After confirmation, the normal campaign module hierarchy and right-hand workflow navigation are revealed.
- Parent/child flow prerequisites, side effects and completion evidence: analyze brief → complete Banner copy, Campaign and Visual content cards in order → automatic brief confirmation → full workspace navigation. All writes remain inside the local prototype store.
- How contract preservation will be verified: wizard/module tests, prototype API/session tests, network guard tests, design-system check, prototype build and browser verification of the banner review and delivery flow.

## User and outcome

- Who is using this surface: a local evaluator with no service credentials.
- What are they trying to do in one sentence? Open the prototype and see that it starts without authentication or a running backend.
- What brings them here? The prototype launch command; success is the offline entry visible at `/`.
- What is explicitly outside this change? Live backend/provider calls and production authorization. Presentation-specific screens remain a follow-up slice using the same prototype runtime contract.

## Pattern and hierarchy

- Pattern from FRONTEND.md: Operate surface with title/context, then a bounded task flow and recovery messaging.
- Surface mode: Operate, with a local simulation badge and campaign workspace.
- Content order: title/context → brief analysis → sequential clarification stack → full workspace modules → review/delivery.
- Primary action: Analyze brief, then the current clarification choice; the final visual choice advances automatically.
- Initial desktop viewport: title and status are visible immediately.
- Container strategy: plain application-owned main region; no new component skin or token source.

## Data and behavior

- Real object/schema and data source: prototype workspace/briefing contracts backed by `createPrototypeSession`; deterministic fixtures and generated results are stored locally.
- Draft owner, persistence mode and captured revision/input identity: local marketer/designer demo actors, IndexedDB when available with a memory fallback, revision increments on each write, and idempotent job receipts.
- URL state versus local transient state: Vite mode selects the entry; `?prototype=true` is ignored in normal builds.
- Named commands and server authorization: none.
- Entry → action → authoritative result → next state: mode selection → local session → analyze brief → wizard card completion → `confirmBrief` → normal module navigation → review/approval → delivery download.
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
