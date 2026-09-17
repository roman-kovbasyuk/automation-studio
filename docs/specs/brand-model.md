# Brand model

**Status:** Target (draft for owner review) · **Updated:** 17 September 2026 · **Requirements:** BRAND-1–4, COPY-2, VIS-1, FLOW-8 · **Decisions:** D2, D17, D20, D21

What a brand contains, when it is ready for automation, and how it reaches templates and AI.

## Current state

Brands are versioned records (`brand_design_systems`, `brand_design_system_versions`). A snapshot (`brandDraftSchema`, schema version 1 in `shared/contracts.js`) holds:

- name, context text, sources (up to 30) and assets (up to 100: logos, icons, illustrations, patterns, references, fonts);
- logo roles: primary, secondary, symbol, light, dark;
- colour palette (hex tokens with confirmation and evidence) and roles: primary, accent, canvas, surface, primary text, inverse text;
- typography: heading and body font choice (family, weight, fallbacks), licence confirmation, scale (h1, h2, h3, body, caption);
- optional campaign kit (sample hero copy, shape parameters, template references);
- unresolved conflicts.

AI can inspect brand materials and propose a draft with evidence (`brandInspectMaterials`), and propose small colour or type-scale changes (`brandProposeChanges`).

Gaps: no voice, wording rules, image style or languages; fonts limited to Inter and Arimo at 400/600/700 in the renderer; some client brands are hard-coded in `shared/`.

## Snapshot schema version 2

Adds a `guidance` object and font files. Existing fields are unchanged.

### Voice

| Field | Type | Limits | Used by |
| --- | --- | --- | --- |
| `voice.summary` | text | ≤ 600 | Copy, slide text, AI review |
| `voice.traits` | list of text | ≤ 8 items, ≤ 40 each | Copy, AI review |
| `voice.do` | list of text | ≤ 12 items, ≤ 200 each | Copy, AI review |
| `voice.dont` | list of text | ≤ 12 items, ≤ 200 each | Copy, AI review |
| `voice.examples` | list of `{ text, note }` | ≤ 6 | Copy (as examples) |

### Wording rules

| Field | Type | Meaning | Used by |
| --- | --- | --- | --- |
| `wording.requiredLines` | list of `{ id, text, appliesTo, placement }` | Text that must appear verbatim. `appliesTo`: `banners`, `presentations` or both. `placement`: `everyOutput`, `lastSlide`, `anySlide` | Copy, `requiredWording` check |
| `wording.forbiddenTerms` | list of `{ term, reason, suggestion }` | Words or phrases that must not appear | Copy, `forbiddenTerms` check |
| `wording.claimsPolicy` | text ≤ 1,000 | What may be claimed and how (for example no superlatives, cite sources) | Copy, AI review |
| `wording.languages` | list of BCP 47 tags | Languages the brand publishes in; first is default | Copy, `language` check |

### Image style

| Field | Type | Limits | Used by |
| --- | --- | --- | --- |
| `imagery.summary` | text | ≤ 600 | Image prompts, AI review |
| `imagery.subjects.prefer` | list of text | ≤ 12 | Image prompts |
| `imagery.subjects.avoid` | list of text | ≤ 12 | Image prompts (negative), AI review |
| `imagery.treatment` | text | ≤ 300 | Lighting, colour treatment, composition |
| `imagery.people` | text | ≤ 300 | Representation guidance |
| `imagery.referenceAssetIds` | list of asset IDs | ≤ 6 approved `reference` assets | AI review; image prompts where supported |

### Logo usage

| Field | Type | Meaning |
| --- | --- | --- |
| `logoUsage.minWidthPx` | integer | Minimum rendered width |
| `logoUsage.clearSpaceRatio` | number | Clear space as a share of logo height |
| `logoUsage.allowedBackgrounds` | list of colour roles | Backgrounds the primary logo may sit on; others use the light or dark logo role |

### Formats

`formats.banners`: IDs from the banner format list (`shared/bannerFormats.js`) that the brand supports. Recipes offer these as size options.

### Fonts

Font assets (`kind: font`) gain renderer registration:

