# Documentation version one review

Version one extends the approved Basics template to the full public component and UI-block catalog.

The release-hardening supplement adds a `Documentation v1` entry point to the existing atomic catalog. The final integration promotes that same index to `/`; `/atomic.html` remains the stable comparison surface and is linked from the documentation header.

The complete-coverage pass adds `/page-23.html`, a generated index of every Basics page, grouped component destination and UI-block destination. It is the Introduction entry in each docs sidebar and the target of the catalog’s Documentation v1 link.

## Delivered

- `page-20.html`: eight Basics pages, retained as the foundation reference.
- `page-21.html`: grouped component documentation. Thirty-eight destination pages cover all current exported component names, including the existing grouped families Select/Combobox/MultiSelect, Tabs/SegmentedControl and Tag/StatusBadge.
- `page-22.html`: Sidebar panel, AI Prompt Input and Code Example UI-block pages.
- `page-23.html`: complete documentation index for all published elements.
- The same grouped sidebar, search, responsive Drawer, contents Menu, Panel-wrapped examples, installation steps with npm/pnpm/yarn controls, live Preview/Code tabs, copy action, usage guidance and API reference tables are shared across all three layers.
- Component previews render the actual exported controls. Source blocks show public imports and the exact usage shape for each page.
- Code examples wrap long source lines within their panels and apply lightweight token highlighting for keywords, strings, tags, numbers and comments.

## Verification

- `npm run typecheck` passed.
- `npm run test:atomic -- --reporter=dot`: 93 tests passed across 17 files, including code-example wrapping and syntax-token coverage.
- `npm run test:atomic-boundaries`: 11 tests passed.
- `npm run check:atomic-boundaries`: passed.
- `npm run build:atomic`: passed with root, page-20, page-21, page-22 and page-23 outputs.
- Browser checks passed for the root Documentation v1 index and the preserved `/atomic.html` catalog; the catalog link returns to the catalog and the documentation routes remain usable.
- Browser checks passed for Button, grouped dropdowns, Search field, Dialog, Prompt Input and Code Example. Dialog open/close, search input, tabs, copy action and send action were visible and usable; no browser error logs were observed on the checked routes.
- The original fresh public-package consumer and displayed-source verifier remain passing from the Basics checkpoint; no production dependencies were added.

## Review boundary

The implementation remains on `codex/docs-basics`, with the complete-coverage pass following commits `c90bde3`, `d3e4c8f`, `fa910f4` and `d38fc2b`. Nothing was merged or published. The catalog remains available from the header link for side-by-side comparison, and now also links into Documentation v1.

The existing Observatory harness retains its two Node v25 native assertion crashes; this is unchanged and unrelated to the documentation routes.
