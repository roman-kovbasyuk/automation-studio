# Product logic designer

**Status:** Recipe authoring v1 implemented; live execution remains planned. **Updated:** 10 September 2026.

## The product requirement

**Product recipes** is the shared category for all asset creation workflows. The product logic designer is the node editor used to configure those recipes. “Workflow” remains the technical term in backend specifications.

An administrator should be able to define how the system interprets a request, asks questions and produces a finished asset. The canvas is the main workspace: drag nodes, connect branches, and click a node to edit settings and AI instructions in a side drawer.

Each output family has its own workflow: banners, presentations, websites and reusable template authoring. The selected application-managed design system informs the output. The application's UI components are a separate concern from the brand and template used inside a generated asset.

React Flow provides the editor canvas. PostgreSQL stores drafts and immutable publications. The backend validates graph structure and bindings, evaluates supported conditions in fixture simulations, and rejects stale revision writes.

[Open Product recipes →](http://127.0.0.1:5181/mvp/admin/recipes?demoRole=admin#admin-product-recipes)

Start the isolated preview with `node scripts/testing/start-admin-preview.mjs` from the application checkout, then choose a recipe. Each has its own persisted graph and URL. The preview is disposable; persistent environments use the normal application database. Publication and activation are separate actions, and neither starts live generation in v1.

## Implemented v1 boundary

Nodes support labels, instructions, input bindings, declared output names and positions. Clarification questions support text, numbers, choices and booleans. Conditions support `exists`, `equals` and `notEquals`. The editor can save incomplete drafts, but only valid graphs can be published. AI and rendering steps consume explicit simulation fixtures, not live providers.

The tables below describe the broader target model. Version-pinned design resolution, failure/retry policy, saved human tasks and real output validation belong to later runtime stages. V1 validates declared fields and question types; it does not implement a general schema type system for arbitrary AI output.

## Example: presentation creation

The [Slide deck creation recipe](/recipes/slide-deck-creation) contains the proposed flow, questions and acceptance checks. See [all product recipes](/workflow) for banners, websites and templates.

The planned runtime will validate answers and prerequisites before advancing, and persist clarification purpose, recipient, answer schema and input revision so a user can leave and return. V1 tests question policies through simulation; it does not yet create durable human tasks.

## What a node contains

| Field | Purpose |
| --- | --- |
| Capability and version | Select a supported backend operation |
| Input bindings | Declare which request facts and prior outputs it receives |
| Instructions | Guide interpretation or generation |
| Output contract | Define the shape and checks for a successful result |
| Condition rules | Select a declared branch from structured values |
| Interaction policy | Ask, inform, warn or require a specific decision |
| Failure policy | Bound timeouts, retries and escalation |
| Canvas position | Arrange the editor without changing execution semantics |

Admins compose supported capabilities. Adding a new renderer or tool still requires code. Backend permissions, review gates, allowed tools and mandatory validation remain enforced even if someone removes a visible node.

Conditions use a restricted rule language. Natural-language instructions and AI output do not become arbitrary executable JavaScript or SQL.

## Design-system context

Resolve context from published records in the application:

1. **Brand version:** typography, colors, logos and applicable rules.
2. **Template version:** layouts, slots, content capacity and supported variants.
3. **Output contract:** dimensions, editability, file formats and acceptance criteria.

A copywriting node needs tone and wording constraints; a composition node needs layout and fit rules. Supply relevant context to each capability and enforce its outputs through validators.

A run pins these references along with its workflow version. Stored outputs preserve the historical result; repeating an AI request is not guaranteed to reproduce identical bytes.

## Draft, simulate, publish

The implemented authoring lifecycle is **edit draft → save → validate → simulate → publish → activate**. Publication creates an immutable version. Activating a previous version changes the active pointer and preserves the current draft. The planned runtime will pin that active publication for each new run.

The editor, runtime and readable workflow reference should consume one definition. A seed can initialize that definition, but the worker should not secretly fall back to a hard-coded recipe.

Initial execution is sequential with conditional branches. General parallel joins and graph cycles are deferred. Bounded repair can be contained in a capability and recorded as separate attempts.

## Output means something concrete

| Type | Examples of acceptance checks |
| --- | --- |
| Banner set | Requested sizes/count, required wording, safe areas, actual PNG/ZIP output |
| Presentation | Slide count, readable fit, wording policy, editable deck and previews |
| Website | Pages, responsive behavior, allowed components, working configured interactions |
| Reusable template | Editable slots, constraints, variants and sample-content fit |

A website preview/export and a public deployment are separate outcomes. A template preview is not proof of a deck renderer.

See [Data and task boundaries](/decisions/admin-data) and [Delivery stages](/decisions/delivery).
