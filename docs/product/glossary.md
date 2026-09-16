# Glossary

**Status:** Current · **Updated:** 16 September 2026

Use these terms in product documents, specifications and the user interface. The code still uses older names in places; the last table maps them.

## Product terms

| Term | Meaning |
| --- | --- |
| **Automation Studio** | The product. |
| **Brand** | A company's versioned design system for produced content: colors, typography, logos, voice, wording rules, image style and mandatory lines. Also called the *brand system* or *output design system*. |
| **Application design system** | The UI foundation of Automation Studio itself: the installed `brutalist-design-system` package plus application patterns. Governed by [FRONTEND.md](../../FRONTEND.md). Never used to style produced content. |
| **Asset type** | A kind of content the system produces, such as a banner set or a deck. |
| **Template** | A versioned layout for one asset type. It references brand roles, declares slots with content limits and carries a contract that AI output must satisfy. |
| **Capability** | One operation implemented and tested in code, with fixed inputs and outputs. Examples: analyse materials, write copy, generate image, compose, render, check. |
| **Recipe** | The versioned production spec for one asset type: inputs, questions, steps, checks, escalation rules and outputs. Brand-independent. Stored as files. See [Recipes](recipes.md). |
| **Asset creation flow** | One request carried out for one asset type. It pins brand, template and recipe versions and stores answers, drafts, check results, escalations and files. |
| **Stage** | One of the four parts of every flow: Brief, Copy, Visuals, Assets. |
| **Touchpoint** | A point in a recipe where the user confirms, edits or chooses. |
| **Hard check** | An automatic pass/fail rule, such as text fitting its slot or required wording being present. |
| **AI review** | A model's scored assessment of a rendered asset against the brief and brand guidance. |
| **Repair** | An automatic correction tried before escalation, such as shortening copy that overflows. |
| **Escalation** | A design task opened from a flow when quality is not acceptable or the user asks for design help. The designer elevates the work and returns it. |
| **Accepted** | The requester has approved an asset for delivery. |

## Status labels in documentation

| Label | Meaning |
| --- | --- |
| **Current** | Describes what the code does today. |
| **Target** | Agreed direction that is not yet built. |
| **Proposal** | A recommendation that has not been accepted. |
| **Historical** | Kept for context only. Lives in [the archive](../archive/README.md). Never an authority. |

## Old names and where they still appear

| Old name | Use instead | Still appears in |
| --- | --- | --- |
| Banner Studio, Lingu Studio, Lingu Agents | Automation Studio | App title, package name, Dockerfile labels, some code comments |
| Campaign | Asset creation flow | Database tables, API routes (`/api/v1/campaigns`), URLs (`/mvp/campaign/:id`), source folders (`src/studio/campaign`) |
| Six campaign modules (Brief, Copy, Visuals, Banners, Review, Distribute) | Four stages (Brief, Copy, Visuals, Assets) | Module IDs in `src/studio/campaign/moduleContracts.js` |
| Review, designer approval | Escalation (designer) and acceptance (requester) | Campaign statuses `in_review`, `ready`, `approved` in `shared/workflowRules.js` |
| Product recipes / product logic designer (node editor) | Recipe files | Admin area (`/mvp/admin/recipes`), `asset_workflow*` tables |
| Project | Asset creation flow (for now) | Admin "Projects" view, `projectType` field |
| Directions | Visuals | `directions` records and API routes |
