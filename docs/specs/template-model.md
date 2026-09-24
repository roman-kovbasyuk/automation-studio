# Template model

**Status:** Target (draft for owner review) · **Updated:** 17 September 2026 · **Requirements:** TPL-1–5, ASSET-1, ASSET-3 · **Decisions:** D2, D17, D19, D20

What a template is, how it references a brand, how it is resolved and rendered, and how AI content fits it.

## Current state

- `templates` rows hold an ID, semantic version and manifest (`shared/templateManifest.js`): ratios with safe areas; text, CTA and image slots with character, line and font-size limits and per-ratio placements; optional presentation (background, slot colours, shapes, graphics); optional brand binding (colour and font roles).
- Ten banner templates exist in `shared/studioTemplates.js`: `editorial-split`, `product-spotlight` and `bold-announcement` (current version 1.2.0), and `side-story`, `caption-band`, `type-first`, `color-block`, `postcard`, `minimal-strip` and `layered-blocks` (1.0.0, added 24 September 2026). Every layout supports all seven banner sizes and the optional tag slot. Assigning a brand creates a **new version of the shared template** with the brand's values resolved in (version 1.2.1 carries MSD).
- Text fits by shrinking, as the `textFits` check describes: each text slot is drawn at the largest size between `fontSize` and `minFontSize` (in steps of 2 px) at which it wraps into `maxLines` and fits its placement. The rule lives in `shared/textFit.js` and is shared by the PNG renderer and the browser preview, so both choose the same size and line breaks. Current versions set headline floors per layout (the smallest size at which 80-character headlines fit every size), body 22 px and tag 14 px; the CTA keeps its size. Versions whose minimums equal their sizes render exactly as before. Version 1.3.0 of the first three layouts adds fitting and moves decoration clear of text.
- Layouts are data only: the renderer, the browser preview and the Figma package need no layout-specific code. A new layout keeps to the shared rules: text on the background or the first (surface) shape, the last shape backing the call to action, the top-left pixel left as background, and the lower right corner of the image kept clear for the brand logo.
- Five MSD slide layouts exist in code (`shared/msdPresentationTemplates.js`) with AI content contracts and a fit validator, outside the template table.
- The in-process renderer (`server/rendering/inProcessRenderer.js`) draws text as glyph paths with fontkit and composites with sharp into PNG. Preview and export share resolved manifests.

## Target model

### Template

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | slug | Stable identity |
| `version` | semver | Immutable once published |
| `outputKind` | `banner` \| `slide` | What it produces (banner projects use `banner`, deck projects use `slide`) |
| `set` | slug, optional | Groups layouts used together (for example `msd-core-direction`) |
| `name`, `description`, `purpose` | text | Shown to users and to layout-choosing AI (`purpose` ≤ 200) |
| `brandScope` | `any` or list of brand IDs | Which brands may use it |
| `canvas` | ratios (banners) or one canvas (slides) | Sizes and safe areas |
| `slots` | list | Text, CTA, image, logo, required-line and shape slots |
| `bindings` | object | Colour, font and logo roles per slot and shape |
| `contentContract` | derived | AI output schema generated from slots |
| `status` | `draft` \| `published` \| `deprecated` | Lifecycle |

### Slots

| Type | Fields | Notes |
| --- | --- | --- |
| `text` | `id`, `role` (`headline`, `body`, `eyebrow`, `caption`, `metric`, `label`, `footer`, `page`), `required`, `maxCharacters`, `maxLines`, `fontRole` (`heading` \| `body`), `fontSize`, `minFontSize`, `colorRole`, `fixed` (value not written by AI, e.g. page numbers), placements | Existing text slot plus role, colour role and `fixed` |
| `cta` | as `text`, plus `backgroundRole` | |
| `image` | `id`, `required`, `minWidth`, `minHeight`, `acceptedMimeTypes`, `focalPoint` (`center` \| `top` \| `subject`), `placeholder`, placements | Existing image slot plus focal point and placeholder |
| `logo` | `id`, `logoRole` (`primary`, `light`, `dark`, `symbol`), placements | Replaces the resolved graphic stored in manifests |
| `requiredLine` | `id`, `appliesTo`, `maxLines`, `fontRole`, `colorRole`, placements | Receives brand required lines by composition |
| `shape` | `type` (`rect` \| `ellipse`), `colorRole`, placements | Existing shapes with roles |

