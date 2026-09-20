# Glossary

**Status:** Current · **Updated:** 17 September 2026

Use these terms in product documents, specifications and the user interface. The code still uses older names in places; the last table maps them.

## Product terms

| Term | Meaning |
| --- | --- |
| **Automation Studio** | The product. |
| **Brand** | A company's versioned design system for produced content: colors, typography, logos, voice, wording rules, image style and mandatory lines. Also called the *brand system* or *output design system*. |
| **Application design system** | The UI foundation of Automation Studio itself: the installed `brutalist-design-system` package plus application patterns. Governed by [FRONTEND.md](../../FRONTEND.md). Never used to style produced content. |
| **Asset type** | A kind of content the system produces, such as a banner set, a deck or a newsletter. Fixed when a project is created. |
| **Template** | A versioned layout for one asset type. It references brand roles, declares slots with content limits and carries a contract that AI output must satisfy. |
| **Capability** | One operation implemented and tested in code, with fixed inputs and outputs. Examples: analyse materials, write copy, generate image, compose, render, check. |
| **Recipe** | The versioned production spec for one asset type: inputs, questions, steps, checks, escalation rules and outputs. Brand-independent. Stored as files. See [Recipes](recipes.md). |
| **Project** | One piece of work for one asset type, such as *Spring course banners*. It delivers many banners, or one deck, or one newsletter. It pins brand, template and recipe versions and stores answers, drafts, check results, escalations and files. |
| **Asset creation flow** | The four-stage process inside a project: Brief, Copy, Visuals, Assets. |
| **Stage** | One of the four parts of the asset creation flow: Brief, Copy, Visuals, Assets. |
| **Touchpoint** | A point in a recipe where the user confirms, edits or chooses. |
| **Hard check** | An automatic pass/fail rule, such as text fitting its slot or required wording being present. |
| **AI review** | A model's scored assessment of a rendered asset against the brief and brand guidance. |
| **Repair** | An automatic correction tried before escalation, such as shortening copy that overflows. |
| **Escalation** | A design task opened from a project when quality is not acceptable or the user asks for design help. The designer elevates the work and returns it: banners through Figma, decks by editing the PowerPoint file. |
| **Accepted** | The requester has approved an asset for delivery. |
| **Output** | One deliverable asset: a banner (copy × visual × template × format) or a deck (all its slides in one PowerPoint file). Every change creates a new revision. |
| **Package** | The immutable download of accepted outputs with a manifest. |
| **Template set** | Layouts used together, such as the slide layouts of one deck style. |
| **Placeholder** | What a template shows in an image slot until an image is inserted, defined by the template (for example a labelled grey box). |
| **Automation-ready** | A brand version with everything projects need: confirmed colours, fonts, logo, voice, image style, wording rules and formats. |
| **Legacy project** | A campaign created before recipes; it keeps the old six-module behaviour until converted. |

## Status labels in documentation

| Label | Meaning |
| --- | --- |
| **Current** | Describes what the code does today. |
| **Target** | Agreed direction that is not yet built. |
| **Proposal** | A recommendation that has not been accepted. |
| **Historical** | Available in Git history for context only. Never an authority (D40). |

## Old names and where they still appear

| Old name | Use instead | Still appears in |
| --- | --- | --- |
| Banner Studio, Lingu Studio, Lingu Agents | Automation Studio | App title, package name, Dockerfile labels, some code comments |
| Campaign | Project | Database tables, API routes (`/api/v1/campaigns`), URLs (`/mvp/campaign/:id`), source folders (`src/studio/campaign`) |
| Six campaign modules (Brief, Copy, Visuals, Banners, Review, Distribute) | Four stages (Brief, Copy, Visuals, Assets) | Module IDs in `src/studio/campaign/moduleContracts.js` |
| Review, designer approval | Escalation (designer) and acceptance (requester) | Campaign statuses `in_review`, `ready`, `approved` in `shared/workflowRules.js` |
| Product recipes / product logic designer (node editor) | Recipe files | Admin area (`/mvp/admin/recipes`), `asset_workflow*` tables |
| Directions | Visuals | `directions` records and API routes |
