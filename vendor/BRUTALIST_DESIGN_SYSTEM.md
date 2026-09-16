# Canonical external design system

The upstream repository is https://github.com/roman-kovbasyuk/brutalist-design-system.
`brutalist-design-system.json` is the machine-readable provenance record: exact
Git commit, package version, archive filename, checksum, and upstream file hashes.
`package.json` and `package-lock.json` must agree with it. Older archives may be
retained for rollback; only the manifest-selected archive is installed.

From the application checkout:

```sh
npm run design-system:update -- --check  # Build and check upstream imports without changing the app
npm run design-system:update            # Build, install, verify, test, and rebuild
npm run design-system:check             # Check the currently installed dependency and CSS boundary
```

The updater clones upstream main into a temporary directory, installs upstream
build dependencies from its lockfile, builds/verifies the library, and checks
that current app imports exist before touching consumer manifests. It never
modifies an external working checkout. It refuses to overwrite manifests changed
concurrently while preparing a candidate. It then installs a commit-named archive,
records provenance, runs the guard tests and full application test suite, and builds the app/docs.

A failed preflight leaves the app unchanged. A failure after installation leaves
the candidate installed for diagnosis and prints the location of pre-update
manifest backups; it exits unsuccessfully and does not publish or deploy anything.
Fix the consumer incompatibility before accepting the update. Commit the selected
archive, provenance JSON, package.json and package-lock.json together.

The app bundles this dependency at build time. It does not fetch components from
GitHub at runtime. Existing imports use compatible updated components without
rebinding. New components need explicit adoption; removed exports fail preflight.

The check runs before normal dev/API-dev/preview startup and inside the production
build script (including CI). It rejects mismatched manifests, archive replacement,
modified installed package files, missing named exports, CSS targeting upstream
component classes, redefined upstream tokens, and explicit className/style props on directly imported upstream components. npm-managed nested dependencies
are governed by their lockfile entries, not the upstream package file hash list.

These checks cannot infer arbitrary spread props or every ancestor selector.
Rendered route checks complement the static checks. Native fallbacks and app
behavior adapters are recorded in
`docs/design-system/missing-components.md`. The old banner-design-system package and stylesheet have been removed. The check
also prevents that second dependency from being reintroduced.
