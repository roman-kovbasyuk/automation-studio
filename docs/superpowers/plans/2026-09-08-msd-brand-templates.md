# MSD Brand Templates Implementation Plan

**Goal:** Create the MSD system from the supplied logo and inspected reference, then make all three current template layouts consume it.
**Architecture:** Resolve semantic brand roles into immutable template manifests when assigned or when the brand is published. Store the source brand/version and role mapping with each resolved manifest. Preview and PNG export consume that exact manifest; saved historical compositions retain their version.
**Tech stack:** React, Zod, PostgreSQL, Sharp, fontkit.
**Spec:** ../specs/2026-09-08-msd-brand-driven-templates-design.md

## Constraints and decisions
- Keep all existing template versions unchanged. Create new versions for MSD and subsequent brand publications.
- Many templates can reference one system. No template authoring interface in this slice.
- The reference website declares Arial/Helvetica; bundle OFL-licensed Arimo as the metrically compatible rendering family, documenting this substitution in the brand record. Never claim this is an official MSD typography guide.
- Preserve the original supplied transparent logo. Embed only verified PNG bytes into resolved graphics, with a white backing and contained scaling.
- A saved resolved manifest is the fallback if a brand later becomes unavailable. An initial assignment without a usable published brand fails explicitly.
- Admin assignment publishes branding into the existing shared template catalog; it is explicit, never performed by a read request.

## 1. Shared contract and resolver
- [x] Add shared/resolveTemplateBrand.js with resolveTemplateBrand(manifest, version, logoDataUrl): manifest.
- [x] Extend shared/templateManifest.js with optional brand reference/mappings and constrained raster graphics; validate all placements and safe areas.
- [x] Map canvas, text, CTA, and geometry roles without mutating source manifests. Resolve registered font family/weight and primary approved logo.
- [x] Test nonmutation, version identity, palette changes, rejected assets/fonts and all supported placements in shared/resolveTemplateBrand.test.js.

## 2. Preview and export parity
- [x] Bundle Arimo.ttf and OFL.txt in shared/fonts. Register identical family/weights in banner CSS and fontkit.
- [x] Render resolved graphics with contain scaling and white backing in AnimatedBanner and inProcessRenderer.
- [x] Use supplied manifest in TemplateLibrary; show assigned system name and link using existing UI patterns.
- [x] Verify PNG pixels and font provenance, including legacy Inter behavior.

## 3. Persist assignment and brand updates
- [x] Add server/services/templateBrandService.js: assign via admin-only endpoint, and refresh assigned latest versions atomically on brand publication/restore.
- [x] Use the brand repository/storage for approved logo bytes. Serialize assignment and publication on the same brand row lock. Snapshot the resolved data into newly versioned templates.
- [x] Wire hooks in demo and production bootstrap; preserve existing service test injection points.
- [x] Test assignment, unavailable brand, repeated assignment, refresh, and retained old manifests.

## 4. MSD record and verification
- [x] Add a repeatable local setup script using the existing brand service to upload the supplied logo, store sourced colors/typography, publish, grant demo users viewing access, and assign all three templates.
- [x] Run focused resolver/rendering/service/UI tests, production build and diff checks.
- [x] Open the MSD brand reference and Templates screen; verify logo, palette, typography and assignment.
- [x] Update documentation and Observatory with actual verification evidence.

## Verification — 2026-09-08

- Published local MSD version 1; all three layouts assigned as template version 1.2.1. Earlier manifests retained.
- 11 focused contract, resolver, rendering, publication, assignment, route and export files: 125 tests passed. Two focused Studio navigation tests passed.
- PNG generation verified for all seven ratios in each layout, including logo pixels and Arimo provenance. Standalone HTML test verifies embedded logo and TTF.
- Production application/docs build and `git diff --check` passed. Existing docs chunk-size warning remains.
- Live Templates anchor and MSD published reference verified by accessibility tree and screenshot. Correct logo, palette, typography and all three assignment links are visible.
- Broader StudioApp suite: 25 passed, two existing copy-approval tests fail because they expect the obsolete Approve option 1 control. Both failures reproduced with the new navigation-refresh code removed; unrelated controls were not changed.
- Added published-manifest projection for copy previews; visual-only manifest changes do not dirty copy source keys.
