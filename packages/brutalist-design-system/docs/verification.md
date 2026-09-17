# Verification

Run the complete local gate from the Automation Studio repository root:

```sh
npm run verify --workspace brutalist-design-system
```

The gate covers layer-boundary tests, source boundaries, atomic component and documentation tests, TypeScript, the documentation build, the library build, copyable documentation examples, and a fresh tarball-installed consumer. The consumer runs its own typecheck, client build, and SSR build with an isolated npm cache and no source aliases.

Useful focused commands are:

```sh
npm run test:atomic
npm run typecheck
npm run check:atomic-boundaries
npm run verify:atomic-consumer
```

Automation Studio's CI runs the same umbrella command on Node.js 22 whenever package files change.