Slot `id`s are stable within a template ID across versions unless the major version changes.

### Image placeholders

Every image slot declares what it shows until an image is inserted (D19). Slide templates must declare one; for banners it is used in previews before an image is chosen.

| Field | Meaning |
| --- | --- |
| `placeholder.shape` | `rect` or `roundedRect` |
| `placeholder.fill` | Colour role or neutral value (for example `#D9D9D9`) |
| `placeholder.label` | Short text such as *Replace image* (≤ 40 characters), or empty |
| `placeholder.labelFontRole`, `placeholder.labelColor` | Label styling |

In PowerPoint exports the placeholder becomes native shapes that users can select and replace; in previews it is drawn the same way.

### Content contract

Generated from the slots: a strict JSON schema with one string property per non-fixed text or CTA slot, `minLength` 1 for required slots, `maxLength` from `maxCharacters`, and a description stating `maxLines` and the slot role. Fixed slots are filled by composition. This generalises `presentationAiContract`.

## Brand scope and availability

A project can use a template version when:

1. `status` is `published`;
2. `outputKind` matches the project: `banner` for banner sets, `slide` for decks;
3. `brandScope` is `any` or includes the project's brand;
4. every binding resolves with the project's pinned brand version (colour roles confirmed, font role resolvable by the renderer, logo role approved).

Templates failing step 4 are listed as unavailable with the missing brand field.

## Resolution

At composition, the renderer input is built from **template version + pinned brand version**. Nothing brand-specific is saved back into the template.

1. Colours: each `colorRole` → confirmed palette value.
2. Fonts: each `fontRole` → brand typography choice → registered font file.
3. Logos: each logo slot → approved asset for the role → verified raster; choose the light or dark role when the background role is not in `logoUsage.allowedBackgrounds`.
4. Required lines: brand `wording.requiredLines` for the asset type → `requiredLine` slots.
5. The resolved manifest is validated (`templateManifestSchema` plus logo rules) and hashed; the output stores the hash and the resolved manifest.

This replaces creating per-brand template versions in `templateBrandService`. Existing resolved versions (such as 1.2.1) remain readable for historical outputs.

## Fit and rendering

- Text is measured with the exact font files used for rendering; line breaking follows the renderer's layout.
- A text slot may shrink from `fontSize` to `minFontSize`. If it still exceeds `maxLines`, the output fails `textFits`; text is never truncated.
- Image slots crop to fill their placement around `focalPoint`; images below `minWidth`/`minHeight` fail `imageResolution`.
- Browser previews and exports use the same resolved manifest and fonts (`AnimatedBanner` and the renderer today).
- Banners export as PNG at exact format dimensions.
- Slides render PNG previews for the application; the deck exports as one PowerPoint file with native text boxes, shapes, the logo image and placeholder shapes (see [deck generation](deck-generation.md), section 7, PPTX export). Slide text is measured with a 5% width margin because PowerPoint lays out text slightly differently.

## Lifecycle and authoring

| Step | Who | How |
| --- | --- | --- |
| Draft | Designer | Banner template editor; code fixtures for slide templates during the proof of concept |
| Validate | System | Manifest validation, content contract generation, preview with each brand in scope |
| Publish | Designer or admin | Immutable version |
| Deprecate | Designer or admin | Hidden from new compositions; existing outputs keep it |

## Migration from today

1. Add `outputKind`, `set`, `brandScope`, `status`, slot roles and bindings to template versions (new manifest schema version).
2. Convert the ten banner templates to role bindings with `brandScope: any` (their geometry is unchanged).
3. Convert the five MSD slide layouts into published `slide` templates in set `msd-core-direction` with `brandScope: [MSD]`, adding placeholder definitions to their image slots.
4. Create the Folkeuniversitetet slide template set (`brandScope: [Folkeuniversitetet]`) with placeholders on every image slot, before the deck milestone (TPL-4).
5. Stop creating per-brand template versions; resolve at composition.

## Acceptance

- One banner template version composes correctly for two brands, and neither brand's values are stored in the template.
- A slide template restricted to MSD is not offered to Folkeuniversitetet, and the Folkeuniversitetet set is not offered to MSD.
- A slide template without a placeholder definition on an image slot cannot be published.
- An output records its template version and resolved manifest hash, and re-rendering from the record reproduces the same PNG checksum.
- Text that cannot fit at `minFontSize` fails `textFits` and is never truncated.
