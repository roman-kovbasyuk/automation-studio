# M1 Brand as Input Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement this plan task by task, with a fresh spec-compliance and code-quality review at each gate. Steps use checkbox syntax for tracking.

**Status:** Proposed engineering plan · **Updated:** 20 September 2026

**Goal:** Create a banner project with a published brand version, apply its approved guidance and licensed typography, and reproduce its outputs after the brand changes.

**Architecture:** Extend existing brand, campaign, generation and version services. Resolve reusable template roles against a pinned immutable brand; save the resolved manifest and font identities with each build. Keep legacy concrete templates and unpinned campaigns readable and operational.

**Tech stack:** React, Fastify, PostgreSQL, Zod, fontkit, sharp, Vitest, Brutalist workspace.

**Spec:** [Brand model](../specs/brand-model.md), [template model](../specs/template-model.md), [domain model](../specs/domain-model.md), [campaign migration](../specs/campaign-migration.md), [decision log](../product/decisions.md), [front-end contract](../../FRONTEND.md).

The product direction is established by D2, D20, D21 and D31. Detailed specifications remain drafts. The choices below are concrete recommendations for specification alignment before implementation, not a claim that M1 is already implemented or that every contract is approved.

## Scope and proposed decisions

- Banners only. Preserve current five visible stages and mandatory review/delivery. Four-stage navigation, recipes, quality escalation, decks and PPTX belong to later milestones.
- Keep all old brand snapshots and concrete template versions byte-for-byte unchanged. A new additive migration follows `054_generation_job_resolution.sql`; never edit old migrations.
- Use versioned brand readers: v1 remains readable; v2 adds guidance. Restoring old content creates a newly validated version.
- Represent review explicitly: each guidance section has confirmation evidence `{ confirmedAt, confirmedBy, contentHash }` written by the server. Confirmation is bound to canonical section content; any edit or AI replacement clears it. An intentionally empty wording list can be confirmed; missing confirmation is not approval. AI suggestions never write this evidence.
- Permit publishing a valid reference/previewable brand with its readiness reasons. Only an automation-ready brand can be selected for a new branded banner project. Compute authoritative readiness before requester redaction.
- New branded projects run the existing workflow during M1; brand presence never changes review requirements. Keep `recipe_hash` absent until M2 explicitly migrates these transitional records.
- Pins are immutable in M1. Defer FLOW-8 brand upgrade to a separate command with staleness, in-flight job handling and audit design. Ordinary campaign PATCH cannot change a pin.
- Required wording is allocated deterministically to explicit template slots in configured order. Reject missing capacity or overflow; never truncate or ask the model to supply it. Banner templates reject slide-only placement such as `lastSlide` as unsupported for this asset type.
- Propose nesting `logoUsage` and `formats` under guidance; align that shape in the brand model before implementation. Resolve only explicit approved role bindings; a missing contrast-safe variant is a validation issue, not permission to invent a white backing or a new colour.
- Matter headings and Inter body are the Folkeuniversitetet pilot target. Roman supplies licensed Matter files, intended-use confirmation and approved guidance. CI uses a redistributable font fixture; Matter Mono is not an extra requirement.
- No implicit paid calls, permission expansion, bulk confirmation, template editor, new design-system implementation or dependency upgrade as part of M1.

## Ownership map

| Boundary | Existing owner | New focused unit |
| --- | --- | --- |
| Brand contracts/readiness | `shared/contracts.js`, `shared/brandDesignSystem.js` | `shared/brandSnapshot.js`, `shared/brandSnapshot.test.js` |
| Immutable fonts | Brand service/repository and asset store | `server/services/brandFontResolver.js`, corresponding test |
| Template resolution | `shared/templateManifest.js`, `shared/resolveTemplateBrand.js` | Extend these owners; separate source and render schemas |
| Pinned project | `server/routes/campaigns.js`, `server/repositories/campaignRepository.js` | Nullable persisted pin; existing creation transaction |
| Composition/history | `server/services/versionService.js`, `server/repositories/versionRepository.js` | Resolved build snapshot; no new composition service |
| Provider input | Generation repository/service and providers | `shared/brandGenerationContext.js`, corresponding test |
| User controls | `src/studio/brand/`, `StudioApp.jsx`, `api.js` | Existing forms and public Brutalist components |

