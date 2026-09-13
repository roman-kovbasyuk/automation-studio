# Component review — rounds 1–2

Status: implementation authorized by the user's subsequent “implement” request. Both rounds implemented in the atomic rewrite; the original review notes below are retained as historical requirements, not current blockers.

## Implementation outcome

- Shared custom Select/DatePicker panels, compact short-value fields, non-shifting single focus stroke, custom answers, 25px checkboxes and radio hover treatment.
- Tag/status and segmented Tabs presentations consolidated, retaining compatibility exports. Internal tag/toast dismissal, circular Alert icons, circular WorkflowSteps, aligned sortable table headers, single NumberStepper dividers and Rating motion.
- Catalog: full Lucide search, radio-controlled preview sizes and copyable Icon usage; gentle motion previews; wrapping/layout and Skeleton examples; city search; confirmation/warning dialogs; upload progress, failure, retry and removal.
- Uploads are explicitly simulated locally. No server upload, commit, publication or production-app migration was performed.
- Architecture remains Atoms → Components → catalog composition. Catalog filters orchestrate state; reusable components own styles and interaction.

### Verification and limitations

- 66 component/catalog tests and 6 boundary-verifier tests pass; source boundary check, TypeScript, catalog/library builds pass.
- Desktop and 390px browser checks: icon search/copy/32px sizing, custom dropdown answers, calendar selection, upload error/retry/success, workflow connectors, field focus dimensions and no horizontal page overflow.
- Fresh independent package consumer verifies all 44 public exports. Consolidated aliases share 41 catalog groups.
- Impeccable review preserved the established visual system. Its detector flags only the existing ProgressBar width transition; ProgressBar was explicitly approved and was left unchanged.
- The full Lucide registry produces a large-chunk build warning (catalog approximately 288 KB gzip; all-components consumer approximately 281 KB gzip). This is a performance follow-up, not a failed build.
- The unrelated Observatory harness cannot complete under the installed Node 25 runtime: two test processes abort with a native async-hook assertion. No Observatory code was changed.

Scope: Round 1 covers Atoms and Components through Alert. Round 2 continues from Form through Skeleton. InlineText, TextAction, PasswordField and Spinner have no specific new feedback and are not implicitly approved. Round 2 overrides earlier uncertainties where explicitly noted below.

## Approved / unchanged

Color, typography/fonts, spacing, shape and sizing, elevation, Panel, Breadcrumbs, Pagination, Slider, RangeSlider and ProgressBar are approved as shown. Button is approved apart from demo-copy cleanup. Toggle is understood as approved apart from demo-copy cleanup (the transcript says “Double”). ProgressRing was not explicitly named; do not infer separate approval from “everything is good.”

## Requested changes and our understanding

