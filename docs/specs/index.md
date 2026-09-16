# Specifications

**Status:** Current · **Updated:** 17 September 2026

Specifications turn the [PRD](../product/prd.md) into buildable detail. All are drafts for owner review; provisional answers (P1–P9) are listed in the [decision log](../product/decisions.md#provisional-decisions).

| Specification | Covers | Milestone |
| --- | --- | --- |
| [Domain model](domain-model.md) | Records, relationships, states, change propagation, version pinning, permissions | M0–M2 |
| [Recipes](recipes.md) | Recipe file schema, validation, versioning, diagrams, capability catalog, `banner-set` and `deck` recipes | M2, M3 |
| [Brand model](brand-model.md) | Brand guidance fields, readiness, fonts, AI context | M1 |
| [Template model](template-model.md) | Template fields, brand scope, resolution at composition, fit and rendering | M1, M3 |
| [Quality checks and escalation](quality-and-escalation.md) | Check catalog, repair, AI review, acceptance, escalation round trip, packages | M2 |
| [Asset creation flow UX](asset-creation-flow-ux.md) | Screens, states, actions, wording, errors, accessibility | M2 |
| [Deck generation](deck-generation.md) | Outline, slide text, artwork, rendering, PDF | M3 |
| [Migration from campaigns](campaign-migration.md) | Data backfill, legacy flows, dual paths, routes, tests, rollback | M0–M2 |
| [Design system integration](design-system-integration.md) | Using, extending and updating Brutalist | Design-system track |

## Traceability

| Requirement group | Specifications |
| --- | --- |
| FLOW | Domain model, UX, Migration |
| BRIEF, COPY, VIS | Recipes, UX, Deck generation, Brand model |
| ASSET, ESC | Quality and escalation, Template model, UX |
| BRAND, TPL | Brand model, Template model |
| RCP | Recipes, Migration |
| NFR | All; Design system integration for NFR-6 |

## Diagrams

Mermaid diagrams are embedded in each specification. FigJam boards for the two recipes are generated from the recipe definitions with the Figma MCP diagram tool once the Figma connector is authorised ([recipes](recipes.md#diagrams)).