Read the package `AGENTS.md` before any change inside `packages/brutalist-design-system`. Its public API stays intact unless a separately reviewed package change is necessary.

## Task 1: Compatible brand snapshots and readiness

**Files:** Create `shared/brandSnapshot.js` and `.test.js`; modify `shared/contracts.js`, `shared/brandDesignSystem.js`, `server/services/brandDesignSystemService.js`, `server/repositories/brandDesignSystemRepository.js`, `server/routes/brandDesignSystems.js` and owning tests; create `server/db/migrations/055_brand_snapshot_v2.sql` (renumber if another migration lands first).

**Interfaces:** `readBrandSnapshot({ schemaVersion, snapshot })` validates and returns the original version shape. `normalizeBrandDraft(version)` makes an editable v2 draft without fabricated confirmations. `evaluateBrandReadiness(snapshot, { assetType, fontResolution, assetVerification })` returns `{ level, issues: [{ field, code, message }] }`, where level is `reference`, `previewable` or `automation_ready`. Technical facts come from server verification, not client flags. Add `confirmBrandGuidance({ actor, brandId, section, expectedRevision, contentHash })` to the brand service/routes: validate edit permission and revision, hash the stored section and reject mismatches, then stamp actor/time/hash on that exact section. Generic draft PATCH ignores client-supplied confirmation and preserves prior server evidence only when its content hash still matches; changed sections lose confirmation.

- [ ] Align the proposed decisions above with the spec. Define strict bounds for voice, wording, imagery, language tags, logo usage and formats beside their Zod fields; persist the agreed field names in the spec before consumers use them.
- [ ] Add failing v1 compatibility and v2 confirmation tests. Use the existing brand fixture, serialize before reading, and assert it is unchanged. Example invariant:

```js
const before = JSON.stringify(legacyVersion)
readBrandSnapshot(legacyVersion)
expect(JSON.stringify(legacyVersion)).toBe(before)
const draft = normalizeBrandDraft(legacyVersion)
expect(draft.guidance.wording.confirmation).toBeNull()
```

- [ ] Run `npm run test:run -- shared/brandSnapshot.test.js server/services/brandDesignSystemService.test.js`; verify the new assertions fail for missing functionality.
- [ ] Implement the version dispatch and new schema. Widen the database check to 1/2; explicitly write schema version on publish. Validate referenced assets belong to the same brand and are verified. Preserve current owner/grant restrictions and revision/idempotency checks.

```js
export function readBrandSnapshot({ schemaVersion, snapshot }) {
  if (schemaVersion === 1) return brandSnapshotV1Schema.parse(snapshot)
  if (schemaVersion === 2) return brandSnapshotV2Schema.parse(snapshot)
  throw new Error('Unsupported brand snapshot version')
}
```

- [ ] Test forged/copied confirmation evidence, edits after review, stale hash/revision, AI replacement, confirmed-empty wording versus absent review, malformed languages, foreign assets, restore-to-new-version, publication conflict and requester redaction. Test migration from a pre-M1 schema and a fresh isolated schema; compare historical snapshot checksums.
- [ ] Run focused tests; review and commit `feat: add compatible brand guidance and readiness`.

**Gate:** An old project/brand still loads; a suggested or technically unresolved brand cannot be presented as automation-ready.

## Task 2: Verified immutable font assets

**Files:** Create `server/services/brandFontResolver.js` and `.test.js`; modify brand service/repository asset metadata, `server/rendering/inProcessRenderer.js`, `server/rendering/bannerRenderer.js`, `server/services/figmaPackage.js`, `src/studio/AnimatedBanner.jsx`, `src/studio/brand/TypographyEditor.jsx` and owning tests.

**Interfaces:** `resolveBrandFonts({ brandVersion, assetStore })` returns verified descriptors containing asset ID, checksum, decoded family/style/weight and bytes. Rendering and `compileRenderSlotProvenance` receive the same descriptors. Cache identity includes brand version, checksum and face identity; family name alone is insufficient.

