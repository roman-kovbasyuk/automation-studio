# Automation Studio

Automation Studio produces on-brand content automatically.

- A company's **brand** (its design system) is the foundation of every asset.
- **Templates** for each asset type are built on that brand.
- In each **project**, a **recipe** turns a brief into finished assets through four stages: **Brief → Copy → Visuals → Assets**.
- When automatic quality is not good enough, work is **escalated** to the design team.

Banners are the first asset type and decks the second.

> **Status (16 September 2026):** preparing a proof of concept. The current code implements a banner-only flow with mandatory designer review; the target model is described in the [documentation](docs/index.md). See the [roadmap](docs/product/roadmap.md).

## Quick start

Requires Node.js 22+ and PostgreSQL.

```sh
npm install
npm run dev:api   # local API on port 3010 (uses the banner_studio_demo database)
npm run dev       # application on http://127.0.0.1:5173
```

For a browser-only version with fixtures and no API, run `npm run dev:prototype`.

Read [local development](docs/engineering/local-development.md) before creating projects locally: the local API writes to a real demo database and can call live AI.

## Documentation

All documentation lives in [`docs/`](docs/index.md) and is served as a site at `/docs` (`npm run dev:docs` locally).

| Start here | |
| --- | --- |
| [Product concept](docs/product/concept.md) | What Automation Studio is and how it works |
| [Decision log](docs/product/decisions.md) | What has been decided |
| [Roadmap](docs/product/roadmap.md) | What happens next |
| [Architecture](docs/engineering/architecture.md) | How the code is organised today |
| [FRONTEND.md](FRONTEND.md) | Rules for application UI work |

## Repository layout

```text
src/            React application (studio, campaign flow, admin)
server/         Fastify API, services, repositories, providers, renderer
shared/         Contracts and logic shared by browser and server
figma-plugin/   Figma plugin for design handoff
scripts/        Build, verification, local runtime and fixture scripts
vendor/         Pinned Brutalist design-system package
docs/           Documentation (single source)
docs-site/      VitePress configuration that renders docs/
```

## Build and test

```sh
npm run test:run
npm run design-system:check
npm run build
npm run verify:production
```

AI coding agents: read [AGENTS.md](AGENTS.md).
