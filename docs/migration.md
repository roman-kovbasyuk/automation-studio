# Migration from the legacy catalog

The React catalog under `src/atomic/catalog` was retired. The current documentation screens are the single reference UI, and the UI-independent registry lives at `src/atomic/componentManifest.js`.

Existing page URLs remain stable:

- `/page-20.html?basic=<id>` for Basics
- `/page-21.html?component=<id>` for Components
- `/page-22.html?block=<id>` for UI Blocks
- `/page-23.html` for Getting Started

Old review links that used `/atomic.html#color`, `/atomic.html#component-<id>`, or `/atomic.html#block-<id>` are redirected to the corresponding page. New integrations should link directly to the stable page entries and import from the package root. Catalog-only CSS, copy mode, and catalog test helpers are no longer supported.
