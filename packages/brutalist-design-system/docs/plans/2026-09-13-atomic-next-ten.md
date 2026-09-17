# Atomic rewrite: components 11–20

Continue the approved Atoms architecture and existing catalog visuals. Work locally without delegation. Stop after this batch for review; do not publish or replace legacy consumers.

## Inventory and ownership

- Breadcrumbs: semantic linked trail, current destination, Lucide separators.
- Pagination: bounded page selection, compact window for large counts, shared Buttons.
- NumberStepper: labelled native number input, shared decrement/increment Buttons, bounded values.
- Slider: labelled native range input with value and shared token styling.
- RangeSlider: compose two Sliders; prevent minimum/maximum crossing.
- Rating: native radio group with Lucide stars, keyboard selection and form values.
- ProgressBar: determinate and indeterminate accessible progress.
- ProgressRing: determinate progress using the same normalization as ProgressBar.
- StatusBadge: compose Tag, with canonical status icon/tone mapping.
- Alert: shared Surface, Icon, Heading and Text; optional announcement semantics.

All styling belongs to Atoms or these Components. Catalog supplies only examples/state/composition. Retain 20px large rounding, canonical typography and reduced-motion support. No speculative APIs or dependencies.

## Implementation and verification

1. Add behavior tests before implementation: bounds, disabled states, native semantics, form submission, accessible labels and progress normalization.
2. Implement owners and public exports; add ten manifest entries and interactive catalog specimens with surface-wrapped variable switches.
3. Extend the independent installed-tarball consumer and its render assertions to all twenty exports.
4. Run atomic tests, source-boundary tests/checks, typecheck, catalog/library builds and fresh installed consumer verification.
5. Check catalog in browser (desktop and narrow layout), representative interactions and independently installed preview; report limitations accurately.

Review checkpoint: twenty catalog components, not the entire legacy inventory.

## Verification result

- 33 atomic tests passed (including 13 new tests); 6 boundary tests passed.
- Typecheck, source-wide dependency checks, catalog build and public library build passed.
- Fresh independent tarball installation passed types, browser build, SSR build and all-twenty render assertions.
- Desktop browser: number-stepper clicks, slider/rating keyboard changes, feedback appearance verified. Six representative computed-style snapshots matched between catalog and installed package; installed number/slider interactions passed.
- Catalog at 375px: no horizontal document overflow; pagination flow corrected and visually rechecked. Temporary viewport override reset.
- Refreshed package preview at http://127.0.0.1:5211/; catalog batch starts at http://127.0.0.1:5210/atomic.html#component-breadcrumbs.
- Not published or committed. Full cross-browser, assistive-technology and automated visual-regression coverage remain outside this batch's verification.
