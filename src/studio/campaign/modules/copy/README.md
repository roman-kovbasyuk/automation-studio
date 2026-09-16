# Copy module

Two primary states: empty guidance and generated cards. Brief submission's coordinator prepares the first batch; mounting or refreshing Copy never dispatches generation.

Input: immutable `copies` batches, analyzed Brief, `selectedCopyId`, and optional existing `previewAssetId`/`previewTemplateId` and published `previewManifest`. Each batch exposes `approvedCandidateIds`; the workspace service removes hidden candidates before projection. Current batches arrive oldest first.

Commands:

- `generate()` appends up to five visible cards, with the runtime's retry identity. The server reserves remaining capacity under campaign locking and counts pending/unknown job reservations; a successful replay never appends twice. Limit: 30 visible cards, independently of existing budget/request limits.
- `select(candidateId)` makes that copy the active Banners source without deleting or hiding other cards.
- `deselect(candidateId)` clears the active source and dependent Banners selection without deleting copy.
- `remove(candidateId)` persists hidden state without erasing generation history. Deleting the selected copy clears downstream selection; no replacement is chosen silently.
- `edit(candidateId, { headline, body, offer, cta }, { expectedInputKey })` saves an inline draft with revision protection, preserving candidate ID and approval. The original generation result and prior review snapshots remain immutable; a hashed audit record proves each human edit to banner validation.
- `regenerateVisuals(copyIds)` explicitly regenerates only the changed approved copy blocks. Campaign-wide imagery stays current.

Copy stays editable after approval, visual generation and creation of an unsent review version. The server locks mutations when the current review has a recorded Figma handoff. Reopening requested changes restores editing. Editing an unsent review returns it to composition through an audited transaction before changing live sources. Generated cards remain visible after visuals so selection, deselection, preview, deletion, and editing remain available. Figma-locked cards use their neutral appearance without numbers or hover controls.

Preview lazily renders one card using existing content and image data. It never requests image generation or changes selection. View errors stay local. The shared card, empty-state, button, modal, and exit-presence components own interaction behavior and reduced-motion support.

Run in isolation: `npm test -- --run src/studio/campaign/modules/copy server/repositories/copyOptions.integration.test.js`. The PostgreSQL test uses its own temporary schema; it exercises persisted approvals, append order, cap, replay, reservations, deletion and explicit replacement selection.
