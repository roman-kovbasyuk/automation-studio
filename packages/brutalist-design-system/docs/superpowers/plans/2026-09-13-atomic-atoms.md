# Atomic rewrite — Atoms first version

Approved direction: preserve the existing UI, rebuild independently, no delegated work.

## Architecture

New source: `src/atomic/atoms`. It may depend on React and Lucide, never on the old library, Components, UI blocks, or Screens. Old source remains a reference until each later layer is replaced. The isolated `/atomic.html` catalog loads only new Atoms styling. A separate production build exercises that same entry.

One typed token definition supplies both root CSS variables and catalog values. No copied scale in catalog CSS. Light theme only. Keep Avenir-family system stack (no distributable font files exist), cyan action, black 1px rules, 32px large corners, hard elevation, existing type and spacing scale. H4 is 20/24 at500; H5–H7 at600. Body400 follows current token source, not old screenshot metadata.

Public first-version primitives: AtomsRoot, Heading (semantic level independent of visual role), Text, Icon (named or decorative), Stack, Inline, Grid, Container, Surface, Divider, ScrollArea. Surface is purely structural; a titled interactive Panel belongs in Components later. Layout props use the spacing scale, no arbitrary control variants. Motion and elevation tokens belong to Atoms; control behavior will belong to Components.

## Implementation / acceptance

1. Isolated branch/worktree; baseline typecheck and test suite before new code.
2. Tests first: heading semantics, icon names/decorative behavior, layout token mapping, scroll region accessibility, no upward/legacy imports, all Atoms sections present.
3. Implement the token source and primitives, then the read-only catalog composed from them. Include real examples for all eight Atoms categories, native anchor navigation and a hover/focus motion specimen with reduced-motion support.
4. Focused tests, typecheck, isolated production build, desktop/mobile browser inspection if available. One batched correction pass. No assertion of identical font rendering across platforms without bundled font assets.

No legacy export removal, dependency installation, commit, push, or publication in this pass. First version is not the completed system rewrite. No further work on the old cleanup plan.
