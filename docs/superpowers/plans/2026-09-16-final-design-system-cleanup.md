# Final Design System Cleanup Implementation Plan

> **For agentic workers:** Implement this plan task by task with reviewable checkpoints.

**Goal:** Consolidate the current atomic design system and latest external-change protocol, retire the duplicate catalog, publish coherent documentation, and verify the package in an independent consumer.

**Architecture:** Keep `src/atomic/screens/docs` as the only documentation UI and move the component registry to a UI-independent module. Preserve the local CLI/worker protocol from `main`, while narrowing its agent scope to the actual consumer and canonical usage guide. Keep compatibility routes as redirects without retaining the old catalog implementation.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Node.js 22+, npm package tarballs, local Git worktrees, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-16-final-design-system-cleanup-design.md`

## Global Constraints

- Preserve the public exports, existing component API, and Atomic Design direction: Basics → Components → UI Blocks → Screens.
- Never delete current uncommitted work before recording a recoverable checkpoint.
- Do not use `--force`, `--legacy-peer-deps`, or source-workspace symlinks as a consumer verification substitute.
- Keep local Observatory data, `.design-system-changes`, and machine-local settings out of product commits.
- Treat the external protocol as one trusted local npm application with automatic approval and no production deployment.

---

### Task 1: Preserve the documentation worktree and integrate the protocol baseline

**Files:**
- Create: `docs/superpowers/plans/2026-09-16-final-design-system-cleanup.md`
- Modify: none before checkpoint
- Test: current `npm run test:atomic`, `npm run typecheck`, `npm run check:atomic-boundaries`

- [ ] Record the current `codex/docs-basics` status and save the new files and dirty edits in a checkpoint commit once Git escalation is available.
- [ ] Merge the committed `main` history into this isolated worktree and resolve conflicts in package metadata, README, scripts and shared docs by keeping the latest protocol implementation plus the current docs/components work.
- [ ] Re-run the three baseline checks and record any pre-existing warning separately.

### Task 2: Make the registry independent and retire catalog implementation

**Files:**
- Create: `src/atomic/componentManifest.js`
- Modify: `scripts/atomic/verify-consumer.mjs`, `src/atomic/screens/docs/component-docs.test.tsx`, `src/atomic/components/panel.test.tsx`, `src/atomic/screens/docs/docsNavigation.ts`, `vite.atomic.config.ts`, `scripts/atomic/boundaries.mjs`, `README.md`
- Remove: old catalog React screens, catalog-only styles, copy-mode utilities, and tests after import audit
- Test: registry parity, docs routes, boundary check, atomic test suite

- [ ] Move the metadata registry and update every importer to the new UI-independent path.
- [ ] Add parity checks that compare registry names with public component exports and documented destinations without hardcoding a permanent count.
- [ ] Replace the old catalog integration test with a current documentation behavior test while retaining component unit coverage.
- [ ] Replace `/atomic.html` with a small compatibility redirect for known legacy anchors and a Getting Started fallback.
- [ ] Remove catalog-only files only after `rg` confirms no imports, Vite inputs, docs links, or package references remain.

### Task 3: Finish documentation entry points, guidance, and permanent references

**Files:**
- Create: `docs/README.md`, `docs/getting-started.md`, `docs/architecture.md`, `docs/guides/component-usage.md`, `docs/external-changes.md`, `docs/verification.md`, `docs/migration.md`, `docs/known-limitations.md`
- Modify: `src/atomic/screens/docs/DocsIndex.tsx`, `BasicsDocs.tsx`, `ComponentDocs.tsx`, `UIBlockDocs.tsx`, `usageGuidance.ts`, `README.md`, `AGENTS.md`, `DESIGN.md`, `PRODUCT.md`
- Remove: dated guidance filename and stale documentation claims after useful decisions are copied into permanent docs
- Test: docs route/render tests and source example verification

- [ ] Move usage guidance to the stable path and preserve the raw-import parser contract.
- [ ] Add visible root links to Basics, Components, and UI Blocks; keep the existing page-20/21/22/23 URLs.
- [ ] Ensure every page's preview and copyable source describe the same supported variant; label fragments that are not standalone modules.
- [ ] Document current limitations honestly, including CommandMenu, DigitInput, Avatar fallback, TabMenuVertical, ProgressRing, Toast/Notification and application-owned table behavior.
- [ ] Remove links to `.worktrees` and the obsolete catalog from repository guidance.

### Task 4: Expand consumer and documentation verification

**Files:**
- Modify: `fixtures/atomic-consumer/src/App.tsx`, `fixtures/atomic-consumer/verify.mjs`, `scripts/atomic/verify-docs-examples.mjs`, `package.json`, `.github/workflows/verify.yml`
- Test: fresh tarball consumer, docs examples, client build, SSR build, typecheck

- [ ] Add the 20 currently absent public components to the independent consumer without changing their APIs.
- [ ] Make the consumer verification derive expected names from the UI-independent registry and assert all exports are rendered or imported.
- [ ] Extend docs example verification from Basics to copyable Components and UI Blocks using the built public package.
- [ ] Add the example verifier and `test:changes` to the umbrella verification command without creating worker recursion.
- [ ] Run the consumer with isolated npm cache and dependencies; reject symlink-only or network-skipped validation.

### Task 5: Align external change protocol scope and regression tests

**Files:**
- Modify: `scripts/changes/worker.mjs`, `scripts/changes/agent.mjs`, relevant `scripts/changes/*.test.mjs`, `docs/external-changes.md`
- Test: all protocol tests and synthetic end-to-end worker/adoption flow

- [ ] Preserve the latest `main` recovery, release, lock and rollback behavior during merge.
- [ ] Allow only `src/atomic/**`, exact atomic tests, `fixtures/atomic-consumer/**`, and the canonical usage guide where a component change needs it; continue rejecting dependencies, release tooling, arbitrary docs, and app files.
- [ ] Add allowed-path and forbidden-path tests, including `fixtures/atomic-consumer` and the stable guidance path.
- [ ] Verify idempotent requests, conflicts, `working`/`ready`/`failed`, immutable package paths, app adoption, rollback and concurrent dependency-file protection.

### Task 6: Clean stale documents and verify the integrated branch

**Files:**
- Modify/remove only the files identified by the stale-link and import audit
- Test: full verification and clean-tree audit

- [ ] Fold useful decisions from dated plans/reviews into the permanent documents, then remove only superseded current-tree copies.
- [ ] Run `rg` audits for old catalog paths, `.worktrees` links, private source imports, stale route promises, and old component counts.
- [ ] Run the complete verification matrix: boundary tests, atomic tests, typecheck, docs examples, build, library build, fresh consumer, and change protocol tests.
- [ ] Review the final diff and commit in small checkpoints. Report commit IDs and any runtime limitation separately.
