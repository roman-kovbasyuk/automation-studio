# Getting started

The design system requires Node.js 22 or later and npm. Install dependencies in a clean checkout:

```sh
npm ci
npm run verify
```

Run the documentation locally with `npm run dev:atomic`. The root page is Getting Started. The historical `/atomic.html` address redirects to the matching current page when it contains a legacy Basics, Component, or UI Block hash.

To build the private package:

```sh
npm run build:atomic-library
npm pack ./dist-atomic-library
```

Install the generated tarball in the consuming application, import components from `brutalist-design-system`, and import `brutalist-design-system/styles.css` once. Wrap the application root in `AtomsRoot` when it needs the shared CSS variables. Do not import `src/atomic` or catalog files; the catalog implementation has been retired.
