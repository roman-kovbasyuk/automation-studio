# Automation Studio documentation

Automation Studio produces on-brand content automatically. A company's **brand** is the foundation; **templates** are built on it; **recipes** turn a brief into finished assets; **designers** are brought in when automatic quality is not good enough.

Start with the [product concept](product/concept.md).

## Product

| Page | What it answers |
| --- | --- |
| [Concept](product/concept.md) | What the product is, projects, the asset creation flow and its principles |
| [PRD](product/prd.md) | Requirements for the proof of concept: goals, journeys, functional and non-functional requirements, measures, risks |
| [Glossary](product/glossary.md) | Terms to use, status labels, and old names still in the code |
| [Decisions](product/decisions.md) | What has been decided, when, and what it replaced |
| [Recipes](product/recipes.md) | What a recipe is and how recipe files are structured |
| [Roadmap](product/roadmap.md) | Phases, proof-of-concept scope, milestones, measures and open questions |

## Specifications

| Page | What it answers |
| --- | --- |
| [All specifications](specs/index.md) | Index and traceability to the PRD |
| [Domain model](specs/domain-model.md) | Projects, records, states, change propagation, version pinning |
| [Recipes](specs/recipes.md) | Recipe schema, capability catalog, `banner-set` and `deck` recipes |
| [Brand model](specs/brand-model.md) | Brand guidance, readiness, AI context |
| [Template model](specs/template-model.md) | Templates, brand scope, resolution and fit |
| [Quality checks and escalation](specs/quality-and-escalation.md) | Checks, repair, AI review, acceptance, escalation, packages |
| [Asset creation flow UX](specs/asset-creation-flow-ux.md) | Screens, states, actions and wording |
| [Deck generation](specs/deck-generation.md) | Slide templates, outline, slide text, placeholders, PPTX |
| [Migration from campaigns](specs/campaign-migration.md) | From the current campaigns to recipe-driven projects |
| [Design system integration](specs/design-system-integration.md) | How the app uses, extends and updates Brutalist |

## Engineering

| Page | What it answers |
| --- | --- |
| [Architecture](engineering/architecture.md) | How the code is organised today and how it maps to the target model |
| [Local development](engineering/local-development.md) | How to run, test and build, and what to be careful with |
| [AI generation](engineering/ai-generation.md) | Which AI operations exist, their safeguards and job statuses |
| [Known issues](engineering/known-issues.md) | Defects, product-model gaps and technical debt |
| [Campaign modules](engineering/campaign-modules.md) | The current six-module banner flow |
| [Briefing](engineering/briefing.md) | How uploaded materials are analysed today |
| [Banner templates and brands](engineering/templates/banner-templates-and-brands.md) | Brand resolution for banner templates |
| [MSD slide templates](engineering/templates/msd-presentation-templates.md) | Slide layouts and AI content contracts for decks |
| [Admin area](engineering/admin.md) | Admin views and the frozen recipe editor |
| [Admin and data model](engineering/proposals/admin-and-data-model.md) | Proposal for projects, runs, tasks and workers |

## Application design system

| Page | What it answers |
| --- | --- |
| [Front-end contract](../FRONTEND.md) | Rules for every application page, component and flow |
| [Visual guide](../DESIGN.md) | How to apply the Brutalist UI foundation |
| [Design-system docs](design-system/index.md) | Consumer boundary, gap list, adoption audit, design briefs |

## Operations

| Page | What it answers |
| --- | --- |
| [Hosting options](operations/hosting.md) | Open comparison of hosting approaches |
| [Infrastructure](operations/infrastructure.md) | Proposed Terraform and CLI setup |

## About these docs

- [How documentation is maintained](documentation.md)
- [Preparation review](engineering/phase-preparation-review.md) and [next implementation plan](plans/2026-09-20-m1-brand-input.md); superseded documents are available in Git history
