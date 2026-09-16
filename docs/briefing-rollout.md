# Source-backed campaign briefing — local rollout

## Available now

- Banner creation can collect text and files, up to 25 MB combined. File names are not an extension allowlist; content detection and available processors determine readability. Failed sources block analysis and remain removable/retryable.
- Explicit analysis stops at the reviewed summary/audience and three stacked groups: Banner copy, Campaign parameters, Visual context. Campaign goal and reach are dropdowns; there is no separate Location field or wizard navigation.
- Analysis proposes up to seven grounded visual keywords. Users can remove keywords or add their own with Enter. Confirmed keywords feed visual generation.
- Keep original copy imports the detected wording without generating missing text. Copy remains editable/deletable. Generate appends new options below existing cards.
- Existing analyzed campaigns expose **Review campaign questions**. This explicit action upgrades/reanalyzes the brief; opening a campaign does not automatically generate drafts.
- Source uploads use stable identities, revision checks and interrupted-upload recovery. Changes from another editor stop remaining uploads. Retrying/removing a failed source preserves the unsubmitted file payload.
- Supplied copy has immutable original evidence and separately audited edits. Copy/visual dependencies are separate, including explicit retention after brief changes.

## Connection and rollout

The local API enables the capability with `BRIEFING_ENABLED=true`, a configured `VERTEX_AI_PROJECT_ID`, and `VERTEX_AI_LOCATION=eu`. Source-backed requests use managed Vertex application-default credentials. Personal API keys, other providers and region fallback are rejected. `GET /api/v1/runtime-config` advertises `capabilities.sourceBriefing`.

Additive migrations 049–052 provide source storage, the 25 MB budget, confirmations/authored provenance and native attachment references. The local database was migrated and the API restarted. Production deployment is not part of this rollout; production enablement is opt-in and requires the same managed-EU boundary.

## Verified

Mock-only browser flow: Home submission → questions → found-copy/source preview → Keep original → exact Copy card → user edit → Generate appends. The real local campaign's review entry and Home were inspected without invoking AI on its materials. Google ADC refresh and the read-only Vertex service check succeeded; a live model response has not been tested.

Fresh scoped suite: 82 files / 610 tests passed. The final retention regression and legacy retention checks passed separately (3 files / 4 tests), followed by independent re-review. Application/docs build, design-system boundary checks and whitespace checks passed. The full suite is not green: 1806 passed, 16 historical migration-fixture failures and 1 skipped. Those failures involve an outdated migration list and old-schema fixtures using the newer `project_type` repository.

## Still unfinished

- Native audio/video and additional binary/office conversions; currently supported processors cover UTF-8 text, PDF, DOCX, and validated PNG/JPEG/WebP. Legacy DOC requires an unavailable isolated converter. Do not claim every format is understood.
- Manual creation of a new Copy card and separate server-persisted answer drafts from the broader plan. Confirmed answers and edits to imported/generated Copy are persisted.
- Historical migration-fixture compatibility and full-suite sign-off.
- The requested pill-shaped inline input is an upstream design-system gap; the documented native input fallback is used. Public RadioGroup also produces controlled-input warnings in development; selections were functionally verified.
