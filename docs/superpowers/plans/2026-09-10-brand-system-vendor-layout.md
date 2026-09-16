# Brand System Vendor Layout Implementation Plan

> For agentic workers: Execute this plan inline in the current task. The user already approved the first implementation pass.

**Goal:** Standardize the brand system library and wizard shell around the installed vendor Brutalist design system while preserving all existing brand behavior.

**Architecture:** Keep domain state and editor components unchanged. Update BrandDesignSystemPage.jsx composition to use vendor Container, Grid, Stack, Surface, ActionCard, and AppButton; use brand-design-system.css only for product-specific composition, card content, and responsive rules.

**Tech Stack:** React 19, Vite, plain CSS, vendor brutalist-design-system, Vitest, Testing Library.

**Spec:** docs/superpowers/specs/2026-09-10-brand-system-vendor-layout-design.md

## Global Constraints

- Preserve existing routes, API calls, autosave, permissions, and brand editor behavior.
- Use semantic --v2-* tokens and vendor ds-* classes.
- Keep ordinary controls at the existing 44px/48px targets and preserve visible focus.
- Do not introduce a second color, type, or interaction vocabulary.

---

### Task 1: Lock the vendor layout contract in tests

**Files:**
- Modify: src/studio/brand/BrandDesignSystemPage.test.jsx

- [ ] Add a render assertion that the library exposes ds-container, ds-grid, and ds-action-card, while the existing brand heading and primary action remain present.
- [ ] Run the focused test and confirm it fails because the current library does not render the vendor classes.

### Task 2: Compose the library with vendor primitives

**Files:**
- Modify: src/studio/brand/BrandDesignSystemPage.jsx
- Modify: src/studio/brand/PublishedBrandView.jsx

- [ ] Import vendor ActionCard, AppButton, Container, Grid, Stack, and Surface under explicit aliases.
- [ ] Use the vendor action card and button for each library card, keeping the current heading, status, preview, metadata, and navigation behavior.
- [ ] Wrap the library and new-brand screen in a vendor container and stack; use the vendor grid for the library cards.
- [ ] Use vendor surfaces for the wizard header and published overview shell without changing child editor props or route behavior.
- [ ] Use vendor grids for published logo, color, and typography preview collections.

### Task 3: Align product CSS with the vendor primitives

**Files:**
- Modify: src/studio/brand/brand-design-system.css

- [ ] Add the vendor card, container, grid, surface, and workspace composition rules.
- [ ] Keep a single structural border and the existing semantic tokens; use hard offset elevation only for interactive cards/actions.
- [ ] Add responsive rules for one-column cards, stacked headers, and a vertical-to-horizontal progress rail at narrow widths.
- [ ] Preserve the existing child editor selectors and remove any obsolete local card layout declarations made redundant by the vendor card.

### Task 4: Verify the complete path

**Files:**
- Modify: none

- [ ] Run npx vitest run src/studio/brand/BrandDesignSystemPage.test.jsx src/studio/brand/PublishAndView.test.jsx src/studio/brand/ReviewStep.test.jsx.
- [ ] Run npm run build.
- [ ] Run node /Users/roman/.agents/skills/impeccable/scripts/detect.mjs --json src/studio/brand/BrandDesignSystemPage.jsx src/studio/brand/brand-design-system.css.
- [ ] Inspect /mvp/system and one brand detail route at desktop and mobile widths.
