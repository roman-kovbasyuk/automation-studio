# Recipes

**Status:** Target · **Updated:** 16 September 2026

A recipe is the production spec for one asset type. It tells the system how to turn a brief into a finished asset for any brand: what to ask, what AI produces, which templates to fill, how to check the result and when to call a designer.

A recipe is configuration, not code. It only arranges [capabilities](glossary.md) that engineers have built and tested.

The formal schema, capability catalog and the complete `banner-set` and `deck` recipes are in the [recipes specification](../specs/recipes.md). This page records the agreed model.

## Source of truth

- Recipes are **files in the repository** ([D8](decisions.md)). The files are what runs.
- Diagrams, including FigJam boards, are **generated from the files** using the standard Figma MCP and Figma skills. Boards are for reading and commenting. Changes are made in the files, then the diagram is regenerated.
- Generated boards carry a label: *Generated from `recipes/<id>` version N. Comment here; edit the recipe file.*
- The existing node-graph recipe editor in the admin area is frozen. Its database records are not used by projects.

## What a recipe contains

1. **Identity:** ID, asset type, version, title.
2. **Inputs:** required fields, and questions asked only when a value is missing.
3. **Stages:** Brief, Copy, Visuals and Assets, each with ordered steps. A step uses one capability with settings, an optional skip condition and optional extra guidance.
4. **Touchpoints:** where the user confirms, edits or chooses.
5. **Checks:** hard checks, AI review and repairs.
6. **Escalation rules.**
7. **Outputs:** formats and package.

What a recipe does **not** contain:

- **The brand.** The project supplies it, so one recipe serves every brand.
- **Core prompts and engine behaviour.** Built-in prompts, validation, cost limits, retries and job recovery belong to capabilities in code. Recipe guidance adds to them; it never replaces them.
- **Diagram coordinates.** Layout is computed when a diagram is generated.

## Structure rules

These rules keep recipes machine-checkable and let diagrams be generated from them.

1. **Every element has a stable ID:** stages, steps, conditions, questions, checks, recovery paths and outputs. IDs link the file, the diagram and a running project.
2. **Every element has a kind** from a fixed list, and each kind has one visual form:

   | Kind | Meaning | Diagram form |
   | --- | --- | --- |
   | `action` | The system performs a capability | Blue rounded rectangle |
   | `touchpoint` | The user confirms, edits or chooses | Blue rounded rectangle with a user marker |
   | `condition` | A required check with Yes / No branches | Yellow diamond |
   | `recovery` | What happens when a condition fails | Red card below its source, with "Return to …" |
   | `output` | A saved result | Green rounded rectangle |

3. **Connections are explicit.** `next`, `yes`, `no` and `returnTo` reference IDs. Nothing is inferred from position or naming.
4. **Labels for people are separate from settings for the machine.** Diagrams show `label` and `detail`; the runtime reads `settings`.
5. **Each stage states its contract:** what it hands to the next stage.
6. **Long AI guidance lives in Markdown files** next to the recipe and is referenced by path.
7. **Capability recovery comes from code.** Standard failure handling, such as reconciling an unknown provider result, is declared once per capability. Diagram generation includes it without copying it into every recipe.

## Layout convention for diagrams

Stages read left to right. The main path runs across the top. Recovery cards sit below the step that caused them. Each stage ends with its contract.

## Versions

Git holds recipe history. When a project first uses a recipe version, the checked, normalised recipe is stored under its content hash and the project keeps that hash. Projects in progress keep their version after the file changes.

## Folder layout

```text
recipes/
  banner-set/
    recipe.yaml
    guidance/
      write-copy.md
  deck/
    recipe.yaml
```

## Example (shortened)

Illustrative only. The specification defines the final schema.

```yaml
id: banner-set
assetType: banners
version: 1
title: Banner set

inputs:
  - id: sizes
    type: multiselect
    source: brand.formats
    required: true
  - id: keepSuppliedCopy
    type: boolean
    askWhen: analysis.foundCopy

stages:
  - id: brief
    label: Brief
    contract: Confirmed brief, source references, audience, goal, visual keywords
    nodes:
      - id: B1
        kind: action
        capability: analyseMaterials
        label: Analyse campaign materials
        next: B2
      - id: B2
        kind: condition
        label: Analysis valid for current source?
        when: { check: analysisValid }
        yes: B3
        no: B2r
      - id: B2r
        kind: recovery
        label: Invalid or stale analysis
        detail: Clarify missing facts, then reanalyse
        returnTo: B1
      - id: B3
        kind: touchpoint
        capability: confirmBrief
        label: Review questions and confirm
        next: C1

  - id: copy
    label: Copy
    contract: Selected copy with origin (supplied or generated)
    nodes:
      - id: C1
        kind: action
        capability: writeCopy
        label: Write five copy options
        skipWhen: { input: keepSuppliedCopy, equals: true }
        settings: { variants: 5 }
        guidance: guidance/write-copy.md
        next: C2

  - id: assets
    label: Assets
    contract: Accepted banner files and manifest
    nodes:
      - id: A3
        kind: condition
        label: All hard checks pass?
        when: { checks: [textFits, requiredWording, logoSafeArea, contrast] }
        yes: A4
        no: A3r
      - id: A3r
        kind: recovery
        label: Repair, then escalate
        repair: { textFits: { action: shortenCopy, attempts: 2 } }
        escalateAfterRepair: true
        returnTo: A3
      - id: A4
        kind: output
        label: Accept and download
```

## Quality and escalation

- **Hard checks** are pass/fail: text fits its slot (measured with the real font), required wording is present verbatim, logo and safe areas are respected, contrast is sufficient, requested sizes or slide count exist, and files decode.
- **AI review** scores the rendered asset against the brief and brand guidance. During the pilot it runs in **shadow mode**: the score is recorded and shown, but only hard-check failures and user requests escalate. Pilot data sets the threshold.
- **Repairs** run before escalation.
- **Escalation** opens a design task with its reason and failed checks, and hands the composed asset to Figma through the existing plugin. The designer returns the elevated version; the requester accepts it.

Target states for the Assets stage:

```text
composed → checked → accepted → delivered
              └─ escalated → with designer → returned → accepted
```