- [ ] Add a redistributable font fixture with provenance/license. Write a failing test resolving two same-family files from different brand versions and checking that descriptors and output measurements remain isolated.
- [ ] Run `npm run test:run -- server/services/brandFontResolver.test.js`; expect missing resolver failure.
- [ ] Decode uploaded font bytes with fontkit, validate actual face/weight/style against declarations, verify asset checksum and license confirmation, and return field-specific readiness issues for unsupported inputs. Reject foreign-brand assets even if the caller knows their ID.

```js
// The renderer's font lookup uses the verified face, never a global family registry.
const fontKey = [brandVersion.id, asset.sha256, face.family, face.style, face.weight].join(':')
```

- [ ] Authorize historical asset access through the referenced immutable brand version. Do not restrict old pinned fonts to the active snapshot; do not expose arbitrary brand assets through this route.
- [ ] Pass identical descriptors through render, fit/provenance and Figma export. Load the exact browser font before measurement/preview, or use an exact server-rendered preview. Remove silent non-Arimo-to-Inter fallback only for the new verified-font path; retain legacy rendering.
- [ ] Test corrupt bytes, checksum mismatch, unlicensed face, foreign asset, unsupported weight/style, concurrent same-name fonts and historical-version access. Verify browser font readiness and renderer/provenance agreement.
- [ ] Run resolver, renderer and Figma tests, then review and commit `feat: render immutable brand font assets`.

**Gate:** No silent font substitution; a new upload cannot change an old render.

## Task 3: Resolve role templates without changing the catalog

**Files:** Modify `shared/templateManifest.js`, `shared/resolveTemplateBrand.js`, `server/repositories/templateRepository.js`, `server/routes/templates.js`, `server/services/templateBrandService.js`, `server/bootstrap.js`, `server/services/versionService.js`, `server/repositories/versionRepository.js`, `server/services/figmaPackage.js` and owning tests. Add new versions of the three existing banner layouts in their current template definitions, retaining geometry.

**Interfaces:** `resolveTemplateForBrand({ templateVersion, brandVersion, verifiedAssets, verifiedFonts, assetType })` returns `{ resolvedManifest, resolvedManifestHash, sourceTemplateHash, fontReferences, brandVersionId }`. Source role schema and resolved renderer schema are distinct versioned contracts. The resolver is pure and does not publish catalog entries.

- [ ] Write a failing test using one source template version with two brands. Assert identical source hash, distinct resolved hashes, correct roles, and unchanged source manifest.

```js
expect(resultA.sourceTemplateHash).toBe(resultB.sourceTemplateHash)
expect(resultA.resolvedManifestHash).not.toBe(resultB.resolvedManifestHash)
expect(sourceAfter).toEqual(sourceBefore)
```

- [ ] Run `npm run test:run -- shared/resolveTemplateBrand.test.js`; confirm the new case fails.
- [ ] Implement lifecycle, output kind, brand scope, logo and required-line bindings in the source schema. Resolve approved values and verified fonts. Return explicit issues for scope/format mismatch, missing roles, mandatory-line overflow or missing suitable logo.
- [ ] Derive `contentContract` from non-fixed editable text/CTA slots: keys are slot IDs; required fields have `minLength: 1`; apply each slot's `maxCharacters` and description, reject extra keys. Exclude fixed text, required wording, logos and image slots. Add tests for mixed fixed/editable slots and apply the derived contract when mapping selected copy into composition slots. Copy generation precedes template selection in the current flow, so preserve its generic contract; do not require a template at that step or let a second handwritten composition schema drift from the manifest.
- [ ] Persist both source identity/hash and exact resolved manifest/hash/font references in existing composition/build records. Use saved resolution for rerender, Figma and delivery provenance; never resolve against the latest brand during replay.
- [ ] Disconnect automatic `onPublish: templateBrandService.refresh` catalog mutation entirely once compatible readers and catalog selection are deployed. Historical concrete versions stay readable without refresh. Keep a deliberate compatibility query for old unpinned projects so a global latest-role version cannot displace their renderable concrete templates. Retire only the obsolete new-template assignment UI/API path, preserving historical reads.
- [ ] Test no catalog write on brand publish, same geometry under two brands, old concrete rendering, deterministic required-line text, missing capacity/overflow, scope checks and checksum-stable rerender. Run resolver, template service, version and Figma tests.
- [ ] Review and commit `feat: resolve reusable banner templates against brands`.

