# Admin and product recipes v1

This release implements admin visibility and recipe authoring from the backend foundation roadmap. It uses the existing React, Fastify and PostgreSQL application. The six campaign modules and their review permissions keep their existing behavior.

Product recipes describe an asset family: banners, presentations, websites or templates. A saved recipe is configuration. A publication is an immutable version of that configuration. A simulation evaluates it using supplied fixtures; it does not call an AI provider, render a file or start a live asset run.

## Local preview

From this application checkout, with Node 22 or newer, installed dependencies and local PostgreSQL available:

```sh
node scripts/testing/start-admin-preview.mjs
```

The launcher prints its admin URL and uses port 5181 by default. `ADMIN_PREVIEW_PORT` selects another port. It uses `TEST_DATABASE_URL` or the local `banner_studio_test` database, creates its own schema, applies migrations, and uses mock providers. Its frontend proxies only to that isolated API. The test database must already exist. Remote database hosts and production environments are rejected.

The preview is disposable. Edits persist through a browser refresh while it is running; stopping the process removes its schema and temporary files. Use the normal application runtime and database for persistent authoring. Closing the browser does not stop the preview process.

## Data and permissions

Admin endpoints require an authenticated, enabled administrator. Local demo roles belong to the explicitly enabled development runtime; adding a URL parameter does not grant production permission.

The overview and tables project existing records rather than introducing a second operational database:

- Users expose safe account fields, without credentials or provider secrets.
- Projects remain campaign-backed and report their stored product type.
- Assets include campaign files, stored brand sources and brand assets, with namespaced identities.
- System work includes generation jobs and independent brand AI jobs. A video job extends its generation job and is counted once.
- Activity contains safe references to existing events; it excludes raw request and provider payloads.
- Modules describe implemented capabilities. This inventory does not establish deployment health.

Durations describe persisted job lifecycle timestamps with a sample count and time window. Provider latency, human-task timing and live recipe-run telemetry remain unavailable where no measurement exists.

## Definition lifecycle

1. Open a persisted recipe and edit its draft.
2. Save using the draft revision that was loaded. A stale revision returns a conflict instead of overwriting another edit.
3. Validate the saved graph. Structurally safe incomplete drafts may be saved, but cannot be published.
4. Simulate the exact saved semantic hash with explicit inputs, answers and AI/render fixtures.
5. Publish a valid saved draft with a change note and an idempotency key. Retrying the same request returns the existing publication; reusing its key for different content conflicts.
6. Inspect the structured reference for a published version. Activate an earlier version when needed; its original contents stay immutable.

Canvas positions are persisted but excluded from the semantic hash. Node instructions, questions, conditions, bindings and connections change the hash. Simulation and validation never silently use an unsaved local graph.

Conditions use the supported `exists`, `equals` and `notEquals` operators. They do not execute JavaScript or SQL. Initial graphs are sequential with conditional branching; cycles and general parallel execution are unsupported. Bindings cannot reference prototype properties or unavailable upstream outputs. Required question types and options are validated. AI and renderer nodes require explicit synthetic output fixtures.

## API boundary

All routes are under `/api/v1/admin` and return the application's request identifier. Lists of operational records use `{items, page, pageSize, total}`. Recipe and capability lists use `{items}`.

Operational lists default to 25 rows, allow at most 100 rows per page, and cap page numbers at 1,000,000. Activity supports the native job statuses plus `delivered` for delivery events. Queries reject unsupported fields instead of silently broadening a filter.

| Method and path | Purpose |
| --- | --- |
| `GET /overview` | Counts, declared measurement window and capability summary |
| `GET /users`, `/projects`, `/assets`, `/jobs`, `/activity` | Bounded read-only record lists |
| `GET /projects/:id`, `/projects/:id/activity` | Project relationships and history |
| `GET /modules` | Existing module/capability inventory |
| `GET /asset-workflows` | Persisted recipes |
| `GET /asset-workflow-capabilities` | Supported node capability contracts |
| `POST /asset-workflows` | Create a recipe |
| `GET /asset-workflows/:id` | Draft, revision, semantic hash and publication metadata |
| `PUT /asset-workflows/:id/draft` | Save `{expectedRevision, draft}` |
| `POST /asset-workflows/:id/validate` | Validate `{expectedRevision}` |
| `POST /asset-workflows/:id/simulations` | Simulate `{expectedRevision, draftHash, fixture}` |
| `POST /asset-workflows/:id/publish` | Publish `{expectedRevision, changeNote, idempotencyKey}` |
| `POST /asset-workflows/:id/activate` | Activate `{versionId}` belonging to this recipe |
| `GET /asset-workflows/:id/versions/:versionId/reference` | Exact immutable definition with version/hash |

The exported Zod schemas in `shared/assetWorkflowContracts.js` and `shared/adminContracts.js` define the accepted fields. The published reference, not a separately maintained diagram, is the authoritative definition for that version.

## Storage and recovery

Migration `047_asset_workflows.sql` creates recipe drafts and immutable publications, with ownership constraints between a recipe and its active version. Run the normal migration command against the intended database before starting a persistent runtime:

```sh
npm run migrate
```

Use normal database backup and restore procedures before deployment. Keep database configuration in the environment and exclude credentials from logs and exported recipe fixtures. Do not remove publication immutability protections to edit history. Correct the draft and publish another version, or activate an earlier publication. An application rollback should preserve the additive tables; destructive down migrations are not part of this release.

Seeds initialize missing recipe keys only. They never overwrite an administrator's draft or publication, and reads do not perform hidden seeding. The four default recipes demonstrate authoring and simulation; their presence does not enable live renderers.

For a persistent environment, after migrations and creation of an enabled administrator, run:

```sh
node scripts/seed-asset-workflows.mjs
```

The command uses `DATABASE_URL`, defaulting to the local `banner_studio_demo` database when absent. Set the intended database configuration before running it outside local development. It selects an existing enabled administrator as the initializer and fails if none exists. It reports the number created, without printing credentials. Normal server startup does not automatically seed recipes; the disposable preview explicitly initializes its own four defaults.

## Remaining roadmap

Shared project/document identities, durable runs, node attempts, saved human tasks, worker scheduling and recovery, runtime adoption of published recipes, and additional output renderers remain later stages. Existing campaign generation continues through its established services. There is no generic admin action to bypass review, force provider completion, or execute arbitrary recipe code.
