# MSD slide templates

**Status:** Current implementation · **Updated:** 16 September 2026

These five slide layouts and their AI content contracts are the starting point for the deck recipe ([D7](../../product/decisions.md)). Today they are bundled data with a manual editor; there is no deck generation or renderer.

Five bundled native application templates are available at `/mvp/templates?category=presentations#presentation-templates`. Add `&slide=<template-id>` before the hash to open one editor directly. These templates do not require database publication and do not enter the banner campaign picker.

## Visual foundation

The layouts use the current MSD foundation snapshot: Arimo at 400/700, teal (`#008876`), white (`#FFFFFF`), black (`#000000`), and pale teal (`#E5F3F1`). The supplied logo is carried from the published MSD banner manifest into a white-backed placement at x64/y42, 128 × 64. The library selects the first available template whose brand name is MSD; the factory prefers its `brand-primary-logo` graphic, falling back to its first graphic. Without that source, layouts still exist but no logo is supplied.

User references informed bold editorial typography, asymmetric composition, and optical artwork; their lime palette was not copied. Slide styling is separate from application chrome. Existing global `DESIGN.md` and `PRODUCT.md` remain unchanged.

Palette and layouts are a `1.0.0` snapshot, not an automatic foundation refresh. Review them when the MSD foundation changes. This is not a claim of official corporate guideline approval; sample content is not approved medical or corporate communication.

## Layouts

All five use a fixed 1280 × 720 canvas (`widescreen`, 16:9) and 32px manifest safe areas. Composition and typography stay fixed while content changes.

| Template ID | Name / purpose | Composition |
| --- | --- | --- |
| `msd-slide-opening` | Possibility / opening | Oversized white statement on teal; full-height artwork on the right. |
| `msd-slide-editorial` | The bigger question / editorial story | Black headline and paragraph on white; artwork and caption opposite. |
| `msd-slide-evidence` | Progress in perspective / key numbers | Three metrics on pale teal, a teal insight block, and a source line. |
| `msd-slide-roadmap` | From ambition to action / roadmap | Four numbered stages on black, connected by a teal rule. |
| `msd-slide-closing` | The next possibility / closing | Large closing statement, one next step, contact text, and a right artwork strip. |

## Reusable contracts

`shared/msdPresentationTemplates.js` exports `createMsdPresentationTemplates(sourceManifest)`, `presentationAiContract(template)`, and `validatePresentationValues(template, values, measure)`.

The factory returns outer metadata (`id`, `name`, `category: 'presentation'`, `kind`, `description`, `sampleValues`, `ai`) around a strict renderer-compatible `manifest`. The manifest contains the version, ratio, slots, presentation graphics/shapes/colors, and optional source brand binding with color/font roles. AI instructions and samples remain outside the rendering schema.

`presentationAiContract` returns `templateId`, `templateVersion`, instructions, `outputSchema`, and an example. Its schema requires every text field, string values, minimum length 1, field-specific maximum lengths, and no additional properties. Line limits and fixed page/stage values are also described in the contract and enforced by the validator.

Character/line limits below are `characters / lines`; every listed text field is required.

| Layout | Text fields and limits |
| --- | --- |
| Opening | `headline` 48/3; `body` 95/2; `footer` 65/1; `page` 3/1. |
| Editorial | `headline` 48/3; `body` 155/4; `caption` 80/2; `footer` 65/1; `page` 3/1. |
| Evidence | `headline` 40/2; `insight` 66/3; `value1`–`value3` 7/1 each; `label1`–`label3` 65/2 each; `source` 110/1; `footer` 65/1; `page` 3/1. |
| Roadmap | `headline` 36/1; `stage1`–`stage4` 2/1 each; `title1`–`title4` 25/2 each; `body1`–`body4` 76/3 each; `footer` 65/1; `page` 3/1. |
| Closing | `headline` 45/3; `nextStep` 52/1; `contact` 75/1. |

`validatePresentationValues` rejects non-object input, unknown fields, missing/blank/non-string text, excessive characters or lines, and altered page/stage numbering. Supplying the `measure(text, slot)` callback also checks word widths and wrapped lines against slot width. Without it, validation cannot establish visual fit. The browser waits for Arimo before applying imported content, saving, or exporting, and measures text with canvas.

## Content and artwork workflow

1. Choose a layout and edit its fields, or copy its AI contract into an external AI workflow alongside source material.
2. Paste the resulting JSON object into the editor and apply it. There is no AI provider invocation or automatic deck generation here. The response must contain exact text keys and no markdown fences. Review facts, citations, contacts, and commitments before use; example metrics are illustrative.
3. For opening, editorial, or closing, optionally replace artwork with PNG, JPEG, or WebP, at least 1280 × 720 and at most 8 MB. Review the crop. Evidence and roadmap have no artwork slot.
4. Save a text draft in this browser or export the JSON package. Text drafts use local storage keyed by template ID and version; custom artwork is not saved in those drafts and returns to the bundled sample on reopening.

The export format is `studio-presentation-template/1`: `{ format, category, manifest, ai, composition, assets }`. `composition` holds `{ ratioId: 'widescreen', slotValues: textValues }`; artwork, where used, is embedded as `assets.artwork.dataUrl`. The AI field contains the exported contract. Keep the package to preserve custom artwork. The editor imports AI text JSON, not an entire exported package. No PPTX output is implemented.

## Future AI slide workflow reuse

Select an existing layout, obtain its contract, generate text externally from verified source material, validate it, then adapt the exported package into the existing server renderer input. Decode an artwork data URL into bytes and its MIME type before calling `renderComposition` from `server/rendering/inProcessRenderer.js`:

```js
const slots = { ...textValues }
if (manifest.slots.some(slot => slot.type === 'image')) {
  slots.artwork = { bytes, mimeType }
}
const rendered = await renderComposition({ manifest, ratio: 'widescreen', slots })
```

This is an existing function adapter, not a new presentation endpoint. The browser editor currently previews with `AnimatedBanner` and exports JSON; it does not call this server function. Any future provider orchestration, persisted slide collections, or deck assembly requires its own integration.

## Verification

Implementation handoff records 34 passing tests across the relevant suites and a successful Vite production build. The template suite checks schema compatibility, strict AI fields, invalid content, immutable source/logo placement, and all five sample renders through the existing server renderer at 1280 × 720 without text clipping. These checks cover supplied samples and validation behavior; new copy still needs fit and factual review.
