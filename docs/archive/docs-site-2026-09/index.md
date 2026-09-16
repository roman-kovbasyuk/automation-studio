# Banner Studio documentation

Product behavior, architecture proposals, and implementation guidance for the team.

::: tip Latest discussion · 9 September 2026
Start with [Decisions and explorations](/decisions/) for the asset workflow harness, backend admin, database foundation, hosting comparison, and Terraform setup.
:::

## Start here

| I want to understand… | Read |
| --- | --- |
| What we agreed, proposed, and still need to choose | [Decision register](/decisions/#decision-register) |
| How each asset type is created | [Product recipes](/workflow) |
| Where recipe steps and AI instructions are configured | [Product logic designer](/decisions/asset-workflows) |
| How users, projects, documents and tasks fit together | [Admin and data model](/decisions/admin-data) |
| What infrastructure we need | [Hosting options](/decisions/hosting) |
| How we can provision and deploy it | [Terraform and CLI setup](/decisions/infrastructure) |
| What to implement first | [Delivery stages](/decisions/delivery) |

## Current application

The checkout contains a React/Vite frontend, a Node/Fastify API, PostgreSQL repositories, provider integrations, private asset storage adapters, and versioned campaign review/delivery logic. It also contains demo and test modes. Available source code is not proof that every integration is configured or deployed.

The current campaign experience has six modules: **Brief → Copy → Visuals → Banners → Review → Distribute**. See [Banner creation](/recipes/banner-creation), [Campaign modules](/campaign-modules), and [Technical architecture](/architecture).

The admin foundation includes read-only system views and a persisted React Flow recipe editor with validation, fixture simulation, publication and activation. Durable recipe execution, human tasks and additional renderers remain planned. Start a disposable local admin preview with `node scripts/testing/start-admin-preview.mjs`; see the application runbook at `docs/admin-backend.md`.

## How to read status

- **Confirmed requirement:** explicitly requested product behavior.
- **Observed in source:** implementation found in this checkout; operational readiness needs separate verification.
- **Recommendation:** a proposed engineering choice.
- **Open:** a choice that has not been settled.
- **Historical:** earlier planning preserved for context.

[Team process](/team-process) and the [original MVP roadmap](/roadmap) remain available as historical planning references. Their local checkboxes are not the shared task tracker.

## Run and maintain these docs

```sh
npm run dev:docs
npm run build:docs
npm run preview:docs
```

Run these commands from the application checkout. Development and preview use **http://127.0.0.1:5180/docs/**; run one of them at a time. The production application build includes the site at `/docs/`.

Pages live in `docs-site/`; navigation and local search are configured in `docs-site/.vitepress/config.js`. Read [Documentation maintenance](/decisions/maintenance) before changing decision status.
