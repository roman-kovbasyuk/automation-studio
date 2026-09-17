# Brutalist Design System

One canonical implementation, built with Atomic Design. The previous implementation is removed; Git history retains it for recovery.

## Layers

- `src/atomic/atoms`: Basics (Atoms)—tokens, typography, icons, layout and surfaces.
- `src/atomic/components`: Components (Molecules)—shared controls and interaction patterns.
- `src/atomic/ui-blocks`: UI Blocks (Organisms)—SidebarPanel and PromptInput compose shared components.
- `src/atomic/screens/docs`: the canonical interactive documentation for Basics, Components and UI Blocks.

Dependencies flow from higher layers to lower layers only. Blocks do not introduce private controls or restyle shared interaction states. Automated boundary checks enforce the source dependency direction.

## Development and verification

This package lives in the Automation Studio repository as the workspace package `packages/brutalist-design-system` (Automation Studio decision D36). It stays detachable: it has its own manifest, tests, build and documentation, never imports application code, and is used only through its public entry points.

Requires Node.js 22 or later. Install once from the repository root, then run package commands with `--workspace brutalist-design-system`:

```sh
npm ci
npm run dev --workspace brutalist-design-system
npm run verify --workspace brutalist-design-system
```

`npm run build` builds the documentation into `dist`. The root route is Getting Started; `/atomic.html` remains a compatibility redirect for old review links.

`npm run verify` checks layer boundaries, tests, TypeScript, documentation and package builds, then installs the packed package in an independent consumer and checks its client and server builds.

## Package

Consumers import components from `brutalist-design-system` and import `brutalist-design-system/styles.css` once. Do not import source files or catalog CSS.

- **Source condition:** the `source` export condition points at `src/atomic`. Automation Studio's dev server and tests use it, so package edits need no rebuild.
- **Built library:** `npm run build:library` writes `dist-atomic-library`, which production builds use. `npm pack ./dist-atomic-library` produces an installable archive when the package is detached.

The permanent repository guides are collected in [`docs/README.md`](docs/README.md); the interactive pages are linked from the root documentation route.

The `:atomic` command aliases remain available for existing local workflows. They invoke the same implementation, not a second design system.
