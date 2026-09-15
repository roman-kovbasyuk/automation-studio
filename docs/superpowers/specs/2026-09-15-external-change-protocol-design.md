# Single-application design-system changes

Status: implemented and accepted; deterministic end-to-end coverage and a live Codex smoke check passed on 2026-09-15.

## Method

**App requests a change → automatically approved → master updated and checked → updated package returned to the app.**

There is one configured application. Its requests are automatically approved under the owner's standing instruction; there is no approval screen or manual review step. Approval does not skip implementation checks.

## Two operations

These are logical operations. A local CLI exchanging JSON is sufficient initially; a hosted API is unnecessary for one local application. The application checkout is configured once by the owner.

### 1. Request a change

`requestChange(input)` accepts:

```json
{
  "requestId": "app-change-184",
  "installedVersion": "0.1.0-atomic.0",
  "component": "SearchField",
  "change": "Add an optional keyboard shortcut hint."
}
```

All four fields are required. The request ID is chosen by the application so retries return the same work. Reusing an ID with different input returns a conflict. The immediate response contains `requestId` and `status: working`.

### 2. Get the result

`getChange(requestId)` returns `working`, `ready` or `failed`.

A ready result contains:

```json
{
  "requestId": "app-change-184",
  "status": "ready",
  "version": "0.1.1",
  "packagePath": "/absolute/path/to/brutalist-design-system-0.1.1.tgz",
  "summary": "SearchField now supports an optional shortcut hint."
}
```

Versions and paths above are illustrative. Real results identify the exact verified package. A failed result contains a concise `error` and, if a package was already built, its version and path for recovery. `ready` means the package is available; it does not claim the application has installed it.

## Processing

1. Record the request and its automatic approval; process requests serially.
2. An agent or maintainer implements the request in the canonical owning layer under `src/atomic/`, using the existing shared components and tokens.
3. Run `npm run verify` against the resulting master candidate. If checks fail, fix the change or return `failed`.
4. Apply the verified change to master and build a uniquely versioned package. If master changes during processing, refresh and recheck before applying. Never overwrite an existing released version.
5. Return the package path and change summary. The app can automatically install that exact package in its working checkout and run its own checks under this single-app policy. No further approval prompt is needed for this development update.
6. If app checks fail, restore its previous dependency and lockfile without discarding unrelated work, and report the failure. The master package remains available. Production deployment remains the app's separate workflow.

For incomplete requests, missing application configuration, or unresolved conflicts, return a specific failure explaining the missing information. Do not invent requirements to force completion.

## Existing foundation and remaining work

The repository already has the public exports in `src/atomic/index.ts`, the package builder in `scripts/atomic/build-library.mjs`, and independent package verification in `scripts/atomic/verify-consumer.mjs`.

Implementation needs a small request/result CLI, a worker that performs the change, unique release versions, and the app's package-update adapter. The current builder's fixed `-atomic.0` suffix needs explicit release versioning. Observatory can track execution; marking its task ready alone does not prove package delivery or installation.

Before enabling automation, check one complete request-to-package-to-app update, duplicate requests, failed library checks and failed app checks with dependency restoration. Preserve unrelated checkout changes throughout.
