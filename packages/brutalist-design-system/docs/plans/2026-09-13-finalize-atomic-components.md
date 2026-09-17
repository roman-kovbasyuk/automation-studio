# Finalize atomic components

User approved completing the existing component catalog without batch review pauses. Retain the approved visual language and Atoms → Components → UI blocks → Screens ownership. Execute personally; no subagents, publishing, commits, app-shell rewrite or UI-block migration.

## Inventory (24 added; 44 complete)

- [x] InlineText — no text movement, automatic height, blur/Enter autosave, Escape revert, failure retains draft, active black 3% alpha background. Semantic typography variants.
- [x] TextAction — inline action/link, canonical underline and disabled handling.
- [x] Form, FormActions — semantic form and shared action composition.
- [x] Menu, Dialog, Drawer, Popover, Tooltip — shared accessible overlays; use existing Radix dependency for focus, dismissal and keyboard ownership. Preserve Atoms variables through portals. Menu icons owned by item definitions, never private caller markup.
- [x] Toast — dismissible announced feedback.
- [x] Tabs — tablist keyboard selection and matching panels.
- [x] WorkflowSteps — current/completed/pending states and orientation.
- [x] Table — typed columns/rows, semantic headers and controlled sorting.
- [x] Combobox, MultiSelect — search/single or multi selection and keyboard/disabled behavior.
- [x] InlineConfirmation — safe confirm/cancel composition with focus restoration.
- [x] FileDropzone, FileList — labelled upload, native picker/drop validation and removal.
- [x] EmptyState, Skeleton, Spinner — named loading/empty feedback and reduced motion.
- [x] DatePicker, PasswordField, SearchField — native date picker, reveal/hide, clear/search. Native number/time/color variants belong to TextField rather than duplicate wrappers.

Existing twenty cover buttons, panels, basic fields/selection, tags/segmented control, breadcrumbs/pagination, numeric/range/rating and progress/alerts. Interaction laboratory is an example composition, not another public component. Domain-specific AI/content/shell/UI blocks are not this component pass.

## Working sequence and gates

1. Write behavior tests, observe missing behavior, implement InlineText first and verify geometry/background in browser.
2. Implement each remaining group with focused tests. Reuse shared Button/Text/Icon/Surface and existing Components. Add Radix to the explicit allowed dependencies and built package, not a visual CSS dependency.
3. Register every export in the single catalog manifest and give it an interactive specimen. Extend independent consumer coverage and semantic rendered markers.
4. Run the full atomic verification pipeline, inspect desktop/mobile and portal behavior, rebuild independent preview. Record failures honestly and iterate to passing before completion.

Completion means all 44 public components have catalog specimens and packaged-consumer coverage, behavioral tests pass, dependencies obey the layer boundaries, and representative browser interactions/visuals are verified. Not a claim of universal cross-browser or assistive-technology certification.

## Verification — 2026-09-13

- 57 atomic tests and 6 boundary tests pass; source-wide dependency boundary check and TypeScript check pass.
- Catalog and library production builds pass. A fresh independent package installation passes typecheck, client/SSR builds, and renders all 44 public Components without source aliases.
- Catalog at port 5210 and rebuilt installed-package preview at port 5211 verified in browser. Portaled menus retain icons, white surface and canonical elevation; dialogs retain 20px corners, associated descriptions, dismissal and focus behavior.
- At 375px, InlineText has identical text offsets, width and height before/after clicking. Multiline content grows without overflow. Installed-package edit background is `rgba(0, 0, 0, 0.03)` with no textarea resize or focus stroke.
- Native date/select/file controls retain browser-specific behavior. This is not a full cross-browser, visual-regression or assistive-technology certification, nor a drop-in migration of legacy UI blocks. No commit, push or publication performed.
