# Full Documentation Tree — Audit and Implementation Plan

**Goal:** Extend the Actions/Displaying Data plan to the entire AlignUI v1.2 navigation tree, preserving every existing library element and a consistent group → family → variation model.

**Architecture:** One typed registry supplies desktop navigation, mobile navigation, search, the documentation index and family section links. Shared navigation renders static headings and family rails; page examples are the third hierarchy level.

**Tech stack:** Existing React/TypeScript atomic library, CSS tokens and Vitest. No framework or dependency migration is implied by matching information architecture.

**Spec:** User's full-tree scan request and group-spacing annotation, 2026-09-15. Builds on [Actions and Displaying Data plan](2026-09-15-actions-displaying-data.md).

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

## Evidence and limits

Inspected the [full reference sidebar](https://alignui.com/docs/v1.2/ui/button), all remaining component family pages, both Foundations pages and all four Utils pages. The previous plan covers the first eighteen families. Kbd's link exists but its page could not be retrieved; its variation parity remains unverified. Reading these pages establishes taxonomy and documented examples, not an exhaustive interaction/accessibility audit.

The reference has seven component categories and 49 component-family entries. It also has Getting Started, All Products, Foundations, All Components and Utils headings. All Components is a section heading above the seven categories, not another component family.

## Full reference tree — exact labels and order

```text
Getting Started
  Introduction
  Installation
All Products
  Base Components                 FREE
  Components & Blocks             PRO
  Sectoral Templates              PRO
  Figma File                      PRO
Foundations
  Color
  Typography
All Components
  Actions
    Button
    Button Group
    Compact Button
    Fancy Button
    Link Button
  Displaying Data
    Avatar
    Avatar Group
    Avatar Group Compact
    Badge
    Banner
    Data Table
    Divider
    Kbd
    Progress Bar
    Progress Circle
    Rating
    Status Badge
    Tag
  Feedback
    Alert
    Notification
    Toast
    Tooltip
  Form
    Checkbox
    Color Picker
    Datepicker
    Digit Input
    File Upload
    Hint
    Input
    Label
    Radio
    Select
    Slider
    Switch
    Textarea
  Layout
    Accordion
    Breadcrumb
    Segmented Control
    Tab Menu Horizontal
    Tab Menu Vertical
  Navigation
    Dot Stepper
    Horizontal Stepper
    Pagination
    Vertical Stepper
  Overlays
    Command Menu
    Drawer
    Dropdown
    Modal
    Popover
Utils
  cn
  Polymorphic
  Recursive Clone Children
  tv
```

This is the exact reference inventory. All Products is AlignUI's commercial navigation; copying its PRO products into our product would misrepresent our offerings. Keep it documented here and omit it from our implementation unless we have equivalent real destinations. Utils is likewise an implementation-specific section, not a reason to add Tailwind helpers to our CSS-based library. These are explicit adaptation decisions, not unnoticed omissions from the scan.

## Remaining family / variation mapping

Reference examples are listed here; proposed consolidation of our exports is identified in the final column. A match does not mean all reference options already exist.

| Family | Reference examples or parts | Our mapping / work |
| --- | --- | --- |
| [Alert](https://alignui.com/docs/v1.2/ui/alert) | Variants and sizes | Existing Alert; audit actual tone/size coverage. |
| [Notification](https://alignui.com/docs/v1.2/ui/notification) | Variants, action, link, secondary action | Missing dedicated family; do not silently alias Toast. |
| [Toast](https://alignui.com/docs/v1.2/ui/toast) | Non-dismissable, notification-library options | Existing Toast; retain our implementation and document actual supported behavior. |
| [Tooltip](https://alignui.com/docs/v1.2/ui/tooltip) | Light, size, position, HTML content | Existing Tooltip; compare support before adding examples. |
| [Checkbox](https://alignui.com/docs/v1.2/ui/checkbox) | Disabled, label, advanced label | Existing Checkbox. |
| [Color Picker](https://alignui.com/docs/v1.2/ui/color-picker) | Picker with popover | Missing; unrelated to the Color foundation swatch grid. |
| [Datepicker](https://alignui.com/docs/v1.2/ui/datepicker) | Popover, approval, range | Existing DatePicker is only a partial match. |
| [Digit Input](https://alignui.com/docs/v1.2/ui/digit-input) | Error, disabled, square inputs | Missing segmented digit-entry family; NumberStepper is not equivalent. |
| [File Upload](https://alignui.com/docs/v1.2/ui/file-upload) | Upload area, file-format icon | Consolidate FileDropzone, FileList and AttachmentArea as our examples/compositions within this family. |
| [Hint](https://alignui.com/docs/v1.2/ui/hint) | Disabled, error, icon | Supporting/error text exists inside fields; expose reusable owning-layer functionality if no public Hint exists. |
| [Input](https://alignui.com/docs/v1.2/ui/input) | Icons, sizes, affixes, inline affixes, label/hint, keyboard hint, password, password strength, disabled/error, button, payment, select/inline-select, tags, date/counter compositions | Consolidate TextField, SearchField, PasswordField and NumberStepper. Search is our additional Input variation, not a verified named reference section. InlineText becomes an editable-text composition here. |
| [Label](https://alignui.com/docs/v1.2/ui/label) | Label, required marker, supporting suffix | Field labeling exists internally; no standalone export in current index. Extract canonically before documenting it as reusable. |
| [Radio](https://alignui.com/docs/v1.2/ui/radio) | Disabled, label, advanced label | Existing RadioGroup. |
| [Select](https://alignui.com/docs/v1.2/ui/select) | Default, compact, inline, compact-for-input | Consolidate Select, Combobox and MultiSelect as our related variations; do not claim these exports map one-to-one to reference variants. |
| [Slider](https://alignui.com/docs/v1.2/ui/slider) | Range, tooltip | Consolidate Slider and RangeSlider. |
| [Switch](https://alignui.com/docs/v1.2/ui/switch) | Disabled, label, advanced label | Existing Toggle; retain export name. |
| [Textarea](https://alignui.com/docs/v1.2/ui/textarea) | Character counter, error, label/hint, disabled, simple | Existing TextArea; add only unsupported capabilities after checking its props. |
| [Accordion](https://alignui.com/docs/v1.2/ui/accordion) | Arrow position | Missing exported family. Sidebar collapse markup is not an Accordion implementation. |
| [Breadcrumb](https://alignui.com/docs/v1.2/ui/breadcrumb) | Link, slash separator | Move Breadcrumbs documentation from Navigation to Layout. |
| [Segmented Control](https://alignui.com/docs/v1.2/ui/segmented-control) | Rounded | Existing SegmentedControl; split from Tabs page. |
| [Tab Menu Horizontal](https://alignui.com/docs/v1.2/ui/tab-menu-horizontal) | Overflowing tabs | Existing Tabs; verify horizontal overflow behavior. |
| [Tab Menu Vertical](https://alignui.com/docs/v1.2/ui/tab-menu-vertical) | Heading, styled container | Requires vertical tabs capability; NavigationList does not have equivalent tab semantics. |
| [Dot Stepper](https://alignui.com/docs/v1.2/ui/dot-stepper) | Sizes, tabs composition | Missing dedicated presentation. |
| [Horizontal Stepper](https://alignui.com/docs/v1.2/ui/horizontal-stepper) | Step indicator and tabs composition | Audit WorkflowSteps before reusing it. |
| [Pagination](https://alignui.com/docs/v1.2/ui/pagination) | Rounded, grouped, links | Existing Pagination; compare supported variants. |
| [Vertical Stepper](https://alignui.com/docs/v1.2/ui/vertical-stepper) | Vertical indicator and tabs composition | Extend WorkflowSteps or expose a shared orientation feature first. |
| [Command Menu](https://alignui.com/docs/v1.2/ui/command-menu) | Dialog, input, groups, list/items, footer key hints | Missing; search-field markup alone is not a command menu. |
| [Drawer](https://alignui.com/docs/v1.2/ui/drawer) | Basic and structured header/body/footer | Existing Drawer. |
| [Dropdown](https://alignui.com/docs/v1.2/ui/dropdown) | Submenu | Existing Menu, not Select. Verify submenu support. |
| [Modal](https://alignui.com/docs/v1.2/ui/modal) | Header, body/footer | Existing Dialog; preserve export and old route. |
| [Popover](https://alignui.com/docs/v1.2/ui/popover) | Position | Existing Popover. |

## Preserve our additional elements

Exact reference family ordering and complete coverage of our own library need both a mirrored core and clearly separated local material:

- Foundations: Color and Typography first; keep Spacing, Shape & sizing, Elevation, Motion, Icons and Layout afterward as our documented extensions. Never silently remove their routes.
- Form and FormActions: a Forms composition under our UI Blocks extension, keeping old links searchable. This supersedes the prior plan's proposal to insert FormActions as an extra Form family.
- InlineConfirmation: UI Blocks confirmation composition.
- Panel, Surface, Container, Stack, Inline, Grid and ScrollArea: remain discoverable through our Layout foundation and Panel documentation in a local Library Extensions section; their owning layers do not move.
- Spinner, Skeleton and EmptyState: a local Loading & empty states family in Library Extensions; preserve individual example deep links and old routes.
- NavigationList: local Library Extensions navigation-pattern page.
- SidebarPanel, PromptInput and CodeExample: retain the UI Blocks section after the mirrored component categories.
- Keep our extensions visually separate from the 49-family reference core so exact family counts and order remain testable.
- [cn](https://alignui.com/docs/v1.2/utils/cn), [Polymorphic](https://alignui.com/docs/v1.2/utils/polymorphic), [Recursive Clone Children](https://alignui.com/docs/v1.2/utils/recursive-clone-children), and [tv](https://alignui.com/docs/v1.2/utils/tv) describe AlignUI's implementation helpers. Inventory real public helpers before creating any local Utils pages; no fake APIs or unnecessary dependencies.

## Group spacing — response to the annotation

Observed source: each sidebar currently uses `Stack gap={6}` (24px), combined with differing heading controls and padding. Basics uses a private div with button role; Components and UI Blocks still use Buttons. Therefore equal outer gaps do not produce identical visual rhythm. The current global 36px minimum-height rule also retains vertical padding; measure the rendered link rather than assuming its final height is 36px.

Proposed local token specification (not claimed as measured AlignUI pixel values):

| Relationship | Rule |
| --- | --- |
| End of one component group to the next heading | 24px, applied once at the group-list wrapper |
| Major sections, e.g. Foundations → All Components | 32px |
| Group heading to first family link | 8px |
| Between adjacent family rows | 0px additional gap; each row is 36px tall |
| Family indentation from guide | 16px |
| Guide / active marker | 1px; marker spans the active family row |

Use static group headings as in the reference and the user's earlier request. Remove collapsed-only spacing states when adopting this layout. Do not stack heading margins, wrapper gaps and button padding. Apply these rules in the shared navigation block so search and mobile use the same rhythm. Keep header controls and article spacing outside this change.

## Implementation sequence supplement

1. **Full registry first:** extend `docsNavigation.ts` to all seven categories in the exact tree above. Add typed availability, aliases and ordered sections. Store local extensions separately. Test family counts `[5,13,4,13,5,4,5]`, group order and uniqueness.
2. **One navigation renderer:** create `ui-blocks/DocumentationNavigation.tsx` that consumes data, never imports screens, and composes existing atoms/components. Extend NavigationList with opt-in rail styling and sizing. Export via `src/atomic/index.ts` (there is currently no `ui-blocks/index.ts`; this corrects the earlier plan). Add named density tokens in atoms before using them.
3. **Wire every surface:** BasicsDocs, ComponentDocs, UIBlockDocs and DocsIndex use that registry. Remove duplicate private group interactions. Fix Getting Started / Installation to a real shared destination; it currently points to removed Color installation content on some pages.
4. **Consolidate existing families:** Input, Select, Slider, File Upload; split Tabs/Segmented Control and Tag/Status Badge; move Breadcrumb to Layout. Route aliases include text-field/search-field/password-field/number-stepper → Input sections, dropdowns → Select, range-slider → Slider, file-dropzone/file-list/attachment-area → File Upload, toggle → Switch, breadcrumbs → Breadcrumb, menu → Dropdown, dialog → Modal. Preserve query and section navigation on back/forward.
5. **Family content:** extend ComponentDocs to ordered example arrays. Example titles, source, preview and table-of-contents links must refer to the same example record. Show our actual public prop names even where the documentation family name matches AlignUI.
6. **Visible gaps and backlog:** show every missing family with `Missing component`, every unsupported variation with `Missing variation`, and derived missing counts on categories. Generate a future-development inventory; do not build new components or variants in this phase.
7. **Verification:** compare registry order against all 49 reference entries; audit every existing public export for a documentation destination; test old routes, search-by-variation, missing-route handling and single active-page selection. Run typecheck, atomic tests and boundary/build checks. Inspect one desktop/mobile batch for group rhythm, measured 36px rows, active rail, scroll, keyboard focus and long names.

## Acceptance boundaries

This turn produces the complete structural audit and extends the plan; it does not implement the sidebar. Family-level examples were inspected for taxonomy; full functional parity is a larger implementation phase. Distinguish the mirrored reference core, our extensions, and omitted reference-specific products/helpers explicitly during review. Never describe a partial inventory as an exact completed mirror.
