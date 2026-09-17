# Local development

**Status:** Current · **Updated:** 16 September 2026

## Requirements

- Node.js 22 or newer
- PostgreSQL for the local API and integration tests
- Optional: Google Cloud application default credentials for source-backed briefing; Gemini API keys for live generation

```sh
npm install
```

## Run the application

| What | Command | Port | Notes |
| --- | --- | --- | --- |
| Local API | `npm run dev:api` | 3010 | `scripts/dev-studio.mjs`. Uses the `banner_studio_demo` database, runs migrations, reads the root `.env` and provides demo roles. |
| Application | `npm run dev` | 5173 | Vite. Proxies `/api` to port 3010, so start the local API first. |
| Offline prototype | `npm run dev:prototype` | 5190 | Browser-only fixtures. API and external network calls are blocked. |
| Documentation | `npm run dev:docs` | 5180 | VitePress rendering `docs/`. |
| Admin preview | `node scripts/testing/start-admin-preview.mjs` | 5181 | Isolated schema in `banner_studio_test`; removed on exit. |
| Production server | `npm start` | 8080 in Docker | Requires the variables in `.env.example`. Run `npm run migrate` first. |

`npm run dev`, `npm run dev:api` and `npm run preview` run `npm run design-system:check` first.

## Safety

> **The local API writes to a real demo database.** Anything done in the browser against `npm run dev` + `npm run dev:api` creates records in `banner_studio_demo`, and generation uses live AI if keys are configured.

- For experiments, use `npm run dev:prototype` or the isolated launchers in `scripts/testing/`.
- `npm run test:workflow` creates a unique schema in the local test database and removes only its own resources. It refuses remote hosts and the demo database.
- Never point `STUDIO_TEST_BASE_URL` at the demo or production environment.
- The local API refuses to start when `NODE_ENV=production`.

## Environment

Copy `.env.example` to `.env` (Git-ignored; keep permissions at `0600`).

| Variable | Used for |
| --- | --- |
| `DATABASE_URL`, `POSTGRES_*` | Production server and Docker Compose PostgreSQL |
| `FIREBASE_*` | Production authentication |
| `VERTEX_AI_PROJECT_ID`, `VERTEX_AI_LOCATION` | Gemini through Vertex AI (region must be `eu`). Required by the local API, because projects are created through the AI briefing ([D37](../product/decisions.md)); use `npm run dev:prototype` or the isolated studio launcher for mock generation |
| `GENERATION_PROVIDER`, `GEMINI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL` | Provider and model selection |
| `GEMINI_TEXT_API_KEY`, `GEMINI_MEDIA_API_KEY` | Local API generation; take precedence over personal connections |
| `GEMINI_VIDEO_MODEL` | Video generation model |
| `PERSONAL_CREDENTIAL_ENCRYPTION_KEY` | Encrypts personal provider keys. Generate with `openssl rand -hex 32`. |
| `ASSET_STORE`, `GCS_PROJECT_ID`, `GCS_ASSET_BUCKET` | Asset storage |

Never prefix secrets with `VITE_`, commit them or paste them into documents.

Development PostgreSQL can be started with `docker compose up` after setting `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB`.

## Tests and checks

| Check | Command |
| --- | --- |
| All unit and integration tests | `npm run test:run` |
| Focused tests | `npm run test:run -- path/to/file.test.js` |
| Full workflow against an isolated schema | `TEST_DATABASE_URL=postgresql:///banner_studio_test npm run test:workflow` |
| Application design system boundary | `npm run design-system:check` |
| Build application and docs | `npm run build` |
| Verify build and container | `npm run verify:production` |

The full suite is not green; see [known issues](known-issues.md).

## Demo data scripts

`scripts/setup-msd-templates.mjs`, `scripts/setup-novartis-brand.mjs` and `scripts/setup-folkeuniversitetet-brand.mjs` create brand and template fixtures in a local database. They are blocked in production.

## Module playground

With `npm run dev` running, open `/mvp/dev/modules/<module>?scenario=<scenario>` to render one campaign module with fixtures and recorded commands. It never touches live campaigns. See [campaign modules](campaign-modules.md).
