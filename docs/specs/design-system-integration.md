# Design system integration

**Status:** Target · **Accepted:** 17 September 2026 ([D13, D24, D25, D30, D36](../product/decisions.md)) · **Not yet implemented**

How Automation Studio uses, extends and updates the Brutalist design system.

## Summary

- Brutalist is a **standalone product** that Automation Studio consumes. It is not part of the application.
- During the pilot its source lives in this repository as the workspace package `packages/brutalist-design-system`, imported with its history, because one repository makes gap fixes much faster (D36).
- It stays **detachable**: its own manifest, tests, build and documentation; it never imports application code; the application uses only its public exports. Checks enforce all three.
- Automation Studio uses Brutalist components wherever they exist. Needs that any application could have are added to the package; product-specific compositions stay in the application.
- Additive package changes ship in the same pull request as the feature that needs them. Breaking changes need the owner's approval.

## Problems this solves

Found in the review of 16–17 September 2026 ([adoption audit](../design-system/adoption-audit.md)):

1. Every gap fix crosses two repositories: a Brutalist commit, a library build, a packed archive committed to `vendor/` (10 archives so far) and an application update.
2. The change pipeline only runs Codex (`codex exec`) and assumes the Observatory task tool.
3. The pipeline installs releases with an absolute local path and no provenance record, which the application's `design-system:check` rejects and which breaks Docker and CI builds.
4. Pipeline releases stay on the local machine, while the application's updater builds from GitHub.
5. The gap list was reviewed against an older package commit and is not checked automatically; at least one listed gap (color picker) is already available.
6. The application's agent rules forbade extending the design system.

The workspace package removes problems 1–4 and 6. The checkable gap list addresses 5.

## Principles

1. **Use the library first.** If a Brutalist component exists for the need, use it.
2. **Extend the package for generic needs.** Keep domain logic and product compositions in the application.
3. **Boundaries are enforced by tooling,** not by convention or by which agent does the work.
4. **Detachable at any time.** Nothing in the package may depend on living inside this repository.

## Where a need belongs

| Goes into Brutalist | Stays in the application |
| --- | --- |
| Interaction or visual primitives any application could use | Compositions that know about brands, templates, recipes, projects, AI jobs or escalations |
| Missing props, slots or variants on existing components | Screen layouts, page patterns and navigation structure |
| Accessibility fixes in shared components | Product copy and state wording |

Test: *Would a different application need this? Can it be described without product terms?* If both answers are yes, it belongs in Brutalist.

Examples from the current gap list: routed step navigation, autosaving inline text and a free-text tag input belong in Brutalist. The project page, brand preview cards and the escalation panel stay in the application.

## Package layout

```text
automation-studio/
├─ package.json                      workspaces: ["packages/*"]
├─ packages/
│  └─ brutalist-design-system/
│     ├─ package.json                name brutalist-design-system; own scripts and dependencies
│     ├─ AGENTS.md, CLAUDE.md        package rules; CLAUDE.md imports AGENTS.md
│     ├─ src/, scripts/, fixtures/   source, build and verification
│     └─ docs/                       package documentation
└─ src/                              imports only the public entry points
```

- **Package name stays `brutalist-design-system`,** so the application's imports do not change.
- **Public entry points:** `brutalist-design-system` and `brutalist-design-system/styles.css`, the two the application uses today.
- **Resolution:** the application's dev server and tests reflect package source edits without a manual rebuild; production builds and Docker images use the built library (`build:atomic-library`). Conditional exports are the preferred mechanism; DS0 settles it.
- **Versions** follow D25: before 1.0, patch for additive and minor for breaking changes. The version is bumped in the pull request that changes the package.

## Boundary checks

`npm run design-system:check` is rewritten to enforce the boundary. It keeps running before `dev`, `build` and `preview`.

| Check | Fails when |
| --- | --- |
| Package isolation | A package file imports a path outside `packages/brutalist-design-system` or a module that is not a declared dependency |
| Public entry points | Application code imports anything other than the two public entry points, or a package path directly |
| Product vocabulary | Package source adds a product term (Automation Studio, campaign, banner, recipe, escalation) that is not on the reviewed allowlist. Generic words such as template, project and brand are allowed. Today 17 package files mention campaigns or banners, including the export index; DS0 reviews each one and moves product-specific parts to the application |
| Package verification | The package's own `verify` (tests, types, boundary and documentation example checks, consumer build) fails; runs when package files change |
| Breaking changes | The public API report (exports and their prop types) loses or renames an export or changes a required prop, and the change is not recorded as approved in the package changelog |

Pull requests run package verification, `design-system:check` and the application build in CI.

## Workflow for a missing capability