**Gate:** Publishing a brand changes neither existing projects nor global template versions. Legacy template selection remains usable.

## Task 4: Transactional project brand pin

**Files:** Add `server/db/migrations/056_campaign_brand_version.sql` (use next free number); modify `shared/contracts.js`, `server/routes/campaigns.js`, `server/services/workflowService.js`, `server/repositories/campaignRepository.js`, existing `server/routes/routes.test.js` and workflow-service tests, `src/studio/StudioApp.jsx`, `src/studio/api.js`, `src/prototype/api/` campaign adapters and fixtures.

**Interfaces:** Creation accepts an explicit `brandVersionId` for a branded project; the server validates and pins that exact published version. Responses expose nullable `brandVersionId`. Old projects retain null. Pin validation and campaign insertion share one database transaction.

- [ ] Add a failing API test creating a project with version A while version B is published. The returned/stored pin must remain A, never whichever version is latest when later work runs.
- [ ] Run campaign route/repository tests and confirm the missing field/validation failure.
- [ ] Add nullable FK and response mapping. Enforce access, published status, automation readiness and banner format support using authoritative data. Reject arbitrary client brand snapshots; reject attempts to change the pin through general PATCH.

```js
// Inside the existing creation transaction:
const version = await loadAuthorizedPublishedBrandVersion(client, actor, input.brandVersionId)
assertAutomationReady(version, 'banners')
return insertCampaign(client, { ...validatedCampaign, brandVersionId: version.id })
```

- [ ] Add chooser and pinned-version display using existing UI controls; update prototype adapters to exercise exactly the same field shape. Explain why unavailable brands cannot be chosen.
- [ ] Test unauthorized/missing/unready versions, idempotency/conflict, later publication, legacy null projects, regular PATCH immutability and unchanged mandatory review/delivery. Do not infer legacy state from `projectType`: existing rows have already been backfilled.
- [ ] Review and commit `feat: pin new banner projects to a brand version`.

**Gate:** New pins are reproducible and access-controlled; no guessed backfill or workflow switch.

## Task 5: Capture brand guidance in durable generation inputs

**Files:** Create `shared/brandGenerationContext.js` and `.test.js`; modify strict generation schemas in `shared/contracts.js`, `server/repositories/generationJobRepository.js`, `server/services/generationService.js`, Gemini/personal/mock provider mappings and their owning tests.

**Interfaces:** `brandContextFor(operation, pinnedVersion)` emits a bounded provider projection with `brandVersionId`. Brief analysis gets name/languages; copy gets voice, wording and default language; directions/images get imagery and palette. Prepared job `input_snapshot` captures this projection and pin atomically. Existing audience and keywords remain present.

- [ ] Write failing projection tests and durable-job replay tests. Publish a newer brand after preparing a job; replay must use the old input snapshot and must not dispatch an extra provider call.

```js
expect(replayedJob.inputSnapshot.brandContext).toEqual(preparedJob.inputSnapshot.brandContext)
expect(provider.calls).toHaveLength(1)
```

- [ ] Run projection and generation tests; verify new assertions fail.
- [ ] Implement operation-specific projection, include pin/projection in input fingerprints, and load it from the prepared snapshot in generationService. Extend strict mock/personal/Vertex schemas together; do not attach unneeded source documents, asset bytes or fonts to prompts.
- [ ] Delimit brand guidance as data after system instructions. Preserve existing prompt-injection boundaries. Tell copy generation that deterministic mandatory wording is composed separately and must not be duplicated.
- [ ] Test each operation's exact included/excluded fields, injection-like guidance, job retry/reclaim, no jobs on navigation/status, audience/keyword preservation and legacy null-brand input behavior.
- [ ] Review and commit `feat: capture pinned brand guidance in generation jobs`.

