# Product recipes {#product-recipes}

**Asset creation workflows are product recipes.** Each recipe defines how a request becomes a particular product: the required inputs, AI instructions, clarification points, conditions and finished output.

All asset creation recipes belong to this category. Each document type has its own recipe, configured in the shared **product logic designer**.

## Recipes

| Recipe | Outcome | Current status |
| --- | --- | --- |
| [1. Banner creation](/recipes/banner-creation) | A reviewed banner set in the requested sizes | Persisted recipe authoring and simulation; existing campaign generation remains separate |
| [2. Slide deck creation](/recipes/slide-deck-creation) | A presentation with agreed content, structure and output format | Persisted recipe authoring and simulation; live renderer is planned |
| [3. Website creation](/recipes/website-creation) | A responsive website preview and agreed handoff | Persisted recipe authoring and simulation; live renderer is planned |
| [4. Template creation](/recipes/template-creation) | A reusable, versioned layout and input contract | Persisted recipe authoring and simulation; live renderer is planned |

New document types join this list as additional recipes. They share the designer and backend capabilities while keeping their own steps and output contracts.

## Product logic designer {#product-logic-designer}

[Open Product recipes →](http://127.0.0.1:5181/mvp/admin/recipes?demoRole=admin#admin-product-recipes)

This opens the isolated local admin preview. Start it from the application checkout with `node scripts/testing/start-admin-preview.mjs`. Select a persisted recipe to open its own node-editor URL. The preview uses synthetic data and removes its database schema when stopped.

Drag and connect nodes, then click a node to edit settings, AI instructions and clarification rules in its inspector. Save a revision, validate its graph, simulate its saved hash, and publish an immutable version. Simulation uses explicit fixtures for AI and rendering. A publication does not start a live asset run.

Read [Product logic designer](/decisions/asset-workflows) for the shared node contracts and publishing model.

## What belongs in a recipe

- **Inputs:** source material, selected template, application-managed design system and user constraints.
- **Steps:** supported AI or backend operations with defined inputs and outputs.
- **Interactions:** when to ask a question, request a decision or inform the user.
- **Conditions:** explicit rules for choosing the next step.
- **Outcome:** what will be produced and which checks it must pass.

A **recipe** is the reusable process. A **run** is one execution for one request. A **template** supplies reusable design/layout rules; it is an input to a recipe, or the output of the template-creation recipe. Backend specifications may continue to use “workflow” for the same recipe concept.
