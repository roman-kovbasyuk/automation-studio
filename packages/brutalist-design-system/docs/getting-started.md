# Getting started

The design system requires Node.js 22 or later and npm. It lives in the Automation Studio repository as a workspace package; install dependencies from the repository root:

```sh
npm ci
npm run verify --workspace brutalist-design-system
```

Run the documentation locally with `npm run dev:atomic --workspace brutalist-design-system`. The root page is Getting Started. The historical `/atomic.html` address redirects to the matching current page when it contains a legacy Basics, Component, or UI Block hash.

To build the library, and pack it when the package is used outside Automation Studio:

```sh
npm run build:atomic-library
npm pack ./dist-atomic-library
```

Consumers import components from `brutalist-design-system` and import `brutalist-design-system/styles.css` once. Wrap the application root in `AtomsRoot` when it needs the shared CSS variables. Do not import `src/atomic` or catalog files; the catalog implementation has been retired.
