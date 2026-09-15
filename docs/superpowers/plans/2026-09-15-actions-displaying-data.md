# Actions and Displaying Data Implementation Plan

**Goal:** Mirror AlignUI v1.2's group → family → variation organization for Actions and Displaying Data, using our canonical components and visual tokens.

**Architecture:** A single documentation registry defines ordered groups, family routes, examples, and availability. A shared documentation-navigation block renders that registry on every documentation page. Variations belong to family pages and their section navigation, rather than becoming unrelated top-level links.

**Tech stack:** React, TypeScript, existing atomic library, CSS tokens, Vitest.

**Spec:** User's 2026-09-15 request and supplied Actions screenshot; reference pages linked below. This is a plan only; no UI implementation is included.

## Confirmed scope — existing components and visible gaps

User clarification, 2026-09-15: implement organization using existing components only. Missing components and unsupported variations are future backlog items, not current development tasks. This scope overrides any expansion wording in the reference mapping tables below.

- Keep every reference category and family visible, including completely missing groups.
- Available family: normal navigable link to real documentation using existing exports.
- Missing family: visible static row with a neutral `Missing component` label; no broken link, fake preview, or automatic development. Include these rows in search.
- Partial family: keep existing examples usable; list unsupported reference variations as `Missing variation` within the family page. A smaller size alone does not establish equivalence to a missing component family.
- Show a category summary such as `3 missing` when it contains unavailable families. Compute this from the registry, not handwritten totals. An entirely unavailable category stays visible.
- Keep labels compact and secondary, with an accessible text meaning; do not use error-red treatment. On narrow sidebars wrap the status below the family name; retain a minimum 36px row without clipping.
- Registry status is `available | partial | missing`; only real destinations have `href`. Store actual export mappings and unsupported features explicitly.
- Produce a future-development backlog from missing entries (family, reference link, missing capability, dependencies). Recording an item does not start implementation or automation.
- Completion for this phase means the full structure is visible, all existing elements are mapped, available links work, and every known gap is clearly labeled. It does not require functional parity with all reference components.

## Reference interpretation

The screenshot shows a noninteractive Actions group heading followed by five indented family links along one vertical guide. Button is active, with colored text and a short matching guide segment. The reference left sidebar exposes group and family; variations appear on each family page and in its right-hand table of contents. Preserve this distinction while modeling all three levels in data. Do not add a third permanently expanded left-sidebar level and call it an exact copy.

Keep our font, palette, spacing tokens, Panel and controls. Match hierarchy, names, order, indentation and selection treatment. Use the shared accent for the active marker; do not import AlignUI's product branding or source code. Keep the user's 36px documentation link height, with box-sizing and padding verified in the browser.

## Exact family order and reference examples

The examples below describe reference coverage, not claims that our library already supports it. Each family name links to its inspected source.

### Actions