1. **Check** the package's public exports and the [gap list](../design-system/missing-components.md).
2. **Decide** where the need belongs using the table above.
3. **Application-specific:** compose Brutalist components in application-owned containers. Stop here.
4. **Generic:** add or extend the component in the package in the same pull request, with package tests, accessibility coverage and a documentation example. Then use it in the application.
5. **Breaking:** get the owner's approval before merging, record it in the package changelog and bump the minor version.
6. **Deferred:** if the package change cannot be made now, use the unstyled native fallback required by [FRONTEND.md](../../FRONTEND.md) and keep a gap entry.

A gap entry is closed in the change that replaces its fallback, never by a package change alone.

## Gap list

The gap list in `docs/design-system/missing-components.md` becomes machine-checkable. Entries are stored as JSON and rendered into the page (D24). Until that is built, the Markdown table follows these fields.

| Field | Meaning |
| --- | --- |
| ID | Stable identifier, e.g. `G-routed-steps` |
| Pattern | The needed behaviour |
| Used in | Routes or source files using the fallback |
| Fallback | What the application does today |
| Waiting for | The package export, prop or slot that would replace the fallback |
| Change | Pull request or commit that adds it, or `none` |
| Status | `open`, `in progress`, `closed` |

**Checks added to `npm run design-system:check`:**

- Warn when an entry's awaited export or prop exists in the package while the entry is not `closed`.
- Fail when an entry is `closed` but its fallback is still referenced in source.

## Import from the standalone repository

Done once, in its own pull request (roadmap DS0):

1. Import the standalone repository's `main` into `packages/brutalist-design-system` with `git subtree add`, keeping its history. Build outputs, `observatory/` and the change queue stay excluded by its `.gitignore`.
2. Add the workspace, keep the package name and wire the public entry points; the application's imports stay unchanged.
3. Remove the vendored archives and provenance record from `vendor/`, the application updater `scripts/design-system-update.mjs`, the package's change pipeline (`scripts/changes/` and its `changes` scripts) and the package's `.github/` workflows, whose verification moves to the application's CI. History keeps them.
4. Rewrite `scripts/design-system-check.mjs` as the boundary checks above; add the CI workflow.
5. Include `packages/` in the Docker build context and build the library in the image.
6. Add the package `CLAUDE.md`; update `AGENTS.md`, `FRONTEND.md`, `DESIGN.md`, `README.md`, the architecture page and the gap list rules.
7. Freeze the standalone repository: a notice at the top of its README pointing here; no further commits until detachment.

**Done when:** the application runs, tests and builds (including Docker) from the workspace package with no archives in `vendor/`; a package source edit appears in the dev server without a rebuild; a package file importing application code and an application deep import both fail `design-system:check`; the product vocabulary allowlist is reviewed.

## Detaching the package later

When a second product needs Brutalist, or when the owner decides:

1. `git subtree split --prefix=packages/brutalist-design-system` and push the result to the standalone repository's `main`; tag the version.
2. Switch the application's dependency to the tagged release.
3. Restore a cross-repository change process. The protocol v2 design on the standalone repository's `docs/change-protocol-v2` branch is the starting point.

## Rules for agents

Recorded in [AGENTS.md](../../AGENTS.md) and [FRONTEND.md](../../FRONTEND.md) when the import lands. Until then the current rules in those files apply.

- Brutalist code lives only in `packages/brutalist-design-system`. It never imports application code or uses product terms.
- The application imports only the public entry points and never targets private component classes.
- Generic needs are implemented in the package in the same pull request, with tests and a documentation example; run the package `verify`.
- Additive changes need no extra approval. Breaking changes need the owner's approval and a version bump.

## Rollout

| Step | Work | Done when |
| --- | --- | --- |
| DS0 | Import the package (above) | Import done-when criteria pass |
| DS1 | Adoption fixes that need no package change (see [audit](../design-system/adoption-audit.md#adopt-now)) | Listed items use Brutalist components; gap list updated |
| DS2 | Checkable gap list; breaking-change gate | A stale gap entry and a removed export are both caught automatically |
| DS3 | First gap fixes in the package (routed steps first) | Fallbacks replaced and gap entries closed |

DS3 is needed before the project page interface (roadmap milestone M2).

## Decided choices

Settled on 17 September 2026 ([decision log](../product/decisions.md)).

| Question | Decision |
| --- | --- |
| Where Brutalist's source lives during the pilot | In this repository as a detachable workspace package (D36) |
| Gap list storage | JSON file rendered into the documentation page (D24) |
| Version scheme (currently fixed `0.1.0-atomic.0`) | Semantic versions before 1.0: patch for additive, minor for breaking (D25) |
| Agents and Observatory | Agents do not use Observatory (D30) |
| Change queue, pull-mode claims, vendored releases | Not needed while the package lives in this repository (D36 supersedes D14–D16, D26, D27) |
