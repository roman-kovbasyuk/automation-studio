# Semantic Documentation Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace opaque numbered documentation entry filenames with semantic routes while preserving the existing numbered URLs as compatibility redirects.

**Architecture:** Canonical multi-page Vite entry shells will be named `basics.html`, `components.html`, `ui-blocks.html`, and `getting-started.html`. Existing `page-20.html` through `page-23.html` files remain as tiny redirects so old links continue to work; all application links, tests, and current documentation will use canonical names.

**Tech Stack:** Vite, React, TypeScript, Vitest, static HTML redirects.

**Spec:** User request to rename the documentation entry files to clear semantic names without losing navigation compatibility.

## Global Constraints

- Preserve the Basics → Components → UI blocks → Screens/catalog dependency direction.
- Keep direct deep links with query parameters and hash fragments working.
- Preserve `/atomic.html` legacy routing behavior.
- Verify with the atomic test suite, typecheck, production build, and whitespace checks before committing.

### Task 1: Rename canonical HTML entry shells

**Files:**
- Rename: `page-20.html` → `basics.html`
- Rename: `page-21.html` → `components.html`
- Rename: `page-22.html` → `ui-blocks.html`
- Rename: `page-23.html` → `getting-started.html`
- Modify: `vite.atomic.config.ts`

- [ ] Update Vite inputs to use semantic shells and include numbered compatibility shells.
- [ ] Verify each canonical shell still mounts its existing screen entrypoint.

### Task 2: Preserve numbered URLs

**Files:**
- Modify: `page-20.html`, `page-21.html`, `page-22.html`, `page-23.html`
- Modify: `atomic.html`

- [ ] Replace numbered shells with redirects that retain query strings and hash fragments.
- [ ] Update the legacy `atomic.html` redirect targets to canonical routes.

### Task 3: Update canonical links and documentation

**Files:**
- Modify: `src/atomic/screens/docs/*.tsx`
- Modify: `src/atomic/screens/docs/*.test.tsx`
- Modify: `docs/README.md`, `docs/migration.md`, current review/spec references, and `docsNavigation.ts`.

- [ ] Change current navigation and test URLs to semantic routes.
- [ ] Document numbered paths as compatibility aliases where historical context requires them.

### Task 4: Verify and commit

- [ ] Run `npm run test:atomic`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build:atomic`.
- [ ] Run `git diff --check` and inspect the full diff.
- [ ] Commit with `refactor: rename documentation entry routes`.