| Family / subgroup | Variations or examples within its page | Current library mapping |
| --- | --- | --- |
| [Button](https://alignui.com/docs/v1.2/ui/button) | Primary, Neutral, Error; sizes, disabled, icon, full width, link rendering; filled/stroke/lighter/ghost treatments | Reuse Button. Current primary/secondary/danger/quiet names and default/compact sizes are not exact API equivalents. Preserve exports; extend only where needed. |
| [Button Group](https://alignui.com/docs/v1.2/ui/button-group) | Sizes; toggle-group composition | Missing joined-button component. FormActions is not equivalent. |
| [Compact Button](https://alignui.com/docs/v1.2/ui/compact-button) | Stroke, Ghost, White, Modifiable; sizes, full radius, disabled, link rendering | Partial: Button has icon-only and compact support, but not this dedicated small-control family. |
| [Fancy Button](https://alignui.com/docs/v1.2/ui/fancy-button) | Neutral, Primary, Destructive, Basic; icon, size, disabled, link rendering | Missing distinct treatment; build from shared Button behavior with our design language. |
| [Link Button](https://alignui.com/docs/v1.2/ui/link-button) | Link-style action family; color, size, underline and state options | Reuse TextAction; preserve its public name while using Link Button as documentation label. |

### Displaying Data

| Family / subgroup | Reference coverage | Current library mapping |
| --- | --- | --- |
| [Avatar](https://alignui.com/docs/v1.2/ui/avatar) | Color, size, initials, placeholder, status, notification, brand logo, custom indicator, link/image integration | Missing exported family. |
| [Avatar Group](https://alignui.com/docs/v1.2/ui/avatar-group) | Sizes, stack and overflow | Missing; depends on Avatar. |
| [Avatar Group Compact](https://alignui.com/docs/v1.2/ui/avatar-group-compact) | Stroke and size; compact stack/overflow | Missing; depends on Avatar. |
| [Badge](https://alignui.com/docs/v1.2/ui/badge) | Filled, Light, Lighter, Stroke; colors, sizes, square, icon, dot, disabled, alternate element | Missing distinct Badge export; do not relabel Tag as Badge. |
| [Banner](https://alignui.com/docs/v1.2/ui/banner) | Error, warning, success, information, feature; filled/light/lighter/stroke | Missing; Alert remains Feedback. Reference example headings say variant, but its API calls these semantic values status. |
| [Data Table](https://alignui.com/docs/v1.2/ui/data-table) | Table and row selection | Reuse Table; row selection requires capability work. |
| [Divider](https://alignui.com/docs/v1.2/ui/divider) | Line, line spacing, line text, text, solid text, custom content | Existing Basics Divider; document here without moving its owning layer. |
| [Kbd](https://alignui.com/docs/v1.2/ui/kbd) | Keyboard-key family | Sidebar entry verified; page fetch failed. Exact variation coverage must be verified before implementing this family. |
| [Progress Bar](https://alignui.com/docs/v1.2/ui/progress-bar) | Color, label, advanced compositions | Reuse ProgressBar; record supported determinate/indeterminate and value-label behavior. |
| [Progress Circle](https://alignui.com/docs/v1.2/ui/progress-circle) | Sizes | Reuse ProgressRing under the reference documentation name; extend size support canonically. |
| [Rating](https://alignui.com/docs/v1.2/ui/rating) | Review, labeled review, cell, star/heart bars, single selection, textarea composition | Existing Rating covers interactive stars; remaining treatments are gaps. |
| [Status Badge](https://alignui.com/docs/v1.2/ui/status-badge) | Disabled, Completed, Failed, Pending; dot/icon and alternate element | Existing StatusBadge; split documentation from Tag and retain actual supported statuses. |
| [Tag](https://alignui.com/docs/v1.2/ui/tag) | Stroke, Gray, Disabled, image, avatar, dismissible | Existing Tag; split documentation, extend only missing capabilities. |

## Migration decisions

- Exact completed navigation contains five Actions families and thirteen Displaying Data families in the order above. Do not invent extra subgroups such as Buttons or Indicators.
- Form Actions moves to the Form documentation group. Inline Confirmation remains documented under a UI Blocks composition entry. Neither occupies an extra Actions family slot.
- Existing URLs for text-action, table, progress-ring and tag continue resolving. Preferred new labels are Link Button, Data Table, Progress Circle and Tag. Add a dedicated status-badge route. Keep old routes as aliases when canonical IDs change.
- Missing families remain visible with a `Missing component` label and become future backlog entries. Structural completeness is independent of future functional parity.
- Family organization does not require renaming public component exports or moving Basics into Components. Keep dependency direction Basics → Components → UI blocks → Screens.

## Implementation tasks

### 1. Define the shared hierarchy and route compatibility

Files: modify `src/atomic/screens/docs/docsNavigation.ts`; create `src/atomic/screens/docs/docs-navigation.test.ts`.

- [ ] Replace label/id tuples with a typed group/family registry. Each family has `id`, `label`, `href`, `aliases`, `availability`, and `sections` (stable section IDs and labels).
- [ ] Encode the two exact ordered family lists above, with no duplicate IDs. Keep other groups in their current order for this focused change.
- [ ] Add coverage tests for five/thirteen family counts, exact ordering, unique routes, preserved aliases, and separate Tag/Status Badge entries.
- [ ] Add migration destinations for FormActions and InlineConfirmation; verify no current export loses a discoverable documentation destination.

### 2. Implement the reference sidebar once

Files: extend `src/atomic/components/NavigationList.tsx` and `navigation-list.css` with an opt-in rail appearance and compact documentation density; create `src/atomic/ui-blocks/DocumentationNavigation.tsx` and `documentation-navigation.css`; export through `src/atomic/ui-blocks/index.ts`.

- [ ] Reuse Heading, Stack and NavigationList. Group labels are static headings with no click handler, disclosure icon, tabIndex or button role.
- [ ] Render indented family links against a continuous thin vertical guide. Use a short active marker and active text color instead of the boxed active-item treatment for this opt-in appearance.
- [ ] Keep default NavigationList appearance intact outside this variant. Implement 36px single-line row sizing in the owning component using a named token; retain visible keyboard focus.
- [ ] Test active-page semantics (`aria-current=page`), link activation and noninteractive group headings. Avoid recreating navigation controls with private screen markup.

### 3. Apply the registry to every documentation surface

Files: `src/atomic/screens/docs/BasicsDocs.tsx`, `ComponentDocs.tsx`, `UIBlockDocs.tsx`, `DocsIndex.tsx`, `docs.css`.

- [ ] Replace independently assembled Actions/Displaying Data lists with the shared registry and navigation block on desktop and mobile.
- [ ] Search family names, legacy names and variation labels. A variation match reveals its family and links to the matching section; clearing search restores normal ordering.
- [ ] Update the complete index from the same registry. Preserve query routes, back/forward behavior and active family on refresh.
- [ ] Verify every rendered family/section link points to content that exists; never send a missing route to Button silently.

### 4. Build family pages and variation sections for existing components

Files: `src/atomic/screens/docs/componentContent.tsx`, `ComponentDocs.tsx`; create `src/atomic/screens/docs/families/actions.tsx` and `displayingData.tsx` to keep these examples focused.

- [ ] Replace the single optional example with ordered example arrays (`id`, `title`, `description`, `preview`, `source`). Generate page sections and the right-side section navigation from the same array.
- [ ] Begin with Button and Data Table, then Link Button, Divider, Progress Bar, Progress Circle, Rating, Status Badge and Tag. Reuse current library exports and Panel/CodeExample.
- [ ] Give each example its own matching source rather than copying an entire mixed-family source file. Preserve our local installation workflow and accurate API names.
- [ ] Split Tag and Status Badge demos and reference rows. Split progress-bar and progress-circle previews so each page demonstrates its own family.
- [ ] Add tests for deep links to examples, Preview/Code switching, copy success/failure, and legacy URL resolution.

### 5. Display gaps and record the future backlog

Files: `docsNavigation.ts`, shared documentation navigation, family page content and registry tests.

- [ ] Classify every family using current public exports and verified behavior: available, partial or missing.
- [ ] Render missing families as visible static rows labeled `Missing component`; retain exact reference ordering.
- [ ] Render unsupported variations on partial family pages as `Missing variation`, alongside working existing examples.
- [ ] Add derived missing-family counts to categories and preserve entirely unavailable categories in the tree.
- [ ] Generate a backlog document from the same registry. Verify missing entries remain searchable and have no dead links or fake examples.
- [ ] Defer all new component/variant implementation; do not extend Button, Avatar, Badge or other capabilities during this phase.

### 6. Acceptance verification

- [ ] Run `npm run typecheck`, `npm run test:atomic`, `npm run check:atomic-boundaries`, and `npm run build:atomic` in the docs worktree; verify available script names before running.
- [ ] Desktop/mobile browser pass: correct five/thirteen family order, static group headings, visible vertical guide, single active marker, 36px rows, no clipped labels, keyboard focus and mobile navigation.
- [ ] Exercise search, direct section links, back/forward, legacy routes and all interactive examples. Confirm screenshots of Actions and Displaying Data against the supplied reference hierarchy.
- [ ] Review for orphaned exports and unlabeled gaps. Existing families have working pages; missing families are visible, labeled and recorded for future development.

## Delivery boundaries

Deliver shared sidebar and existing family pages, visible missing/partial states, then structural coverage verification. Missing component development is deferred. No implementation in this planning turn. Do not overwrite unrelated worktree changes or live-mode files. Credit AlignUI as the organizational reference, retaining independently authored component implementation.
