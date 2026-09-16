# Migration from the legacy catalog

The React catalog under `src/atomic/catalog` was retired. The current documentation screens are the single reference UI, and the UI-independent registry lives at `src/atomic/componentManifest.js`.

The semantic page URLs are now the canonical documentation routes:

- `/basics.html?basic=<id>` for Basics
- `/components.html?component=<id>` for Components
- `/ui-blocks.html?block=<id>` for UI Blocks
- `/getting-started.html` for Getting Started

The former numbered routes `/page-20.html` through `/page-23.html` remain as compatibility redirects and preserve their query strings and hashes.

Old review links that used `/atomic.html#color`, `/atomic.html#component-<id>`, or `/atomic.html#block-<id>` are redirected to the corresponding page. New integrations should link directly to the stable page entries and import from the package root. Catalog-only CSS, copy mode, and catalog test helpers are no longer supported.
