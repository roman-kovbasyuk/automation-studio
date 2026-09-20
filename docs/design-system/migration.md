# Application consumer boundary

**Status:** Current · **Updated:** 20 September 2026

Automation Studio consumes the detachable workspace package at `packages/brutalist-design-system` (D36). There is no vendored archive, update script or cross-repository change queue.

## Imports and ownership

- Application code imports only `brutalist-design-system` and `brutalist-design-system/styles.css`.
- Development and tests resolve the package's `source` condition. Production builds first build its library and consume the public distribution.
- The package owns generic appearance, tokens and interactions. Application adapters in `src/components/design-system/` translate domain callbacks or compose controls; they must not restyle package internals.
- Output templates and published brand systems own generated artwork. Application UI tokens are not artwork brand tokens.

## Remaining adoption

The [adoption audit](adoption-audit.md) lists replacements to evaluate at live call sites. The [gap list](missing-components.md) records interaction gaps. Do not replace an adapter until its draft, focus, error, read-only and keyboard behavior is covered by the replacement.

Generic additive changes belong in the package with tests and a patch version. Public breaking changes require owner approval and a minor version before 1.0. The [integration specification](../specs/design-system-integration.md) governs this workflow.

## Verification

```sh
npm run design-system:check
npm run verify --workspace brutalist-design-system
npm run build
```

The boundary check covers imports, exports, isolation, vocabulary and explicit styling boundaries. It does not prove indirect wrapper behavior or every CSS selector; review the changed consumers and their interactions as well.

The old extraction and vendored-release instructions were removed during preparation (D40). They remain available in Git history and must not be used as current setup instructions.
