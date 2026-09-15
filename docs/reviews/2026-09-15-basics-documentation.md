# Basics documentation review

## Review checkpoint

Branch: `codex/docs-basics` (base `c79b01fbd83ca3d2b8cf6604b88d48e9149773d3`).

Preview: http://127.0.0.1:5212/page-20.html?basic=color

The eight Basics pages are ready for user review: Color, Typography, Spacing, Shape & sizing, Elevation, Motion, Icons and Layout. Component and UI block documentation follows only after approval of this template. Their current sidebar links open the existing catalog.

## Implementation

- Uses the existing atomic library for controls, layout and tokens. All documentation examples, setup blocks, guidance and reference tables use the shared Panel.
- Adds optional compact density and header actions to Panel, preserving its defaults. Exports the reusable CodeExample UI block, composed from Panel, Tabs, Button, ScrollArea and typography atoms.
- Shows the actual rendered example source, changing only imports to public package paths and adding the public stylesheet import. Eight modules provide sixteen example exports.
- Provides grouped navigation, page search, preview/code views, clipboard feedback, npm/pnpm/yarn commands, example links and references. Uses the existing Drawer and Menu on smaller screens.
- Credits AlignUI for the documentation structure. No AlignUI implementation source or branding was copied.
- Keeps the experiment in an isolated worktree. Main-checkout changes from other work were preserved; no dependencies changed and nothing was published.

## Verified

| Check | Result |
|---|---|
| Atomic component, block and docs tests | 87 passed across 15 files |
| Boundary/build-script tests | 11 passed |
| Atomic source boundaries | Passed |
| TypeScript | Passed |
| Production catalog and documentation build | Passed |
| Public library build | Passed |
| Fresh tarball consumer | Dependency install, typecheck, client build and SSR passed; 46 component exports and 3 UI blocks verified |
| Displayed source verifier | All 8 source modules / 16 example exports typechecked and built using public package imports |
| Diff whitespace check | Passed |

Browser checks covered desktop, 1024px tablet, and 320–390px mobile; no document overflow was observed. Verified search, page navigation, direct section reload, Preview/Code, Copy, package-manager changes, icon search, motion playback, Drawer closing, contents Menu and an existing catalog destination. Reviewed shared reduced-motion styles.

A separate reviewer checked component reuse, API accuracy, source fidelity and navigation. The only material finding was stale copy feedback after changing a source. It was fixed with source-change invalidation and a regression test covering pending clipboard completion; the reviewer confirmed no remaining findings.

## Existing limitations

- The separate Task Observatory harness had 29 passes and 2 native Node v25 assertion crashes in `board.test.mjs` and `tasks.test.mjs`, matching the earlier baseline. No Observatory code changed.
- Vite reports a large shared chunk containing the existing full icon registry. Builds succeed; bundle optimization is outside this Basics review phase.
- The package uses the verified local tarball workflow. It has not been published to a package registry.

## Resume

From this worktree, run `npm run dev -- --host 127.0.0.1 --port 5212 --strictPort` if the preview server has stopped. Run `node scripts/atomic/verify-docs-examples.mjs` after building the public library to recheck the displayed source.

Use the implementation plan at `docs/superpowers/plans/2026-09-15-basics-documentation.md` for the subsequent rollout after Basics approval.
