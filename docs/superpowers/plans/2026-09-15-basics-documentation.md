# Basics Documentation Implementation Plan

> **For agentic workers:** Execute the following tasks in order with verification between tasks. The user explicitly authorized development in this conversation; execute inline and return Basics for review before other layers.

**Goal:** Deliver eight usable Basics documentation pages using the approved documentation layout and the existing design-system Panel and controls.

**Architecture:** A separate Vite entry renders a data-driven documentation screen. A reusable CodeExample UI block composes Panel, Tabs, Button and ScrollArea. Real TSX examples provide both rendered previews and copyable source; token reference tables derive from canonical tokens.

**Tech Stack:** Existing React, TypeScript, Vite, Radix, Lucide, Vitest and Testing Library. No new production dependencies.

**Spec:** `docs/superpowers/specs/2026-09-15-basics-documentation-design.md`

## Global constraints

- Implement on `codex/docs-basics` in `.worktrees/docs-basics`; preserve main checkout edits.
- Use existing Panel, split variant, for example and installation wrappers. Preserve canonical control styles and behavior.
- Enforce Basics → Components → UI blocks → Screens/catalog; blocks never compose other blocks.
- Reuse canonical tokens and type roles. Product CSS only composes or sizes shared components.
- Show original explanations and our actual library API. Copy no AlignUI source, prose, logo, assets or branding.
- Link the footer credit `Documentation structure inspired by AlignUI.`
- Document local tarball installation and public package imports; do not claim registry publication.
- 1200px index collapse; existing 800px mobile breakpoint; verify down to 320px.
- Preserve existing catalog entries; no dependency additions, merge or deployment.
- Deliver Basics only. User review is the checkpoint before Components and UI blocks.

## File map

| File | Responsibility |
|---|---|
| `page-20.html`, `src/atomic/screens/docs/main.tsx` | Independent experimental entry point |
| `vite.atomic.config.ts` | Include page in production build |
| `src/atomic/ui-blocks/CodeExample.tsx`, `code-example.css` | Shared Panel + Preview/Code + filename + copy composition |
| `src/atomic/ui-blocks/code-example.test.tsx` | Copy correctness/failure and preview switching |
| `src/atomic/screens/docs/BasicsDocs.tsx` | Page selection, navigation, article, mobile Drawer, section index |
| `src/atomic/screens/docs/basicsContent.tsx` | Eight-page manifest, explanations, token tables and example mapping |
| `src/atomic/screens/docs/docsNavigation.ts` | Real component grouping and catalog links |
| `src/atomic/screens/docs/examples/*.tsx` | Renderable, copyable examples for all eight Basics areas |
| `src/atomic/screens/docs/docs.css` | Responsive composition and reading widths |
| `src/atomic/screens/docs/basics-docs.test.tsx` | Routing/search/direct links and complete page coverage |
| `src/atomic/index.ts`, `src/atomic/catalog/UIBlocksCatalog.tsx` | Expose and demonstrate CodeExample as a shared UI block |
| `fixtures/atomic-consumer/src/App.tsx`, `fixtures/atomic-consumer/verify.mjs` | Verify CodeExample through public package imports |
| `scripts/atomic/verify-docs-examples.mjs` | Typecheck and build the exact displayed examples against built library exports |

## Task 1 — Isolated baseline and shared example block

**Consumes:** `Panel({title, description, variant:'split', filters, children})`; `Tabs({label,items,value,onChange})`; `Button`, `ScrollArea`, `Text`, `Inline`.

**Produces:** `CodeExample({title, description?, filename, source, preview?, controls?, headingLevel?})` exported from the public library.

- [x] Create ignored `.worktrees/docs-basics` on new branch `codex/docs-basics` from main HEAD. Use installed dependencies without altering the main checkout.
- [x] Run baseline `npm run test:atomic -- --reporter=dot`. Baseline: 77 tests passed; existing Toggle uncontrolled/controlled warning.
- [x] Write tests that catch a broken view change, wrong copied text, and false success on denied clipboard access:

```tsx
render(<CodeExample title="Usage" filename="example.tsx" source="const answer = 42" preview={<Text>Live preview</Text>} />)
await user.click(screen.getByRole('tab', { name: 'Code' }))
expect(screen.getByText('const answer = 42')).toBeVisible()
await user.click(screen.getByRole('button', { name: 'Copy Usage code' }))
expect(await navigator.clipboard.readText()).toBe('const answer = 42')
```

- [x] Run `npm exec -- vitest run src/atomic/ui-blocks/code-example.test.tsx`; confirm missing block failure.
- [x] Implement CodeExample by composing the shared Panel. Render Tabs with real content when a preview exists; use code directly otherwise. Add optional actions and compact density to the canonical Panel; preserve defaults. Keep Copy in Panel actions, show filename above source, and use ScrollArea with a named region and selectable preformatted text. Clipboard rejection produces a visible instruction to select and copy; never report success on failure. No custom tabs, buttons, or panels.
- [x] Export the block, add its catalog example and consumer fixture. Re-run focused tests and typecheck.

## Task 2 — Eight Basics examples and accurate source

**Consumes:** `tokens`, `typography`, `AtomsRoot`, `Heading`, `Text`, `Icon`, `Stack`, `Inline`, `Grid`, `Container`, `Surface`, `Divider`, `ScrollArea`; existing controls where demonstrating action semantics or motion.

**Produces:** `basicsPages` entries with `{id,title,description,sourceFile,preview,examples,reference,notes}`. Example files export a default overview plus named secondary examples.

