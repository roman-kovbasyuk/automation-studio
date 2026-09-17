# Banner creation rebuild

> **Review note, 16 September 2026.** Later decisions change parts of this brief: designer review becomes an escalation path ([D1](../../product/decisions.md)) and the visible flow becomes the four-stage asset creation flow — Brief, Copy, Visuals, Assets ([D6](../../product/decisions.md)). Its navigation, draft retention and no-implicit-generation requirements still apply. Its review, approval and Distribute requirements are superseded and will be re-specified.

## Identity and authority

Accepted implementation request, 16 September 2026. Observatory b232135a-3c4a-48c8-af05-0e419da23066. Source: FigJam Project-X node 10:484, explicitly validated by the user. Entry: src/studio/campaign/CampaignPage.jsx. Existing route /mvp/campaign/:id?module=:module#campaign-module-:module.

## Master and inheritance

Application composition of the existing campaign runtime/coordinator flow. Installed Brutalist owns all visual primitives. Inherit permission checks, captured input revisions, explicit generation, reconciliation, partial-result retention, source provenance and version-bound approval/export. Change presentation only: one active task, persistent step navigation, retained mounted drafts. Review stays inside Banners. No alternative workflow engine or backend rewrite.

## User and outcome

A marketer confirms source context, selects copy and visuals, prepares exact banner designs/sizes, reviews the resulting version and downloads its approved package. Existing prototype API simulates those operations without production AI calls. Production side effects/authorization remain owned by the runtime.

## Direction contract

THESIS: one working step with an explicit next action and a persistent overview of the whole journey.
OWN-WORLD: installed Brutalist typography, neutral surfaces and accent actions; original public controls and spacing tokens.
STORY: see the current decision, edit or select its inputs, continue with retained context, return without losing drafts.
FIRST VIEWPORT: project heading, five-step navigation, active task and its controls. Inactive task forms do not compete for attention.
FORM: established application Operate composition, accepted FigJam sequence Brief → Copy → Visuals → Banners → Distribute. No new aesthetic randomization or product sequence.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Component map

| Region | Owner and API |
| --- | --- |
| Progress | Brutalist WorkflowSteps steps/current/onChange; domain access maps to disabled/complete |
| Step task | Existing ModuleHost/runtime; application hidden wrappers retain visited views |
| Actions/fields/status | Brutalist Button, TextField, TextArea, RadioGroup, Checkbox, Select, Tag, Alert, Text |
| Creative preview | Existing versioned banner renderer, isolated from application UI |

## Data and behavior

URL selects the visible module, with guarded fallback for unavailable deep links. Local form drafts stay in mounted visited views across navigation and refresh. No navigation-triggered AI dispatch. Command coordinator owns saved confirmation, selected identities, dependencies and output transitions. Source changes invalidate only declared dependent outputs. Error recovery checks existing work before retrying uncertain commands.

## States and acceptance

- Empty brief: materials input and explicit analysis; schema-2 review shows the approved three groups.
- Copy ready: editable options, persistent origin/selection, append batches, explicit continuation; pending/error keeps results.
- Visuals: tailored/universal/upload, current pairing, successful partial results retained.
- Banners: exact selected designs/sizes, review receipt, designer/approver states and verified export remain authoritative.
- Distribute: complete approved package required.
- Locked deep links: show available task, explain unavailable step; never dispatch work.
- Navigation/back/refresh: do not remount drafts or generate implicitly.
- Responsive: narrow navigation wraps/scrolls within its region; task containers min-width zero, controls use public reflow.
- Keyboard: public step buttons; active task region receives focus after navigation; hidden tasks absent from accessibility tree.

## Verification

In progress. Focused navigation/draft-retention tests first, then module/chain tests, design-system:check, build and browser desktop/narrow simulation. Visuals currently has a stale Vite optimized export error despite installed FancyButton being exported; verify with fresh cache/server, never patch the package. No final completeness claim yet.

## Exceptions

None. Existing DESIGN.md and package remain unchanged; preserve unrelated dirty checkout work.
