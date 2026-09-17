# DS0 Brutalist workspace package — implementation plan

**Status:** In progress · **Date:** 17 September 2026 · **Design:** [Design system integration](../specs/design-system-integration.md#import-from-the-standalone-repository) · **Decisions:** D24, D25, D30, D36 · **Depends on:** M0

## Goal

Move Brutalist's source into this repository as the detachable workspace package `packages/brutalist-design-system`, so gap fixes happen in one pull request (D36).

**Exit check** (the design's *done when*): the application runs, tests and builds, including the Docker image, from the workspace package with no archives in `vendor/`; a package source edit appears in the dev server without a rebuild; a package file importing application code and an application deep import both fail `npm run design-system:check`; the product vocabulary allowlist is reviewed.

## Scope

**In scope:** the seven import steps in the design, and the Brief review work that waits for them.

**Out of scope:** the checkable gap list and the breaking-change gate (DS2), gap fixes (DS3), dependency upgrades inside the package.

## Working rules

- Branch `feat/ds0-brutalist-workspace` from `feat/m0-stabilise` while M0 is in review; rebased onto `v3` when M0 merges. One commit per task.
- Import Brutalist's committed `main` (`50c322c`, the version the application already uses). Uncommitted changes in the standalone checkout stay there (owner decision, 17 September 2026).
- The standalone repository is not changed without the owner's approval: the freeze notice is prepared, not committed.
- Lockfile changes use `npx npm@10` (Docker uses npm 10).

## Tasks

### D1 — Import with history

`git subtree add --prefix=packages/brutalist-design-system` from the standalone repository's `main` at `50c322c`. Build outputs, `observatory/` and the change queue stay excluded by the package's `.gitignore`.

**Verify:** `git log -- packages/brutalist-design-system` shows the package history; the imported tree matches `50c322c`.

### D2 — Workspace and resolution

- Root `package.json`: `"workspaces": ["packages/*"]`; the dependency becomes the workspace package.
- Package manifest: React and React DOM become peer dependencies (with development copies the application's versions satisfy, so one React is installed); `exports` gain a `source` condition pointing at `src/atomic` next to the built library in `dist-atomic-library`.
- `vite.config.js` adds the `source` condition when serving and testing, so package edits need no rebuild; production builds use the built library. The application's tests do not collect package tests.
- `scripts/build.mjs` builds the library before the application.

**Verify:** `npm run test:run`, `npm run build`, and a package source edit showing in the running dev server.

### D3 — Remove the release pipeline

- Application: `vendor/` archives, provenance record and instructions; `scripts/design-system-update.mjs` and its npm script.
- Package: `scripts/changes/`, the `changes` scripts and their place in `verify`, `.github/`, `docs/external-changes.md`, and the Task Observatory instruction (D30).

**Verify:** no references to the removed files remain outside history and archived documents.

### D4 — Boundary checks and CI

Rewrite `scripts/design-system-check.mjs`:

| Check | Fails when |
| --- | --- |
| Workspace link | The installed package is not the workspace package |
| Package isolation | A package file imports a path outside the package or an undeclared module |
| Public entry points | Application code imports anything but `brutalist-design-system` and `brutalist-design-system/styles.css`, or a package path |
| Product vocabulary | Package source uses *Automation Studio*, *campaign*, *banner*, *recipe* or *escalation* outside the reviewed allowlist |
| Exports | Application code imports a name the package source does not export |
| Styling | Application CSS targets package classes or redefines package tokens; application code styles package components with `className` or `style` |

Example text in package tests and documentation that uses product words is changed to neutral words; the generic `Banner` component is allowlisted.

CI: pull requests run `npm run design-system:check` and `npm run build`; package verification runs when package files change.

**Verify:** `node --test scripts/design-system-check.test.mjs` covers each failure, including a package file importing application code and an application deep import.

### D5 — Docker

Install workspace manifests before `npm ci`; keep the runtime image free of the package link.

**Verify:** `docker build` succeeds and the container passes `node scripts/verify-container.mjs`.

### D6 — Documentation

Package `CLAUDE.md` importing `AGENTS.md`; package rules for living in this repository. Application `AGENTS.md`, `FRONTEND.md`, `DESIGN.md`, `README.md`, the architecture page, the design-system pages and gap list rules, known issues, the design page status and the roadmap.

**Verify:** `npm run build:docs` with no dead links.

### D7 — Freeze notice

Prepare the notice for the top of the standalone repository's README, pointing to this repository. Committed and pushed only with the owner's approval.

### D8 — Final verification and pull request

The exit check above, the package `verify`, then one pull request into `v3`.