| Field | Meaning |
| --- | --- |
| `family`, `weight`, `style` | Identity matched by typography choices |
| `format` | `ttf`, `otf` or `woff2` |
| `licenseConfirmed` | Required to use the file in rendering and exports |
| `checksum` | Verified before use |

The renderer registers a brand's confirmed font files when composing for that brand. Typography choices must resolve to a registered file or a bundled family (Inter, Arimo).

**Pilot:** Folkeuniversitetet uses its licensed **Matter** for headings and Inter for body text (D21). The Matter files are uploaded to the brand with `licenseConfirmed: true`, and the heading font choice is confirmed.

**PowerPoint decks:** exported PPTX files reference fonts by family name (D17). The family and style names stored with each font file must match the names installed on computers that open the deck, so a deck shows Matter only where Matter is installed. The package manifest lists required fonts ([quality and escalation](quality-and-escalation.md#packaging-and-delivery)). Whether to embed fonts is an open question for the deck milestone.

## Readiness

A brand has one readiness level, computed on publish and shown in the brand library.

| Level | Requirements | Allows |
| --- | --- | --- |
| **Reference** | Name and at least one source | Browsing |
| **Previewable** | Confirmed colour roles, confirmed typography resolvable by the renderer, approved primary logo | Template previews |
| **Automation-ready** | Previewable, plus `voice.summary`, at least one language, `imagery.summary`, confirmed `wording` (lists may be empty but must be reviewed), at least one supported format for each asset type the brand uses | Projects |

A project can only be created for an automation-ready brand version.

## How the brand reaches outputs

### Templates

Templates reference colour roles, font roles and logo roles. At composition the pinned brand version resolves them (see [template model](template-model.md#resolution)).

### AI context

Each capability receives only the brand fields it needs, as a clearly delimited data block after its system instructions and before the brief.

| Capability | Brand fields |
| --- | --- |
| `analyseMaterials` | `name`, `wording.languages` |
| `writeCopy`, `fillSlides`, `repair` (shorten) | `voice.*`, `wording.requiredLines`, `wording.forbiddenTerms`, `wording.claimsPolicy`, default language |
| `outlineDeck` | `voice.summary`, `wording.claimsPolicy`, default language |
| `generateImages` | `imagery.*` (avoid list as negative guidance), brand colour names for mood only |
| `reviewWithAi` | `voice.*`, `wording.*`, `imagery.*`, colour roles, logo usage |

Rules:

- Brand data is treated as trusted configuration but still passed as data, never as instructions that override system rules.
- Required lines are inserted by composition, not left to the model, whenever a template has a slot for them; the model is told they exist so copy does not repeat them.
- The context block records the brand version ID; jobs store it for audit.

## AI-assisted brand setup

`brandInspectMaterials` is extended to propose voice, wording rules and image style from brand materials, with evidence (`structured_import`, `visual_inference`, `ai_suggestion`, `manual`). Proposed values are unconfirmed until a designer confirms them. Nothing becomes automation-ready from AI suggestions alone.

## Versioning and upgrades

- Publishing creates a new immutable version; the draft remains editable.
- Projects pin the version at creation. A requester can upgrade a project to the latest published version; dependent results become stale ([domain model](domain-model.md#change-propagation)).
- Restoring an older version publishes it as a new version.

## Hard-coded brands

`shared/msdBrand.js`, `shared/novartisBrand.js` and `shared/folkeuniversitetetBrand.js` become seed fixtures that create database brand records. Application code reads brands only from the database.

## Permissions

| Action | Requester | Designer | Admin |
| --- | --- | --- | --- |
| View published brands | ✓ | ✓ | ✓ |
| Edit drafts, confirm AI suggestions, publish | | ✓ | ✓ |
| Upload licensed fonts | | ✓ | ✓ |

## Acceptance

- Folkeuniversitetet is automation-ready with voice, wording, image style, languages, formats and licensed Matter font files confirmed.
- Banners for Folkeuniversitetet render headings in Matter.
- The same banner template renders Folkeuniversitetet and a second brand (for example MSD) correctly without a template change.
- Copy generated for Folkeuniversitetet contains its required line only through composition and none of its forbidden terms in a fixture run.
- A brand missing `imagery.summary` cannot be used to create a project, and the reason is shown.
