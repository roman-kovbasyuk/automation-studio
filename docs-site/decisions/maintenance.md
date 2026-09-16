# Documentation maintenance

**Updated:** 9 September 2026.

## Source and ownership

This site is the browsable guide in `docs-site/`. The detailed architecture specification stays in `docs/superpowers/specs/`; the [backend reference page](/decisions/backend-reference) includes it at build time to avoid a second copy.

Implementation plans remain planning artifacts. The [decision register](/decisions/#decision-register) records what the user requested, what source inspection established, what is recommended and what remains open.

## Updating a decision

1. Update the owning topic page with its date, status, reason and implications.
2. Update the register and note any earlier recommendation it supersedes.
3. Preserve requirements and relevant tradeoffs; remove claims that are no longer true.
4. Distinguish implemented code from a verified deployment.
5. Build the site, check its links and open the affected section directly.

A question about an option is not acceptance of that option. A Terraform plan is not an applied deployment. A documentation checkbox is not shared task progress.

## Local commands

The rendered documentation is read-only. Edit the Markdown in `docs-site/` using an editor, or request a change in the project conversation. Saved edits appear automatically while the development server is running.

The Product recipes overview lives in `docs-site/workflow.md`; individual recipes live in `docs-site/recipes/`. Keep per-product steps on those pages and shared designer behavior in `docs-site/decisions/asset-workflows.md`.

Run from the application repository:

```sh
npm run dev:docs
```

Open **http://127.0.0.1:5180/docs/**. The development server watches Markdown changes.

```sh
npm run build:docs
npm run preview:docs
```

Build output goes to `dist/docs/`. Stop the development server before using preview on the same port. `npm run build` includes the application and docs.

VitePress local search indexes this site's content without requiring a hosted search account. [VitePress search](https://vitepress.dev/reference/default-theme-search)

## Verification scope

For documentation changes, validate the VitePress build, internal links and section anchors, navigation, search and diagrams. Record the actual result. Product tests, deployment checks and load tests need separate evidence.

Keep secrets, customer content and machine-specific credentials out of published documentation. Public hosting of this team documentation is a separate deployment choice.

## Historical references

The original MVP roadmap and team-process page are preserved as historical planning. They describe an earlier demo scope and are not an up-to-date inventory of backend capability or team task status.
