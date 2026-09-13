# Split Panel Implementation Plan

**Goal:** Add the user-approved gray-header, white-content Panel variant and use it for all atomic catalog groups.

**Architecture:** Extend the existing Panel with `variant="split"` and a `filters` slot. Header and content styling belongs to Panel; catalog sections compose it using explicit filters props. Preserve the default unified Panel. No changes to legacy UI or app shell.

**Approved design:** Warm-gray canvas header, optional subheader and filters, separate white content, 32px padding per part and 20px outer corners. Shared H4 typography and existing hover elevation. One structural divider between parts. Filter controls wrap without their old nested bordered surface. Every Atoms/Components catalog group uses the same reusable Panel.

**Execution:** Personally in existing atomic-rewrite worktree; no delegation or commits.

- [x] Add failing tests for split header/content structure, interactive filters, default compatibility, and catalog filters placed in headers.
- [x] Extend `Panel.tsx` props with `variant?: 'default' | 'split'` and `filters?: ReactNode`; use semantic header plus content wrapper and token-owned CSS in `panel.css`.
- [x] Replace `CatalogSection` Surface composition with Panel. Move each direct `CatalogFilters` child to an explicit `filters` prop; keep `CatalogFilters` as unbordered Inline composition. Add split variant to Panel specimen and independent consumer.
- [x] Run atomic tests, boundary checks, typecheck and builds; inspect desktop/mobile catalog, then refresh independent installed-package preview and verify split Panel colors/spacing.

Success: existing defaults unchanged; header uses canvas, body uses surface, no nested filter box; all group wrappers canonical and exported variant available to consumers.

Verified: 60 atomic tests, 6 boundary tests, source boundary check, typecheck, catalog/library builds and fresh independent package client/SSR builds. Browser confirmed all 44 component and 8 Atoms group wrappers use split Panel; 375px layout has no document overflow. Installed preview confirms gray header, white body and 32px content padding. No commit or publication.
