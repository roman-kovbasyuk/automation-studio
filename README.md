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

## Automatic changes for one application

One local npm application can request shared component changes through a JSON CLI. The application path and its real verification scripts are configured once. The examples below use a disposable application copy; for the permanent setup, replace that path with the owner's chosen application checkout and use its actual check scripts.

```sh
fixture="$(mktemp -d)"
cp -R /absolute/path/to/app "$fixture/app"
npm run changes -- configure --app "$fixture/app" --check typecheck --check build
```

The application must use npm with a `package-lock.json`, have the configured scripts in its `package.json`, and already have `brutalist-design-system` installed. Keep its `package.json` and `package-lock.json` committed and clean before an update. The design-system checkout must be on a clean `main` branch, and the local `codex` command must be authenticated and able to run in the checkout.

Create a request file with exactly four fields:

```json
{
  "requestId": "app-change-184",
  "installedVersion": "0.1.0-atomic.0",
  "component": "SearchField",
  "change": "Add an optional keyboard shortcut hint."
}
```

Start the worker in one terminal and leave it running:

```sh
npm run changes:worker
```

Submit and inspect requests from another terminal, or invoke the same commands from the external application's subprocess adapter:

```sh
npm run changes -- request --input /absolute/path/to/request.json
npm run changes -- get app-change-184
```

Submitting returns JSON with the request ID and `"status":"working"`. Repeating the same ID and four field values returns the existing request; reusing the ID with different values reports a conflict. Every accepted request records `approvedBy: "single-app-policy"`. This is the owner's standing automatic approval for the configured development application, so there is no additional approval prompt. Verification, atomic-layer boundaries, and clean-checkout checks still apply.

`get` returns one of these JSON states:

- `working`: queued or being implemented. If the worker is stopped, queued work remains durable and resumes after it restarts. A graceful stop finishes the active request before exiting. If execution is forcibly interrupted while the agent is editing, the worker preserves that request's worktree and reports a specific failure instead of replaying uncertain edits.
- `ready`: master contains the verified candidate and the response includes `version`, absolute `packagePath`, and `summary`. The optional `adoption` field is independently `pending`, `installed`, or `failed`; release readiness remains true when application installation or checks fail.
- `failed`: implementation, verification, promotion, or release failed. If an immutable package was already created, its version and path may be included for recovery.

Each ready result refers to the exact SHA-512-verified tarball retained under `.design-system-changes/releases/`. Versions are never reused, and artifacts referenced by application lockfiles must remain available. The application installs that exact tarball without running package lifecycle scripts, checks the installed version, and runs the configured scripts in order.

If installation or an application check fails, the adapter restores the previous `package.json` and `package-lock.json` bytes and reinstalls their locked dependency tree while leaving unrelated application files intact. The adoption error identifies the failure, such as `APP_INSTALL_FAILED`, `APP_CHECK_FAILED`, `CURRENT_VERSION_MISMATCH`, or `DEPENDENCY_FILES_DIRTY`. `ADOPTION_FILE_CONFLICT` means another writer changed a dependency file and the retained backup was not applied over it. `DEPENDENCY_RESTORE_FAILED` means automatic restoration did not complete; inspect the recovery journal under `.design-system-changes/app-updates/<requestId>/journal.json` before retrying manually.

This local workflow needs no dashboard, HTTP API, webhook, npm registry publication, remote push, or production deployment setup.
