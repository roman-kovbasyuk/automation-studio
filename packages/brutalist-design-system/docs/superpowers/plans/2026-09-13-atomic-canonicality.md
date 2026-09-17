# Atomic canonicality checkpoint

Approved scope: make the existing ten-component rewrite independently consumable and enforce the rules behind the catalog. No new components, app-shell work, legacy migration, publishing, or commits.

## Implementation

1. Add a source-wide dependency verifier under `scripts/atomic/`. Parse TypeScript import/export/dynamic-import statements with Vite's parser (the installed TypeScript 7 package no longer exposes the older compiler API); resolve local modules and CSS, reject unknown application paths and nonliteral dynamic imports. Only React/React DOM/Lucide are external production dependencies. Atoms import Atoms; Components import Atoms/Components; UI blocks import only Atoms/Components and their local CSS; Screens and catalog consume lower layers. Test forbidden imports in unreachable files, same-layer UI blocks, aliases, dynamic imports and allowed composition using disposable synthetic trees.
2. Introduce one catalog component manifest with export name, title and anchor. Navigation consumes it. A rendered catalog test compares its names against actual public Component exports and verifies every anchor and heading. Keep the component examples unchanged.
3. Add `src/atomic/index.ts`, separate library Vite/declaration configs and a build script producing `dist-atomic-library`. Publishable artifact contains compiled JS, declarations and public `styles.css`, with React/React DOM peers and Lucide dependency. Root library entry exports Atoms and Components, never catalog code. Existing legacy build is untouched.
4. Add a static fixture with all ten components importing only `brutalist-design-system` and `brutalist-design-system/styles.css`. Verification packs the artifact, installs it in a new temporary project with independent dependencies, typechecks, builds browser and SSR entries, and checks the real rendered artifact. Keep the fixture only when explicitly running with `--keep` for browser inspection; default cleanup targets the exact generated temporary directory.
5. Add one aggregate command and isolated CI job. Run dependency tests, atomic tests, source checks, library build and packed consumer checks. Inspect representative live interactions and computed styles in the installed consumer against the catalog. Report limitations honestly (native selects and system fonts remain platform-dependent).

## Success criteria

- Forbidden layer imports fail even when not reachable from the catalog.
- Public Component export additions/removals without catalog coverage fail tests.
- A consumer has no repository source aliases and successfully resolves all ten components and stylesheet from the installed tarball.
- Types, production build and SSR consumer rendering pass; representative browser behavior and styling agree with the catalog.
- No release or legacy replacement is performed.

## Verification outcome

Implemented all five steps. Six boundary tests and twenty atomic tests passed, with successful typecheck, catalog/library builds and a fresh tarball-installed consumer build/SSR render covering all ten components. Desktop browser style comparisons and representative interactions passed with no warning/error logs. The consumer tab did not honor the attempted mobile viewport override; no new mobile consumer claim is made. Remote CI and automated visual regression remain unverified/not implemented respectively. No publication, commit, push or legacy replacement.