| Page | Required preview/examples | Reference |
|---|---|---|
| Color | Complete palette, semantic colors with text and icons | `tokens.color` |
| Typography | Every visual role; semantic heading vs visual size | `typography`, Heading/Text props, font family |
| Spacing | All scale values; Stack/Inline gaps | `tokens.space`, gap prop |
| Shape & sizing | Every radius; control heights and focus | radius, border, size, focus, state |
| Elevation | All shadows and stacking layer values | shadow, layer, Surface elevation |
| Motion | Toggle playback; shared hover feedback | all motion tokens; reduced-motion behavior |
| Icons | Searchable icon names, size variants, meaningful vs decorative labels | icon sizes, Icon props, current icon count |
| Layout | Stack, Inline, Grid, Container, Surface, Divider, ScrollArea | exact layout props/defaults |

- [x] Add real TSX examples under `screens/docs/examples/`. Use relative imports to owning lower layers; no page-only stylesheet dependencies in copied samples.
- [x] Read the same files as source with Vite `import.meta.glob('./examples/*.tsx', {query:'?raw', import:'default', eager:true})`. Transform only import paths into the public package name and prepend the public stylesheet import. Preserve function bodies verbatim.

```ts
export const sourceFiles = import.meta.glob('./examples/*.tsx', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>
```

- [x] Derive token rows from canonical objects rather than duplicated values. Keep textual prop notes faithful to the inspected source signatures.
- [x] Verify that all eight pages render reference tables and source and that their examples include their relevant public primitives.

## Task 3 — Documentation shell, navigation and installation

**Consumes:** CodeExample, basicsPages, canonical components and catalog destination IDs (verified against the rendered catalog).

**Produces:** `BasicsDocs()` at `/page-20.html?basic=color`; query selects Basics page; hash selects article section.

- [x] Write route/search tests first: direct `?basic=typography#reference` displays Typography, unknown values recover to Color, search matches mixed case/whitespace and Escape clears it, and navigation updates page identity and current marker.

```tsx
window.history.replaceState({}, '', '/page-20.html?basic=typography#reference')
render(<BasicsDocs />)
expect(screen.getByRole('heading', { name:'Typography', level:1 })).toBeVisible()
```

- [x] Implement data-driven page navigation with normal hrefs and local same-page state updates; preserve modified clicks and browser history. Focus the article heading after page navigation, and scroll to a known section after direct loading.
- [x] Group all current component exports under the agreed categories. Link future documentation entries to real existing catalog anchors, with a clear catalog label. Do not create unsupported component names or fake destinations.
- [x] Compose desktop navigation with NavigationList and SearchField. At mobile width use the existing Drawer with the same navigation data. Escape closes the drawer through its existing behavior; selecting a page closes it.
- [x] Article order: Basics category, title, description; overview CodeExample; Installation; Examples; Reference; credit. Right index includes example children. Provide the index in the shared Menu above the article below 1200px so no navigation becomes unavailable.
- [x] Wrap both setup steps in shared Panel/CodeExample. Commands:

```sh
npm run build:atomic-library
npm pack ./dist-atomic-library
```

In the consuming application install the generated tarball with npm/pnpm/yarn. Explain copying it into `vendor/` and using its actual filename; show `npm install ./vendor/brutalist-design-system-0.1.0-atomic.0.tgz` for the current default build. Source setup imports `AtomsRoot` and `brutalist-design-system/styles.css` once.
- [x] Add the Vite page entry; run focused docs tests, typecheck and boundary checks.

## Task 4 — Verification and Basics review handoff

- [x] Build the library and typecheck/build copies of the displayed example modules using public imports. Keep verification isolated from production files.
- [x] Run `npm run test:atomic`, `npm run test:atomic-boundaries`, `npm run check:atomic-boundaries`, `npm run typecheck`, `npm run build:atomic`, `npm run build:atomic-library`, `npm run verify:atomic-consumer`, and the docs-example verifier.
- [x] Run the required Observatory harness from the main checkout, whose local Observatory tooling owns the existing task record.
- [x] Start the new worktree preview on a free port. Verify Color, all page links, direct reload, search, Preview/Code, clipboard feedback, package-manager selection, mobile Drawer, contents anchors, and existing catalog routes in the browser. Check desktop, 1024px and 320–390px layout; inspect reduced-motion handling.
- [x] Review changed files for private controls, duplicated token values, unsupported API claims, copied reference branding and page-wide overflow. Fix observed defects and rerun affected checks.
- [x] Record the verified preview URL and review notes, update Observatory location and status, commit only scoped branch files and open the Basics preview for the user.
- [x] Stop at the Basics review checkpoint. Do not begin Components or UI block documentation until the user confirms the Basics template works.

## Rollout after Basics approval — version one

1. **Components:** [x] Use the same template for all 46 currently exported Component names, preserving aliases/grouped controls from `componentManifest.js`. Group by action, display, feedback, form, layout, navigation, overlay. Each destination documents actual variants, states, events, keyboard behavior, setup and API; grouped exports share a page where the existing library does.
2. **UI blocks:** [x] SidebarPanel, PromptInput and CodeExample use the accepted page template with realistic compositions and configuration examples. Maintain the no-block-dependency rule.
3. **Integration:** [ ] After all reviewed pages work, decide with the user whether this documentation replaces the catalog landing page. Keep the experiment separate until that decision.

## Self-review

All eight existing Basics areas and every token family are covered in Task 2. Panel reuse, actual APIs, independent source checks, navigation and responsive behavior are addressed by Tasks 1–4. The previously proposed Button-only rollout and reference-like sample APIs are superseded by this plan.
