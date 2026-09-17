# Recipes

**Status:** Target (draft for owner review) · **Updated:** 17 September 2026 · **Requirements:** FLOW-2, BRIEF-1–5, COPY-1, VIS-1–3, VIS-5, RCP-1–3 · **Model:** [product recipes page](../product/recipes.md) · **Decisions:** D8, D17–D19, D22

The file format, validation, versioning and diagram generation for recipes, the capability catalog they use, and the complete `banner-set` and `deck` recipes for the proof of concept.

## Files

```text
recipes/
  schema.json                 # JSON Schema for recipe files (generated from the zod schema)
  banner-set/
    recipe.yaml
    guidance/
      write-copy.md
      generate-images.md
  deck/
    recipe.yaml
    guidance/
      outline-deck.md
      fill-slides.md
```

- YAML, UTF-8, one recipe per folder. The folder name equals the recipe `id`.
- Guidance files are Markdown, referenced by relative path, at most 4,000 characters each.

## Schema

### Top level

| Field | Type | Rules |
| --- | --- | --- |
| `schemaVersion` | `1` | Required |
| `id` | string | `^[a-z][a-z0-9-]{1,40}$`; equals folder name |
| `assetType` | `banners` \| `presentations` | Required |
| `version` | integer ≥ 1 | Must increase whenever the normalised content changes |
| `title` | string ≤ 80 | Shown to users |
| `description` | string ≤ 300 | Shown in diagrams and admin views |
| `inputs` | list of [inputs](#inputs) | IDs unique |
| `stages` | exactly four [stages](#stages) | Order: `brief`, `copy`, `visuals`, `assets` |
| `checks` | [checks](#checks) | Required |
| `escalateWhen` | list of triggers | From: `hardCheckFailedAfterRepair`, `userRequested`, `aiReviewBelowMin` |
| `outputs` | [outputs](#outputs) | Required |

### Inputs

Values the project needs besides the brief analysis.

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | `^[a-z][A-Za-z0-9]{1,40}$` |
| `label` | string ≤ 80 | Question text shown to the user |
| `type` | `text` \| `number` \| `boolean` \| `select` \| `multiselect` | |
| `options` | list or source | Literal options, or a source: `brand.formats`, `templates.sets` |
| `min`, `max` | number | For `number` and `multiselect` |
| `required` | boolean | Required inputs block the stage that needs them |
| `askWhen` | [condition](#conditions) | Ask only when true and no value is known |
| `default` | value | Used when not asked |

A `select` or `multiselect` input whose source offers exactly one option is filled automatically and not asked.

### Stages

| Field | Type | Rules |
| --- | --- | --- |
| `id` | `brief` \| `copy` \| `visuals` \| `assets` | Fixed order |
| `label` | string ≤ 30 | |
| `contract` | string ≤ 300 | What the stage hands to the next one |
| `entry` | node ID | First node |
| `nodes` | list of [nodes](#nodes) | IDs unique across the recipe |

### Nodes

Common fields: `id` (`^[A-Za-z][A-Za-z0-9-]{0,31}$`), `kind`, `label` (≤ 80), `detail` (≤ 240, optional).

| Kind | Additional fields | Meaning |
| --- | --- | --- |
| `action` | `capability`, `settings`, `guidance`, `skipWhen`, `next` | The system runs a capability |
| `touchpoint` | `capability`, `settings`, `next` | The user confirms, edits or chooses |
| `condition` | `when`, `yes`, `no` | A required condition with two branches |
| `recovery` | `returnTo`, `repair`, `escalate` | What happens when a condition fails |
| `output` | `produces` | A saved result that ends the stage |

- `capability` is `<id>` or `<id>@<major>`; it must exist in the catalog and support the node kind.
- `settings` are validated against the capability's settings schema.
- `next`, `yes`, `no` and `returnTo` reference node IDs. `next` may point to the entry of the following stage.
- `repair` (recovery only): `{ <checkId>: { action: <repairAction>, attempts: 1..3 } }`.
- `escalate` (recovery only): `offer` (show design help) or `none`.

### Conditions

A restricted language. No free code.

```yaml
{ input: sizes, exists: true }
{ input: wordingFidelity, equals: verbatim }
{ answer: copyMode, equals: keep_and_create }
{ analysis: foundCopy, exists: true }
{ check: analysisValid }
{ checks: [textFits, requiredWording] }
{ all: [ <condition>, <condition> ] }
{ any: [ <condition>, <condition> ] }
```

`check` and `checks` refer to capability checks (for example `sourcesReadable`, `analysisValid`) or recipe hard checks. `answer` refers to the confirmed brief answers (`summary`, `audience`, `copyMode`, `ageGroups`, `gender`, `reach`, `goal`, `goalCustom`, `visualTags`), `analysis` to the analysis result, `input` to recipe inputs.

### Sources

Settings and input options may reference: `inputs.<id>`, `answers.<field>`, `brand.formats`, `brand.templates.<assetType>` (published templates available to the project's brand), `templates.sets` (template sets available to the brand) and `project.outline` (the confirmed deck outline).

### Checks

```yaml
checks:
  hard: [textFits, requiredWording, forbiddenTerms, logoSafeArea, contrast, imageResolution, outputSizes, fileIntegrity]
  aiReview: { mode: shadow }          # shadow | enforced | off; enforced requires minScore
  repair:
    textFits: { action: shortenCopy, attempts: 2 }
    forbiddenTerms: { action: avoidTerms, attempts: 1 }
```

Check and repair IDs come from [quality and escalation](quality-and-escalation.md#check-catalog).

### Outputs

```yaml
outputs:
  formats: [png]                      # banners: png; presentations: pptx
  package: zipWithManifest
```

## Validation

Run in tests (`recipes.test.js`) and when the server starts. The server refuses to start with an invalid recipe.

1. The file matches the schema.
2. IDs are unique; all references resolve; the folder name equals `id`.
3. Every capability exists, supports the node kind, and its settings validate.
4. Every node is reachable from the brief stage entry; every stage reaches the next stage entry or ends in an `output`.
5. Every `condition` has both branches; every `recovery` has `returnTo`.
6. Cycles are allowed only through `recovery.returnTo`, and every such cycle contains a bounded `repair` or requires a user touchpoint.
7. Guidance files exist and respect the size limit.
8. Checks, repairs and triggers exist in the check catalog and apply to the asset type.
9. Required capability inputs are produced upstream (capabilities declare `requires` and `produces`).
10. **Version rule:** if the normalised content differs from the stored definition for the same `id` and `version`, validation fails with "increase version".

## Normalisation and pinning

1. Parse YAML, apply defaults, inline guidance text.
2. Serialise as canonical JSON (sorted keys) and compute SHA-256.
3. On project creation, store `{hash, id, version, definition}` if new, and pin the hash on the project.

Projects in progress keep their pinned definition after files change. See [domain model](domain-model.md#version-pinning).

## Diagrams

Diagrams are generated from the normalised definition; nothing is drawn by hand ([D8](../product/decisions.md)).

| Kind | Mermaid | FigJam |
| --- | --- | --- |
| `action` | `id["label"]` class `action` | Blue rounded rectangle |
| `touchpoint` | `id(["label"])` class `touchpoint` | Blue rounded rectangle with a person marker |
| `condition` | `id{"label"}` class `condition`; edges labelled Yes / No | Yellow diamond |
| `recovery` | `id["label<br/>detail<br/>Return to …"]` class `recovery` | Red card below its source |
| `output` | `id["label"]` class `output` | Green rounded rectangle |

- Layout: stages left to right; main path on top; recovery cards below the condition that leads to them; each stage ends with its contract text.
- Capability standard recovery (from the catalog) is drawn as dashed red cards so it is visible without being written in recipes.
- **Mermaid** output is written to `docs/product/recipe-diagrams/<id>.md` by a script and checked in tests for drift.
- **FigJam** boards are created from the Mermaid source with the Figma MCP diagram tool and Figma skills. Each board is labelled *Generated from `recipes/<id>` version N — comment here, edit the recipe file*. The Figma connector must be authorised in the session that generates boards.

## Capability catalog

Version 1 capabilities for the proof of concept. "Today" names the existing implementation to reuse.

| Capability | Kind | Asset types | Settings | Produces | Today |
| --- | --- | --- | --- | --- | --- |
| `collectMaterials` | touchpoint | all | `maxBytes` (≤ 25 MB) | brief sources | Home composer, `briefSourceService` |
| `analyseMaterials` | action | all | `suggestVisualKeywords` (0–7) | analysis, found copy, draft answers | `analyseBrief` with sources (`generationService`) |
| `confirmBrief` | touchpoint | all | `questions` (answer fields and recipe inputs to ask) | confirmation | `briefingService` confirmation; when copy was found, `copyMode` records whether to also write new copy (`keep_original` or `keep_and_create`), otherwise it is `create_new` |
| `importSuppliedCopy` | action | banners | — | copy items (supplied) | confirmation when copy was found (`keep_original` or `keep_and_create`) |
| `writeCopy` | action | banners | `variants` (1–5) | copy items (generated) | `generateCopy` |
| `chooseCopy` | touchpoint | banners | `min` (≥ 1) | selected copy items | Copy module selection |
| `outlineDeck` | action | presentations | `templateSet`, `slideCount` source | outline (layout per slide) | `presentationPlanContract` (no service yet) |
| `editOutline` | touchpoint | presentations | — | confirmed outline | new |
| `fillSlides` | action | presentations | `wordingFidelity` source | slide text | `presentationAiContract` (no service yet) |
| `editSlides` | touchpoint | presentations | — | slide text (edited) | new |
| `generateImages` | action | banners | `per`: `selectedCopy` \| `project`; `count` | visuals | `generateDirections` + `generateImage` |
| `chooseVisuals` | touchpoint | banners | `allowUpload` | selected visuals | Visuals module, `visualUploadService` |
| `usePlaceholders` | action | presentations | — | placeholder use recorded per image slot (D19) | new; placeholders come from slide templates |
| `compose` | action | all | `templates` source, `formats` source | outputs | renderer, banner batches |
| `runChecks` | action | all | — (uses recipe checks) | check results | new |
| `repair` | action | all | — (uses recipe repair) | output revisions | new |
| `reviewWithAi` | action | all | `mode` | AI reviews | new |
| `presentAssets` | touchpoint | all | — | accepted outputs, escalation requests | new |
| `escalate` | action | all | — | escalation (route `figma` for banners, `pptx` for decks) | `figmaHandoffService` for banners; new escalation service and PPTX file exchange for decks (D18) |
| `packageOutputs` | action | all | `formats` (`png` for banners, `pptx` for decks) | package | `deliveryService`; PPTX writer for decks (new) |

Capability checks used in conditions: `sourcesReadable`, `analysisAccessReady`, `analysisValid`, `copyValid`, `outlineValid`, `slideTextValid`, `visualsValid`.

### Standard recovery (declared in code)

| Situation | Behaviour |
| --- | --- |
| Provider call failed with a known cause | Job `failed`; inputs kept; user retries this step |
| Outcome uncertain (timeout after dispatch) | Job `unknown`; reconcile automatically if possible; otherwise offer **Mark as failed** |
| Provider blocked the content | Job `blocked`; explain; user edits input or uploads |
| Result invalid against the contract | Job `failed` with the reason; partial valid results kept where the capability allows |
| Storage failed after success | Retry storing the same result; never re-run the provider |
| Upstream input changed during the step | Result saved as stale; user returns to the changed stage |

## Recipe: `banner-set`

```yaml
schemaVersion: 1
id: banner-set
assetType: banners
version: 1
title: Banner set
description: Campaign banners in the requested sizes from a brief and materials.

inputs:
  - id: sizes
    label: Which banner sizes do you need?
    type: multiselect
    options: brand.formats
    min: 1
    required: true

stages:
  - id: brief
    label: Brief
    contract: Confirmed brief with source references, audience, goal, reach, visual keywords, sizes and copy choice
    entry: B1
    nodes:
      - { id: B1, kind: touchpoint, capability: collectMaterials, label: Add campaign materials, next: B2 }
      - { id: B2, kind: condition, label: Sources readable?, when: { check: sourcesReadable }, yes: B3, no: B2r }
      - { id: B2r, kind: recovery, label: Unreadable source, detail: Replace the file or paste text, returnTo: B1 }
      - { id: B3, kind: condition, label: Analysis available?, when: { check: analysisAccessReady }, yes: B4, no: B3r }
      - { id: B3r, kind: recovery, label: Analysis unavailable, detail: Check access and quota without generating, returnTo: B3 }
      - id: B4
        kind: action
        capability: analyseMaterials
        label: Analyse materials
        settings: { suggestVisualKeywords: 7 }
        next: B5
      - { id: B5, kind: condition, label: Analysis valid for current sources?, when: { check: analysisValid }, yes: B6, no: B5r }
      - { id: B5r, kind: recovery, label: Invalid or stale analysis, detail: Clarify missing facts, then analyse again, returnTo: B1 }
      - id: B6
        kind: touchpoint
        capability: confirmBrief
        label: Review questions and confirm
        settings: { questions: [summary, audience, goal, reach, visualTags, copyMode, sizes] }
        next: C1

  - id: copy
    label: Copy
    contract: At least one selected copy item with its origin
    entry: C1
    nodes:
      - id: C1
        kind: condition
        label: Copy found in the materials?
        when: { analysis: foundCopy, exists: true }
        yes: C2
        no: C3
      - { id: C2, kind: action, capability: importSuppliedCopy, label: Import copy from materials, next: C2a }
      - { id: C2a, kind: condition, label: Also write new copy?, when: { answer: copyMode, equals: keep_and_create }, yes: C3, no: C5 }
      - id: C3
        kind: action
        capability: writeCopy
        label: Write five copy options
        settings: { variants: 5 }
        guidance: guidance/write-copy.md
        next: C4
      - { id: C4, kind: condition, label: Copy valid and current?, when: { check: copyValid }, yes: C5, no: C4r }
      - { id: C4r, kind: recovery, label: Invalid or partial copy, detail: Keep valid options; retry confirmed failures only, returnTo: C3 }
      - { id: C5, kind: touchpoint, capability: chooseCopy, label: Edit and select copy, settings: { min: 1 }, next: V1 }

  - id: visuals
    label: Visuals
    contract: A current image for every selected copy item
    entry: V1
    nodes:
      - id: V1
        kind: action
        capability: generateImages
        label: Generate one image per selected copy
        settings: { per: selectedCopy, count: 1 }
        guidance: guidance/generate-images.md
        next: V2
      - { id: V2, kind: condition, label: Images valid and usable?, when: { check: visualsValid }, yes: V3, no: V2r }
      - { id: V2r, kind: recovery, label: Image failed or blocked, detail: Keep successful images; regenerate or upload, returnTo: V3 }
      - { id: V3, kind: touchpoint, capability: chooseVisuals, label: Choose or upload images, settings: { allowUpload: true }, next: A1 }

  - id: assets
    label: Assets
    contract: Accepted banners and a delivered package
    entry: A1
    nodes:
      - id: A1
        kind: action
        capability: compose
        label: Compose banners
        settings: { templates: brand.templates.banners, formats: inputs.sizes }
        next: A2
      - { id: A2, kind: action, capability: runChecks, label: Run quality checks, next: A3 }
      - { id: A3, kind: condition, label: All hard checks pass?, when: { checks: [textFits, requiredWording, forbiddenTerms, logoSafeArea, contrast, imageResolution, outputSizes, fileIntegrity] }, yes: A4, no: A3r }
      - id: A3r
        kind: recovery
        label: Repair, then offer design help
        detail: Shorten copy up to two times; if it still fails, offer design help
        repair: { textFits: { action: shortenCopy, attempts: 2 }, forbiddenTerms: { action: avoidTerms, attempts: 1 } }
        escalate: offer
        returnTo: A2
      - { id: A4, kind: action, capability: reviewWithAi, label: AI review (shadow), settings: { mode: shadow }, next: A5 }
      - { id: A5, kind: touchpoint, capability: presentAssets, label: Accept, adjust or request design help, next: A6 }
      - { id: A6, kind: action, capability: packageOutputs, label: Package accepted banners, settings: { formats: [png] }, next: A7 }
      - { id: A7, kind: output, label: Download package, produces: [package] }

checks:
  hard: [textFits, requiredWording, forbiddenTerms, logoSafeArea, contrast, imageResolution, outputSizes, fileIntegrity]
  aiReview: { mode: shadow }
  repair:
    textFits: { action: shortenCopy, attempts: 2 }
    forbiddenTerms: { action: avoidTerms, attempts: 1 }

escalateWhen: [hardCheckFailedAfterRepair, userRequested]

outputs:
  formats: [png]
  package: zipWithManifest
```

## Recipe: `deck`

```yaml
schemaVersion: 1
id: deck
assetType: presentations
version: 1
title: Deck
description: One editable PowerPoint deck from a brief and materials, using the brand's slide templates.

inputs:
  - id: slideCount
    label: How many slides?
    type: number
    min: 3
    max: 15
    required: true
  - id: wordingFidelity
    label: How closely should slides follow your wording?
    type: select
    options: [verbatim, edit, rethink]
    default: edit
  - id: templateSet
    label: Which slide template set?
    type: select
    options: templates.sets
    required: true

stages:
  - id: brief
    label: Brief
    contract: Confirmed brief with source references, audience, purpose, slide count, wording fidelity and template set
    entry: B1
    nodes:
      - { id: B1, kind: touchpoint, capability: collectMaterials, label: Add materials, next: B2 }
      - { id: B2, kind: condition, label: Sources readable?, when: { check: sourcesReadable }, yes: B3, no: B2r }
      - { id: B2r, kind: recovery, label: Unreadable source, detail: Replace the file or paste text, returnTo: B1 }
      - { id: B3, kind: condition, label: Analysis available?, when: { check: analysisAccessReady }, yes: B4, no: B3r }
      - { id: B3r, kind: recovery, label: Analysis unavailable, detail: Check access and quota without generating, returnTo: B3 }
      - { id: B4, kind: action, capability: analyseMaterials, label: Analyse materials, settings: { suggestVisualKeywords: 7 }, next: B5 }
      - { id: B5, kind: condition, label: Analysis valid for current sources?, when: { check: analysisValid }, yes: B6, no: B5r }
      - { id: B5r, kind: recovery, label: Invalid or stale analysis, detail: Clarify missing facts, then analyse again, returnTo: B1 }
      - id: B6
        kind: touchpoint
        capability: confirmBrief
        label: Review questions and confirm
        settings: { questions: [summary, audience, goal, visualTags, slideCount, wordingFidelity, templateSet] }
        next: C1

  - id: copy
    label: Copy
    contract: Confirmed outline and valid text for every slide
    entry: C1
    nodes:
      - id: C1
        kind: action
        capability: outlineDeck
        label: Propose outline
        settings: { templateSet: inputs.templateSet, slideCount: inputs.slideCount }
        guidance: guidance/outline-deck.md
        next: C2
      - { id: C2, kind: condition, label: Outline valid?, when: { check: outlineValid }, yes: C3, no: C2r }
      - { id: C2r, kind: recovery, label: Invalid outline, detail: Unknown layout or wrong slide count; retry or edit, returnTo: C3 }
      - { id: C3, kind: touchpoint, capability: editOutline, label: Adjust slides and layouts, next: C4 }
      - id: C4
        kind: action
        capability: fillSlides
        label: Write slide text
        settings: { wordingFidelity: inputs.wordingFidelity }
        guidance: guidance/fill-slides.md
        next: C5
      - { id: C5, kind: condition, label: Slide text fits its layouts?, when: { check: slideTextValid }, yes: C6, no: C5r }
      - id: C5r
        kind: recovery
        label: Text does not fit
        detail: Shorten automatically up to two times, then edit manually
        repair: { textFits: { action: shortenSlideText, attempts: 2 } }
        returnTo: C6
      - { id: C6, kind: touchpoint, capability: editSlides, label: Edit slide text, next: V1 }

  - id: visuals
    label: Visuals
    contract: Every image slot uses its template placeholder (D19)
    entry: V1
    nodes:
      - { id: V1, kind: action, capability: usePlaceholders, label: Use template placeholders for images, next: A1 }

  - id: assets
    label: Assets
    contract: The accepted deck delivered as one PowerPoint file
    entry: A1
    nodes:
      - { id: A1, kind: action, capability: compose, label: Compose deck, settings: { templates: project.outline, formats: [widescreen] }, next: A2 }
      - { id: A2, kind: action, capability: runChecks, label: Run quality checks, next: A3 }
      - { id: A3, kind: condition, label: All hard checks pass?, when: { checks: [textFits, requiredWording, forbiddenTerms, logoSafeArea, contrast, slideCount, fileIntegrity] }, yes: A4, no: A3r }
      - id: A3r
        kind: recovery
        label: Repair, then offer design help
        detail: Shorten slide text up to two times; if it still fails, offer design help
        repair: { textFits: { action: shortenSlideText, attempts: 2 }, forbiddenTerms: { action: avoidTerms, attempts: 1 } }
        escalate: offer
        returnTo: A2
      - { id: A4, kind: action, capability: reviewWithAi, label: AI review (shadow), settings: { mode: shadow }, next: A5 }
      - { id: A5, kind: touchpoint, capability: presentAssets, label: Accept the deck, adjust or request design help, next: A6 }
      - { id: A6, kind: action, capability: packageOutputs, label: Package the PowerPoint file, settings: { formats: [pptx] }, next: A7 }
      - { id: A7, kind: output, label: Download package, produces: [package] }

checks:
  hard: [textFits, requiredWording, forbiddenTerms, logoSafeArea, contrast, slideCount, fileIntegrity]
  aiReview: { mode: shadow }
  repair:
    textFits: { action: shortenSlideText, attempts: 2 }
    forbiddenTerms: { action: avoidTerms, attempts: 1 }

escalateWhen: [hardCheckFailedAfterRepair, userRequested]

outputs:
  formats: [pptx]
  package: zipWithManifest
```

## Guidance files

Guidance adds recipe-specific direction; capability prompts and brand context always apply first.

| File | Content |
| --- | --- |
| `banner-set/guidance/write-copy.md` | Banner copy is read in seconds: one idea per option; headline carries the message; CTA is a verb phrase; options differ in angle, not wording |
| `banner-set/guidance/generate-images.md` | One clear subject; negative space where the template places text; no text, logos or UI in images |
| `deck/guidance/outline-deck.md` | One message per slide; use the opening layout first and the closing layout last; evidence layouts only for real numbers from the materials |
| `deck/guidance/fill-slides.md` | Respect wording fidelity; never invent numbers, sources or contacts; keep page and step numbers fixed; do not describe images, because image slots are placeholders |

## Tests

| Test | Checks |
| --- | --- |
| Schema and reference validation | Every recipe file passes rules 1–9 |
| Version rule | Changing content without increasing `version` fails |
| Capability compatibility | Settings validate; required inputs are produced upstream |
| Diagram drift | Generated Mermaid equals the committed diagram |
| Fixture run | Each recipe runs end to end with mock providers and fixtures |
