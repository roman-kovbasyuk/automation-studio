# Task 1 — briefing regression repairs

## Result

- Summary and Audience editors mark the review dirty as soon as editing starts and keep the captured input key across a remote refresh. Cancelling the final inline edit adopts the latest saved answers and key together. An unfinished inline edit also stays dirty while another save finishes, then uses that save's refreshed key.
- A previously imported supplied-copy set becomes current on a new confirmation for changed copy settings. Its original snapshot, import identity, edited candidates and deletion markers remain intact. The new brief association is recorded in `retained_brief_hash`; old selection and approval flags are cleared when the copy is reactivated. The version-service lineage check accepts the edited supplied candidate after replacement generation.
- Stored briefing answers, analysis proposals and analysis-job results can read the former `under_18` value without rewriting it. New drafts, provider results and confirmations remain adult-only. The review names the historical selection, requires an adult range before reconfirmation, and the server returns an actionable age error. After correction, generation omits the obsolete historical proposal from command context while preserving the stored analysis and hashes.
- Version lineage and immutable version-plan construction parse historical analysis with the stored schema. A corrected campaign can approve generated copy, select a generated image, save a banner composition and render a review version while the old proposal remains in its immutable plan.

## Red → green evidence

Each regression test was added to an owning suite before its production change. All tests use local mock providers; integration tests create and remove isolated schemas in `banner_studio_test`.

| Regression | Red evidence | Green evidence |
| --- | --- | --- |
| Unfinished Summary/Audience after remote refresh | Both component cases failed because `port.setDirty(true)` was never called. | Both pass with the original input key in confirmation. |
| Cancel after remote Audience refresh, then edit Summary | Owning component test showed the old `Commuters` audience after Escape instead of `Remote audience`. | Test passes; confirmation includes the remote audience and refreshed input key. |
| Inline edit during another save | Component test sent `source-before-edit` for the second save instead of `after-own-save`. | Test passes; dirty guard remains active and the second autosave uses `after-own-save`. |
| Supplied copy after a changed goal | Isolated integration test found `stale: true` after replacement generation. | Test passes with the same current supplied set, preserved edit/deletion/history and successful `verifyCopyLineage`. |
| Historical `under_18` answer and proposal | Stored-state and analysis reads failed Zod validation; corrected confirmation initially failed evidence validation or later generation input validation. | Schema and isolated integration tests pass; raw stored data remains unchanged before correction, adult correction confirms, and explicit copy and direction generation succeed. |
| Historical analysis in generated-copy lineage and version creation | Extended integration test failed with `copy_selection_invalid` after generated-copy approval. | Test passes through `verifyCopyLineage`, image generation, `saveBannerBatch` and `createVersion`; rendered review is in review and its immutable plan retains the old proposal. |
| Fresh provider response containing `under_18` | Injected provider result is rejected by the existing output boundary as `invalid_output`. | Owning integration test confirms failure and no analysis is stored. |

## Focused verification

Final frontend/schema command:

```sh
npm run test:run -- src/studio/campaign/modules/brief/BriefModule.reviewed.test.jsx src/studio/campaign/modules/brief/BriefReview.test.jsx src/studio/campaign/modules/brief/BriefReviewSteps.test.jsx src/studio/campaign/modules/brief/briefReviewModel.test.js shared/briefingContracts.test.js shared/briefingDependencies.test.js shared/contracts.test.js
```

Result: 7 files, 78 tests passed.

Final service/chain command:

```sh
npm run test:run -- server/services/briefingConfirmation.integration.test.js server/services/briefingFlow.integration.test.js server/services/briefingAnalysis.integration.test.js server/services/briefingService.test.js server/services/copyLineage.test.js server/services/copyRetention.integration.test.js
```

Result: 6 files, 15 tests passed. `git diff --check` on the task's files also passed. No paid AI or demo database was used. The root agent owns the full suite, build, documentation updates and final integration review.

After the version-service historical-read fix, the affected confirmation, briefing flow, visual version, copy-lineage and copy-retention suites passed: 5 files, 17 tests. The single extended historical case was red at `copy_selection_invalid` before the fix and green after the fix.

## Compatibility boundary and risk

The wider stored schemas apply to persisted campaign state and job results, plus historical analysis reads in version lineage and immutable plan construction. Create/patch requests and the provider result schema still use the adult-only `briefAnalysisSchema`; confirmation rejects `under_18` with HTTP 422. Historical proposal data remains in campaign, job and version-plan snapshots. For a corrected historical brief, only the provider command projection omits that obsolete suggestion; ordinary analysis projections are unchanged so existing generated-copy identities keep their prior hash behavior.

The tests cover the confirmed legacy age value and a historical proposal. They do not establish how many such records exist outside isolated test schemas. No migration was run.
