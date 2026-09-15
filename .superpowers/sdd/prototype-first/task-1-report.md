# Task A1 report: isolated prototype launch

## Status

Implemented and verified. The prototype entry is selected only when Vite runs with `--mode prototype`; the normal build ignores `?prototype=true`. Prototype fetches reject API, health, readiness and external URLs before the supplied fetch implementation is called.

## Files

- Modified `src/main.jsx` to lazy select the mode-specific entry and preserve StrictMode, styles and a bounded Suspense fallback.
- Modified `vite.config.js` to use a mode-aware config with an empty prototype proxy and existing normal proxies.
- Modified `package.json` with prototype dev/build/preview scripts and design-system-check pre-scripts.
- Added `src/prototype/PrototypeApp.jsx` with the bounded offline entry state.
- Added `src/prototype/networkGuard.js` with `installPrototypeNetworkGuard({ origin, fetchImpl }) -> restore()`.
- Added `src/prototype/entry.test.jsx` and `src/prototype/networkGuard.test.js`.
- Added `docs/design-system/pages/prototype-creation.md` using the governing design brief template.

## Tests and builds

- `npm run test:run -- src/prototype/entry.test.jsx src/prototype/networkGuard.test.js` — 2 files, 4 tests passed.
- `npm run build:prototype` — passed, including `npm run design-system:check`.
- `npm run build` — passed, including the normal app and docs builds.

## Concerns and limitations

- Observatory tracking could not run because this checkout does not contain `observatory/cli.mjs`; the required pull therefore failed before implementation.
- The prototype entry intentionally has only bounded loading copy; A3 owns the local workspace connection.
- The normal build emits existing large-chunk warnings; no A1 failure resulted.
- The worktree contained extensive unrelated dirty changes. Only the explicit A1 files were staged for the commit.
