# Component, surface and flow brief

Use with [FRONTEND.md](../../FRONTEND.md). Save a filled brief in `docs/design-system/pages/` using the feature name, not a guessed URL. Use it for masters and their descendants. This is a template, not an accepted instance specification. Replace prompts with concrete decisions; mark inapplicable items with a reason.

## Identity and authority

- Component / surface / flow:
- Task ID and owner:
- Status: proposed, accepted, implemented or superseded; include evidence for the chosen status.
- Actual route and stable section anchor, where applicable:
- Source entry point:
- Accepted user request / feature specification:
- Decision history: date, changed decision, reason, source of authorization.

## Master and inheritance

- Owning design layer:
- Master component, composition or flow and its contract/version:
- Is this a new master, configured instance, supported variant or composition?
- Inherited visual, semantic, interaction and data guarantees:
- Public extension points used:
- Permitted differences and their task-based rationale:
- Parent/child flow prerequisites, side effects and completion evidence, if applicable:
- Other descendants affected by a master change:
- How contract preservation will be verified:

## User and outcome

- Who is using this component, surface or flow, and with what permissions?
- What are they trying to do in one sentence?
- What brings them here? What marks success? Where do they go next?
- What is explicitly outside this change?

## Pattern and hierarchy

- Pattern from FRONTEND.md and closest verified master or sibling implementation:
- Surface mode: Operate for application work; identify any bounded Read/Experience/artwork region.
- Content order: title/context → task controls → work → result/recovery.
- Primary action: label, region, preconditions and consequence.
- Secondary actions and why each belongs here:
- Initial desktop viewport: useful input, result or decision visible without scrolling.
- Container width strategy, token-based inset/gaps, grid/list/table choice and scrolling owner:

## Design layer and component map

| Region / interaction | Owning layer | Public export and verified API, or plain/native composition | Reason / gap |
| --- | --- | --- | --- |

- Installed package provenance checked:
- Artwork isolation and brand/template version, if applicable:
- Existing adapter used and why translation is necessary:
- Missing-component record and removal condition, if applicable:

## Data and behavior

- Real object/schema and data source:
- Draft owner, persistence mode and captured revision/input identity:
- URL state versus local transient state; sensitive data excluded from URLs:
- Named commands and server authorization:
- Entry → action → authoritative result → next state:
- Back/refresh/deep-link behavior, selection retention and unsaved navigation:
- AI dispatch versus observation; uncertain request reconciliation:
- Effects on dependent outputs and stale-state rules:

## State matrix

For each region/command, fill the applicable states from FRONTEND.md. Cover loading, empty, no results, ready, unsaved, busy, success, partial result, error, stale/conflict, read-only and unavailable/unknown.

| Region + state | Trigger / source evidence | What the user sees and can do | What is retained | Verification |
| --- | --- | --- | --- | --- |

## Responsive and accessible operation

- Desktop and narrow widths to inspect; 320 CSS px reflow/zoom check as applicable:
- How the toolbar, columns, preview and action group rearrange:
- Long titles/content, missing images and large collections:
- Keyboard path, focus on navigation/overlay close and accessible labels:
- Reduced motion, announcements, errors and non-color state indicators:
- Any contained two-dimensional overflow and how its controls remain reachable:

## Output contract, when producing creative

- Capability: reference-only, previewable, editable, exportable or automation-ready; evidence:
- Brand version, template version, source content/assets and selected pairings:
- Requested formats, dimensions/units and exact expected output count:
- Fit/font/media validation, preview/export parity and failure behavior:
- Required persisted artifact/handoff receipt:

## Acceptance and evidence

Write observable scenarios, not “looks modern” or “works correctly.”

| Scenario / action | Expected visible and persisted result | Test or browser evidence |
| --- | --- | --- |

- Focused tests and outcomes:
- `npm run design-system:check` outcome:
- Build outcome when required:
- Actual browser routes, viewport sizes and states inspected:
- Known gaps, owner and next action:
- Repository-required task/surface tracking and navigation verification, where applicable:

## Exceptions

For each exception: contract rule, demonstrated user need, alternatives, chosen decision, authorization when required, affected surfaces, verification and review/removal condition. Write “None” when none apply.