**Gate:** Publication during an in-flight job cannot change its prompt or output lineage.

## Task 6: Brand editing, fixtures and pilot acceptance

**Files:** Modify `src/studio/brand/MaterialsStep.jsx`, `ReviewStep.jsx`, `PublishStep.jsx`, `PublishedBrandView.jsx`, brand controls/tests, `src/studio/api.js`, prototype brand adapters, `server/providers/brandDesignSystemProvider.js` and its tests, Gemini brand-inspection schema/prompts and brand service analysis tests, `scripts/setup-folkeuniversitetet-brand.mjs`, owning seed fixtures, `scripts/test-studio-workflow.mjs`, current docs/specs.

**Interfaces:** Existing brand forms consume v2 draft/readiness and explicit confirmation commands from Task 1. New project controls consume Task 4's pin; preview consumes Task 3's resolved manifest and Task 2's fonts.

- [ ] Add failing interaction tests: AI-suggested guidance remains unconfirmed; empty-but-reviewed lists can be saved; stale revisions preserve local edits; unresolved fonts block automation-ready selection with a reason.
- [ ] Run owning UI tests and confirm the new behavior is absent.
- [ ] Extend `brandInspectMaterials` to propose voice, wording and imagery with field-level evidence (`structured_import`, `visual_inference`, `ai_suggestion`, `manual`). Update real and mock provider response schemas together. Persist suggestions without confirmation and clear evidence of review on replaced sections; test partial materials and injection-like source text. No provider response may make a brand automation-ready by itself.
- [ ] Compose the forms from public Brutalist controls; preserve keyboard/focus, compact responsive behavior and error copy. Extend offline prototype data alongside the API.
- [ ] Restrict hard-coded brands to seed/test fixtures only after tracing every runtime import. Seeds remain idempotent, default to isolated data, and never mark inferred Folkeuniversitetet guidance approved. Keep real Matter assets outside committed fixtures unless redistribution is authorized.
- [ ] Extend the isolated workflow with two brands using one template, version publication after project creation, deterministic render/Figma provenance and the unchanged legacy review-to-delivery path.
- [ ] Run final acceptance below, document exact results and gaps, review and commit `feat: complete brand input pilot workflow`.

**Gate:** A second brand uses the same layout without code changes. Real Folkeuniversitetet sign-off requires the licensed assets and approved guidance; fixture success alone does not satisfy that gate.

## Verification and rollout

For each task, run its focused tests before and after the implementation. Before merging the milestone, run:

```sh
npm ci
npm run design-system:check
npm run test:run -- --maxWorkers=4
npm run test:workflow
npm run build
npm run verify:production
npm run build:figma
npm run verify --workspace brutalist-design-system
```

Use only isolated schemas in `banner_studio_test`; never run test or seed mutations against the demo database. No live AI is required. Browser acceptance covers guidance edit/confirm, upload errors, brand selection, version display, keyboard navigation, narrow viewport, exact typography, two-brand preview and one complete mock-provider delivery.

Deployment order: release compatible readers first, apply additive migrations with receipts, then enable v2 writes/role templates/branded project creation. Additive SQL alone does **not** make old binaries safe: their strict schemas reject v2 and new manifests. Keep activation behind explicit rollout configuration until every serving process reads the new formats. Roll back to a compatible release and disable new writes; never overwrite old snapshots or delete referenced assets to make an older binary start.

Migration acceptance includes fresh and pre-M1 schemas, repeat application, unchanged historical checksums and read/render tests on the rollback release. Preserve receipts for schema version, activated flags and pilot versions. No bulk brand guessing or automatic project upgrades.

After M1 acceptance, write separate executable plans for M2 (four-stage Assets workflow, recipes, quality decision/escalation and transition of both null-brand and M1 branded campaigns), then M3 (deck model, rendering and PPTX). Do not mix those migrations into this milestone.