| Area | Understanding of requested change | Ownership / confirmation notes |
| --- | --- | --- |
| Motion | Show gentle animated demonstrations of the motion types used in the system, so movement and timing are visible instead of only described. | Catalog demonstration using existing motion tokens. Preserve reduced-motion support. Do not change the approved motion values without another request. |
| Icons — search | Add search across the icon library, with results displayed as clickable icon buttons. | Catalog discovery UI. Confirm whether “library” means the full Lucide library or the currently exposed canonical icon registry. |
| Icons — size | Put a radio group for icon sizes in the gray header filter bar. Changing size updates icons in the result previews. | Reuse RadioGroup and icon size tokens. The clickable target can remain accessible while its icon changes size. |
| Icons — copy | Clicking an icon result copies it for reuse. | Confirm the copied payload: recommended canonical `<Icon name="…" size="…" />` usage, versus name or SVG. “Search through buttons” is understood as searchable icon buttons, not a new Button search feature. |
| Layout | Make the alignment/wrapping example visibly demonstrate how real content aligns and wraps. Current labels alone are not explanatory enough. | Catalog-only example. “Rapid layout” is tentatively interpreted as wrapping/Inline layout; confirm if a different pattern was intended. |
| ScrollArea | No change in this pass. Avoid introducing it unnecessarily. If used in future, it should have a canonical custom scrollbar. | User explicitly retracted the immediate change (“Actually no changes needed”). No removal or global scrollbar work now. |
| Button | Keep the component. Remove the fake search response “No campaigns match this example search.” and unnecessary demo-result copy. | Catalog cleanup, not deletion of the search/icon-only Button variant. |
| Panel | No change. | Both current variants remain. |
| TextField — controls | Put Disabled and Error controls in the section header filter bar. | Catalog state controls; actual states remain owned by TextField. Error should not require a separate “Show error” action in the content. |
| TextField — focus | Replace the double outline/ring with one structural border that increases from 1px to 2px when focused. | Canonical component styling, not a catalog override. Preserve geometry so focus does not shift text or layout; keep a visible keyboard-focus indication. |
| TextField — width | Short-value fields such as Daily budget and Publish time should size to their content instead of stretching across the full group. | A shared content-width option for suitable field types, not hard-coded screen widths. Long/freeform fields remain full width. Allow space for native affordances and changing values. |
| Checkbox | Remove unnecessary demonstration text and make the mixed state understandable. The “Restore mixed state” button is confusing. | The current button resets a tri-state checkbox to indeterminate, meaning some items are selected. Recommended interpretation: replace it with a clear header state control/demo; retain real mixed-state support. Exact replacement is not yet confirmed. |
| RadioGroup — hover | Add a small, gentle hover microinteraction. | Component-owned; retain keyboard focus, disabled behavior and reduced-motion support. No animation style has been selected yet. |
| RadioGroup — custom option | Support an optional final “Other/custom” choice with an inline text field for the user's own answer. Selecting it enables/activates editing; its custom value becomes part of the controlled selection data. | Shared component capability, not private catalog markup. The exact public API and empty-custom validation need design before implementation. |
| Select — custom answer | The custom/free-text final option may also be needed in Select. | User said “or even the select”; record as a scope question, not settled implementation. |
| Toggle | Keep the interaction as it is; remove redundant “Autosave is on” demo-result text. | “Double” interpreted as Toggle from catalog order. |
| TextArea | No distinct visual change was explicitly specified. | Cross-cutting demo-copy cleanup applies. Whether the new single-border focus rule applies to all fields should be confirmed as part of the shared field contract. |
| Select — popup | Replace the native system dropdown with a custom popup, using the previous design-system Select as the visual and behavioral reference. | Implement in the new canonical Select; do not import the legacy layer or patch catalog CSS. Preserve keyboard navigation, labels, disabled options, dismissal and selection semantics. Inspect the legacy reference before defining details. |
| Select — focus/open | Use a single stronger structural border for focused/open state, with no double stroke. | Shared control styling; prevent layout shift. |
| Tag — variants | Provide configurable status/color variants and labels. | Component capability, demonstrated in catalog. Final status vocabulary/colors are not specified by this comment. |
| Tag — dismiss | Put a much smaller close icon inside the tag, with no elevation. It must not look like a separate full-size action button. | Keep a semantic, keyboard-accessible button internally; the request is interpreted as changing its presentation and placement, not removing accessible button behavior. |
| SegmentedControl | Call it “Tabs” and remove the selected-density demo-result text. | Naming needs resolution: the library already has a separate Tabs component with associated tab panels. Recommended direction: one Tabs family with segmented styling for true tabs, while preserving selection semantics for density/value choice. Do not blindly rename exports or change ARIA roles. |
| NumberStepper | Remove doubled vertical dividers between minus, input and plus. Each boundary should have one line. | Component-owned border treatment; potentially remove the input's left/right borders rather than doubling adjacent button borders. Preserve outer border and focus indication. |
| Rating | Use button-like animation/feedback for rating choices. | Interpret as reusing the canonical Button motion language, while preserving radio-group selection and keyboard semantics. Literal replacement with Button markup is not yet decided. |
| StatusBadge + Tag | Prefer one component because the current patterns look the same. | Consolidate through configurable Tag/status variants if confirmed; decide public export compatibility separately rather than silently deleting StatusBadge. |
| Alert (inferred) | Remove the colored left stripe. Put the icon in a circular, color-coded container instead. | The transcript says “All right” immediately after StatusBadge; catalog order suggests Alert. Confirm target. Retain clear status text and non-color meaning. |

## Cross-cutting cleanup

- Remove redundant catalog-only status narration such as “Selected format: portrait,” “Autosave is on,” “No channel selected,” and “Selected density: spacious.”
- Do not indiscriminately remove real field errors, required instructions, useful help text, accessible names, loading/saving feedback or assistive announcements needed to understand an interaction.
- Styling and behavior stay with the owning shared Component/Atom. Catalog header filters only orchestrate state.
- No implementation, package rebuild, API removal, commit or publication is part of this collection pass.

## Decisions to confirm before implementation

1. Icons: full Lucide library or currently exported registry; copy component usage, name or SVG?
2. Layout: does “rapid layout” mean the wrapping/Inline alignment example?
3. Custom final answer: RadioGroup only, or Select too?
4. Naming: resolved in Round 2 at the product level—keep the segmented presentation as Tabs and retire the current separate Tabs presentation. Semantic/API migration still needs design.
5. Final stripe/icon comment: does it refer to Alert?

Other details (hover motion, exact Tag statuses, content-width sizing, mixed-state demo and export compatibility) will be proposed in the implementation design after this requirements list is confirmed.

## Round 2 — additional comments

Documentation only. No implementation requested at this stage.

