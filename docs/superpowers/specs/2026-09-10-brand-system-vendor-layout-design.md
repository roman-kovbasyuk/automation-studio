# Brand System Vendor Layout Design

## Goal

Give the brand design system library and wizard workspace a first consistent layout pass using the vendor Brutalist design system already loaded by Banner Studio.

## Scope

- Keep the existing library, materials, review, publish, autosave, and permission behavior.
- Use vendor layout primitives for page containers, stacks, grids, surfaces, action cards, and actions.
- Keep the existing Avenir-family app tokens, warm canvas, black rules, cyan actions, compact corners, and hard interaction shadows.
- Make the brand library cards and wizard shell read as one product surface on wide and narrow screens.
- Do not change API contracts, brand data, routes, or domain editors.

## Visual direction

The page uses a constrained content container on the existing canvas. The library becomes a responsive vendor grid of neutral surfaces with a compact header and one clear primary action. Each card keeps one structural border, one restrained hard shadow on interaction, an explicit status pill, and a 16px Lucide arrow action. The wizard uses a surface wrapper for the active step and a separate progress rail, with the existing workflow steps component remaining the navigation authority.

## Component and data boundaries

BrandDesignSystemPage.jsx owns composition and routing. The vendor components own layout primitives and button/card semantics. Existing brand editor components continue to own state, validation, uploads, and persistence. brand-design-system.css owns only product composition and responsive adjustments around vendor classes.

## Verification

- Existing brand page tests continue to pass.
- Add a focused render assertion for vendor container/grid/card classes on the library.
- Run the focused brand test files, production build, and the Impeccable detector over changed UI files.
- Inspect the live /mvp/system library and a brand detail route at desktop and mobile widths.
