# Banner templates and brands

**Status:** Current implementation · **Updated:** 16 September 2026

## Banner template editor

The Templates shell fills at least the viewport height. Ads begins with an illustrated campaign entry and the existing campaign button leading to /mvp. Banner previews open an editor at `/mvp/templates?category=ads&banner=<template-id>#template-categories`.

The editor reuses the campaign renderer and canonical buttons, tabs, CanvasText, checkboxes, format tiles and dialogs. Content shows one centered preview with Caption (tag), Headline, Body text and CTA editable in the artwork. Previous/next arrows cycle the template proportions independently of the selected output formats. All proportions share one copy/image draft. Empty caption slots expose an editor-only placeholder.

CanvasText uses native plain-text editing without form chrome; blur keeps edits and Escape restores the focus-session value. Oversized input is retained and marked invalid, with a visible length error and disabled output actions rather than silent truncation.

Formats displays every supported format as a rectangular selection tile. Vertical platform (Meta, Google, TikTok) and media (Static, Video) controls select groups, never hide tiles. Unchecked or mixed groups add all matching IDs; checked groups remove them. Overlaps deduplicate and every checkbox recalculates from the selected set. On narrow screens the groups move above the grid. Video groups describe placement sizes; the current download remains static PNG.

Draft edits and uploaded artwork remain in memory while the Templates library is mounted, including returning to the gallery. Reload or leaving Templates resets them. PNG/JPEG upload validates type, byte size and the template's minimum image dimensions. Hover, keyboard focus and touch expose image controls.

Download renders selected sizes through the existing server renderer, validates text fit and images, and returns a ZIP of PNGs plus draft.json. Outputs are unreviewed drafts. This adapter does not create campaigns or change review, approval or delivery state.

Authenticated endpoints:
- GET /api/v1/banner-template-editor/capabilities — explicit feature availability.
- POST /api/v1/banner-template-editor/exports — template identity/version, four values, unique supported ratioIds, image MIME/base64; returns draft ZIP.
- POST /api/v1/banner-template-editor/actions — validated generation/video/Figma action contract; 501 until integrations are connected.

The server resolves only actor-accessible templates and never accepts client layout manifests or remote image URLs. The UI displays honest not-connected states for image generation, uploaded-image video conversion and Figma review. It links to the existing campaign flow, without claiming that draft content transfers there.

Next integration work: actor-scoped persistent drafts and uploads; generation job adapter; video conversion adapter; campaign/review handoff preserving the existing approval workflow. No provider calls or external Figma writes are made by this v1.

## Brands and templates

Brand systems are separate from the application UI design system. `shared/resolveTemplateBrand.js` maps a published brand's palette and typography roles, and its approved primary logo, into a template's geometry and saves an immutable resolved manifest. The browser preview (`AnimatedBanner`) and the PNG renderer consume the same resolved manifest.

- Assigning a brand (`POST /api/v1/brand-design-systems/:brandId/templates`, admins only) creates **new versions of the shared templates**. Publishing or restoring a brand refreshes assigned templates. Existing template and campaign snapshots stay unchanged.
- Supported fonts: Inter and OFL-licensed Arimo at weights 400, 600 and 700. Arimo is the Arial-compatible substitute used for the MSD reference.
- Local fixtures: `node scripts/setup-msd-templates.mjs` (blocked in production).

The target model changes this: templates reference brand roles and each asset creation flow pins its brand ([D2](../../product/decisions.md)). See [known issues](../known-issues.md#product-model-gaps).