| Area | Understanding of requested change | Ownership / confirmation notes |
| --- | --- | --- |
| Form / FormActions | Both look good; preserve them. | “Form formation” is interpreted as Form and Form actions. |
| SearchField | Demonstrate searching a list of cities, with visible filtered results, so behavior can be understood. | Catalog data and composition; reuse the shared search field. Show initial results, matching results, no results and clearing. Replace mere “Searching for…” narration with useful results. |
| DatePicker — popup | Replace the native date-picker popup with a calendar panel matching the design system. | Shared DatePicker capability. Use canonical typography, colors, buttons and focus behavior. Preserve keyboard date navigation, date constraints and accessible labeling; do not restyle an inaccessible imitation. |
| DatePicker — width | Size the date field to its known date format/content rather than full width. | Same shared content-width requirement as budget/time fields from Round 1. Account for locale format and calendar affordance. |
| Menu | Approved. | “Form menu” is interpreted as Menu following DatePicker in catalog order. Global demo-copy cleanup still applies. |
| Dialog | Current dialog is approved; add examples/types such as confirmation and warning dialogs. | Reuse the same Dialog family. Confirmation/warning variants should differ in appropriate icon, message and actions, not duplicate modal implementations. Exact additional variants are not yet specified. |
| Drawer / Popover / Tooltip | Approved as shown. | No new behavior changes. |
| Toast | Move dismissal inside the toast; eliminate the separate outside button and gap/extra layout area. | Keep a small accessible icon button with sufficient usable target, but no separate button block. “No spacing for it” is interpreted as no external gap, not overlapping content or zero hit area. |
| Tabs / SegmentedControl | Use the existing segmented-control presentation as Tabs. The current separate Tabs presentation is not needed. | This resolves the Round 1 visual naming direction. Consolidate rather than maintaining two competing catalog components. Preserve correct tab-versus-value-selection semantics; do not silently convert density options into tab panels. Export/consumer migration is a later design step. |
| Checkbox | Increase the visible checkbox width and height by approximately 20–25%. | Canonical Checkbox sizing, propagated everywhere. Proposed exact multiplier: 1.25; user has not selected 20% versus 25%. Keep label alignment, mixed/check marks and focus treatment proportional; maintain accessible hit targets. |
| WorkflowSteps | Redesign using the previous version as inspiration. Put step numbers or state icons inside circles, with title/description beside each circle. Connect circles in vertical orientation; no connecting lines in horizontal orientation. | Shared WorkflowSteps owns this. Inspect legacy reference before implementation. Preserve current/completed/pending/disabled states and keyboard interaction. “Global steps” is interpreted as Workflow steps. |
| Table — alignment | Align column captions with the content text below them. | Shared header/cell spacing, accounting for sorting icons without indenting caption text. |
| Table — sorting | Make the sortable header cell the highlighted, clickable surface instead of showing a standalone Button in the header. | Component-owned header interaction. Keep keyboard activation, visible focus and aria-sort; an unstyled semantic button can still be used internally. Not a request for inaccessible click-only table cells. |
| Combobox | The current standalone presentation is unclear and should not remain in that form. Prefer a dropdown presentation. | Current purpose: typing narrows a list, then the user selects one known option. Recommended interpretation: make searchable selection a variant of the shared dropdown family instead of a separate-looking control. Removing the capability or public export is not yet confirmed. |
| MultiSelect | Use the same visual dropdown family, with selected items represented by tags. | Preserve multiple selection, removal and keyboard behavior; use revised Tags with internal close icons. |
| InlineConfirmation | Group it on a subtle warm-gray surface. Keep confirmation actions horizontally inline; include supporting text. | Tentative layout: prompt/supporting text plus an inline action row inside a compact shared Panel treatment. Exact “text below” placement is ambiguous; confirm before layout implementation. Wrap actions responsively only when necessary. |
| FileDropzone | Make the drag-and-drop upload area clear and show a complete interaction/state demonstration using design-system Buttons. | Propose states: idle, drag-over, disabled, validating/uploading, uploaded/success, rejection/upload error, retry and removal. Uploaded files should appear with working delete controls. Keep file validation and status announcements canonical. Demo can simulate upload progress/errors; do not imply server upload unless a real upload integration exists. |
| FileList | Show it together with upload outcomes and removal, rather than only as a disconnected sample. | Compose existing FileList with FileDropzone in the catalog; maintain shared owners. Whether to retain a separate FileList catalog entry is not decided. |
| EmptyState | Explain its purpose and suitable usage. | Explanation below; no redesign/removal requested. |
| Skeleton | Approved. Show it in realistic Panel or layout loading examples. | Compose the existing Skeleton; no new loading visual style requested. |

### EmptyState — purpose and examples

EmptyState explains why a region has no content and, when useful, gives the next action. It prevents an empty panel from looking broken or unfinished.

- New workspace: “No campaigns yet” with “Create campaign.”
- Search/filter with zero results: “No cities found” with guidance to change the search or clear filters.
- Empty upload collection: “No files added” with an upload action, only if the dropzone itself does not already communicate that clearly.

It is not a loading state: Skeleton shows content is still being fetched. It is not an error state: failed loading/uploading needs an error message and recovery action. EmptyState represents a successful, known-empty result. Avoid using a large card where a compact inline message is sufficient.

### Updated open decisions

- Remaining Round 1 questions: icon library/search scope and copy payload; wrapping-layout interpretation; custom answer in RadioGroup only or Select too; whether the stripe/circular icon request targets Alert.
- Checkbox size: settle on 20% or 25% (proposed 25%).
- InlineConfirmation: confirm exact prompt/supporting-text placement relative to the horizontal action row.
- Dropdown family: confirm searchable single-select replaces the current standalone Combobox presentation, while retaining its filtering capability.
- Dialog variants and upload state details will be proposed before implementation. No public API removals or package changes have been approved by this document.
