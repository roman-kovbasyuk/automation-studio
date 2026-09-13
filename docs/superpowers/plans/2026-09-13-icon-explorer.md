# Icon explorer refinement

Approved: replace vertical size radios with shared Tabs; hide icon names while retaining accessibility, search and copy. Catalog only; no public API or token changes.

- [x] Regression test: search one icon, change size, verify preview and copied snippet.
- [x] Compose Tabs with existing size options; label icon buttons with aria-label and render only Icon.
- [x] Verify tests, types, and live desktop/mobile presentation.

71 tests pass, typecheck and catalog build pass. Desktop preview verified at 48px; mobile uses existing horizontally scrollable Tabs. Detector clean. Existing bundle-size warning unchanged.
