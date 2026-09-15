# Documentation version one review

Version one extends the approved Basics template to the full public component and UI-block catalog.

## Delivered

- `page-20.html`: eight Basics pages, retained as the foundation reference.
- `page-21.html`: grouped component documentation. Thirty-eight destination pages cover all current exported component names, including the existing grouped families Select/Combobox/MultiSelect, Tabs/SegmentedControl and Tag/StatusBadge.
- `page-22.html`: Sidebar panel, AI Prompt Input and Code Example UI-block pages.
- The same grouped sidebar, search, responsive Drawer, contents Menu, Panel-wrapped examples, installation steps with npm/pnpm/yarn controls, live Preview/Code tabs, copy action, usage guidance and API reference tables are shared across all three layers.
- Component previews render the actual exported controls. Source blocks show public imports and the exact usage shape for each page.

## Verification

- `npm run typecheck` passed.
- `npm run test:atomic -- --reporter=dot`: 90 tests passed across 16 files after adding route and representation coverage.
- `npm run test:atomic-boundaries`: 11 tests passed.
- `npm run check:atomic-boundaries`: passed.
- `npm run build:atomic`: passed with page-20, page-21 and page-22 outputs.
- Browser checks passed for Button, grouped dropdowns, Search field, Dialog, Prompt Input and Code Example. Dialog open/close, search input, tabs, copy action and send action were visible and usable; no browser error logs were observed on the checked routes.
- The original fresh public-package consumer and displayed-source verifier remain passing from the Basics checkpoint; no production dependencies were added.

## Review boundary

The implementation remains on `codex/docs-basics`, commit `c90bde3` plus the version-one changes. Nothing was merged, published or substituted for the existing catalog. The catalog remains available from the header link for side-by-side comparison.

The existing Observatory harness retains its two Node v25 native assertion crashes; this is unchanged and unrelated to the documentation routes.
