# Verification

Run the complete local gate from a clean checkout:

```sh
npm run verify
```

The gate covers layer-boundary tests, source boundaries, atomic component and documentation tests, TypeScript, the documentation build, the library build, copyable documentation examples, the external-change protocol tests, and a fresh tarball-installed consumer. The consumer runs its own typecheck, client build, and SSR build with an isolated npm cache and no source aliases.

Useful focused commands are:

```sh
npm run test:atomic
npm run typecheck
npm run check:atomic-boundaries
npm run test:changes
npm run verify:atomic-consumer
```

CI runs the same umbrella command on Node.js 22. A synthetic protocol harness does not count as a real Codex CLI run; report that limitation separately when the authenticated external adapter was unavailable.
