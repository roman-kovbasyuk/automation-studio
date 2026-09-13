# Brutalist Design System

One canonical implementation, built with Atomic Design. The previous implementation is removed; Git history retains it for recovery.

## Layers

- `src/atomic/atoms`: Basics (Atoms)—tokens, typography, icons, layout and surfaces.
- `src/atomic/components`: Components (Molecules)—shared controls and interaction patterns.
- `src/atomic/ui-blocks`: UI Blocks (Organisms)—SidebarPanel and PromptInput compose shared components.
- `src/atomic/catalog`: the interactive reference app, using the same public components.

Dependencies flow from higher layers to lower layers only. Blocks do not introduce private controls or restyle shared interaction states. Automated boundary checks enforce the source dependency direction.

## Development and verification

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
npm run verify
```

`npm run build` builds the catalog into `dist`. Both `/` and `/atomic.html` serve the same catalog; the latter preserves existing review links.

`npm run verify` checks layer boundaries, tests, TypeScript, catalog and package builds, then installs the packed package in an independent consumer and checks its client and server builds.

## Package

```sh
npm run build:library
npm pack ./dist-atomic-library
```

Install the generated tarball in the consuming application. Import components from `brutalist-design-system` and import `brutalist-design-system/styles.css` once. Do not import source files or catalog CSS.

The `:atomic` command aliases remain available for existing local workflows. They invoke the same implementation, not a second design system.
