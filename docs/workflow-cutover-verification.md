# Canonical workflow verification

## Passing checks

- `npm run design-system:check`
- `npx vitest run server/services/workflowService.test.js server/services/briefingService.test.js server/workflows/canonicalMigration.integration.test.js server/services/briefingAnalysis.integration.test.js server/services/briefingConfirmation.integration.test.js src/studio/campaign/workflowCoordinator.test.js src/studio/campaign/briefingCoordinator.test.js`
- `npm run build`

The focused slice currently passes 49 tests. The isolated migration test uses a
fresh PostgreSQL schema and confirms exact raw-note preservation, v2 state,
revision advancement, no inserted jobs/confirmations, and replay safety.

## Not a release gate yet

The broad historical workflow suite still contains fixtures for the retired
non-v2 creation path and is expected to fail until those fixtures are migrated
to explicit canonical setup. This is recorded as remaining implementation
work, not as a passing result. No paid text, image or video generation was run
for this change.
