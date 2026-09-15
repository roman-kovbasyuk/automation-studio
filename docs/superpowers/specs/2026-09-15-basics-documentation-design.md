# Basics documentation — approved scope

The user approved the documentation sketch and authorized a new branch and development, starting with Basics. This scope supersedes the Button-only prototype. Basics must be reviewed before proceeding to the other layers.

## First delivery

Eight navigable pages at `/page-20.html?basic=color`: Color, Typography, Spacing, Shape & sizing, Elevation, Motion, Icons, and Layout. Preserve `/` and `/atomic.html` as the complete catalog. Document every currently exported Basics primitive and token family across these pages. Use the actual public package API and token values.

Use the approved three-column documentation arrangement: grouped left navigation, a readable article, and a right section index. Repeat the same article structure: heading and short description; overview preview; installation; examples; reference; linked AlignUI credit. Examples have Preview/Code selection, filenames, and copy with truthful feedback. Use our existing Panel with its split variant to wrap examples and installation. Use our Tabs, Button, SearchField, NavigationList, Drawer, Table, Typography, and layout atoms. Do not invent a page-specific panel, tab, button, search field, or table.

Sidebar categories follow the reference's functional grouping: Actions, Displaying Data, Feedback, Form, Layout, Navigation, and Overlays. Populate them from components we actually own. Until their documentation phase is approved, their links go to the existing catalog and are identified as catalog destinations. Omit commercial products and reference-only exports that our system does not offer. Link to AlignUI as inspiration, without copying their source, text, assets, or branding.

## Implementation constraints

- Branch: `codex/docs-basics`; isolated worktree `.worktrees/docs-basics`.
- Preserve unrelated edits in the main checkout.
- Basics → Components → UI blocks → Screens/catalog dependency direction remains enforced.
- Reuse all existing tokens, control behavior, Panel interaction, and typography. Product CSS composes and sizes only.
- A reusable CodeExample UI block may assemble Panel, Tabs and Button; it must not depend on another block.
- Panel now exposes optional header actions and compact density for this composition. Existing defaults and interaction rules remain canonical.
- Examples must be real rendered TSX; show those same files as copyable source with public package imports and the public stylesheet.
- Installation describes the existing local tarball workflow. The private library is not advertised as an npm registry release.
- No new production dependencies.
- Keep article scrolling normal; sidebar and index are sticky. Collapse the index below 1200px; use a shared Drawer below the existing 800px breakpoint. Required contents links remain available on mobile.
- Below 1200px, the shared Menu labeled On this page contains the section index. Mobile quick search opens the shared Drawer with matching destinations.
- Search filters navigation with trimmed, case-insensitive queries, supports Escape to clear, and reports no matches.
- Deep links, reload and browser history must select the correct Basics page. Unsupported page values recover to Color.
- Code scrolls within its container; layouts fit 320px. Respect reduced motion and label icon-only actions.
- Complete and verify Basics, leave branch unmerged, and return a running preview for review before expanding the rollout.

## Later phases

After Basics approval: document all existing Components using the same page template and category data, then UI blocks. Each phase documents the existing API, examples, interaction states, dependencies, composition and accessibility. Adding new component capabilities is a separate scope decision.
