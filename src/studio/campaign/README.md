# Campaign runtime

The current banner implementation lives here. The target product model is described in the [product concept](../../../docs/product/concept.md); [campaign modules](../../../docs/engineering/campaign-modules.md) documents the current architecture.

## Owners

- `CampaignPage.jsx` owns layout, navigation and unsaved-change guards.
- `campaignRuntime.js` owns workspace refresh, operation state and captured input identities.
- `workflowCoordinator.js` connects explicit named module commands. Opening or refreshing a project never starts generation.
- `moduleContracts.js` projects module inputs and outputs. Review remains an internal module displayed inside Banners.
- `modules/` owns Brief, Copy, Visuals, Banners, Review and Distribute views and commands.
- `testing/` owns isolated module fixtures, harnesses and the development-only playground.

There are six internal module IDs and five visible stages. They remain live until the planned four-stage project shell replaces them. Old names alone do not make these modules dead code.

## Preservation guarantees

Editors stay mounted across navigation and mutation refresh. Capture the input key when editing starts; never substitute a new key to hide a conflict. The server owns authorization, revisions, artifact provenance and completion.

Banner selection sends identities to the server, which resolves copy, images and templates. Each design and size receives exact renderer validation. A failed save keeps the selection draft; it never truncates copy silently. Review preparation binds to the composition returned by the save, not a later workspace refresh.

Review versions and delivery packages are immutable. Designer permissions and mandatory review remain unchanged until the accepted Assets-stage specification is implemented.

## Verification

```sh
npm run test:run -- src/studio/campaign
npm run test:run -- src/studio/StudioApp.test.jsx
npm run test:workflow
npm run build
```

The workflow runner uses an isolated test schema and mock providers. The local development API uses the real demo database; use the offline prototype or isolated launchers for experiments.

See the [preparation review](../../../docs/engineering/phase-preparation-review.md) for current verification evidence. Earlier implementation checkpoints and measurements remain in Git history.
