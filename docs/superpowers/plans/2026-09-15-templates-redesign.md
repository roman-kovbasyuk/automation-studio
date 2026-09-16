# Templates Card Catalog Implementation Plan

> **For agentic workers:** after explicit authorization to implement, use the writing-plans execution workflow task-by-task. Use subagent-driven-development only if requested; otherwise execute inline with checkpoints. This plan does not start implementation. Steps use checkbox syntax for tracking.

**Goal:** Deliver the user's Templates page as an extensible grouped card catalog, with hover Create with template and Edit/Delete actions, within the existing application foundation.

**Architecture:** `TemplateLibrary` composes a normalized catalog model, a toolbar and reusable group/card compositions. Existing output editors remain owners of asset drafts. Template-management commands are separate from output creation and preserve immutable versions. The plan separates the visual/read path from the management dependencies that are not implemented today.

**Tech Stack:** React 19, Vite, Vitest/Testing Library, installed `brutalist-design-system`, existing Fastify/PostgreSQL services.

**Spec:** [Templates design brief](../../design-system/pages/templates.md), including the [latest mockup](../../design-system/references/templates-catalog-layout.png).

**Status:** Ready for planning review, 15 September 2026. No application, test, dependency or database changes are part of this deliverable.

## Global constraints

- Keep the left sidebar and shared shell unchanged.
- Groups are extensible; Banners and Slides are examples, not a fixed page structure.
- Default card: preview, template name and last-used metadata. On hover: **Create with template** and **⋯ → Edit / Delete**.
- Retain Add tiles, but resolve their destination before implementing their workflow.
- Use public Brutalist components without local skins, upstream class selectors, token overrides, or `className`/`style` on upstream roots.
- Preserve immutable template versions and existing output-editor validation, permissions and draft state.
- Do not fabricate templates, usage dates, successful writes, creation capabilities or brand assignments.
- Do not execute this plan until the user requests implementation.

## Working checkout and evidence

Application root: `/Users/roman/Documents/Dev/crisp/lingu-agents/.worktrees/integrated-mvp`.
Coordination root: `/Users/roman/Documents/ChatGPT/project-x`.
Observatory task: `f547fc26-c531-4076-9e9f-32e149c147b2`.

All implementation paths below are relative to the application root. Before implementation, read its AGENTS/FRONTEND contract, pull the coordination task and inbox, inspect the current diff, and isolate the work if necessary. The application checkout already contains substantial unrelated changes; never reset, stage or commit them wholesale.

| Verified source | Present behavior / implication |
| --- | --- |
| `src/studio/TemplateLibrary.jsx` | Category tabs, static system choices and campaign callout; banner selection lives in URL/local state |
| `src/studio/NovartisTemplateGallery.jsx` | Mixed API banner cards, brand-name matching and static reference artwork; these are different capability classes |
| `src/studio/PresentationLibrary.jsx` | Bundled MSD slides; content editor and browser text-draft persistence; JSON package export |
| `src/studio/BannerTemplateEditor.jsx` | Output content/formats editor, not reusable-template layout authoring |
| `src/studio/StudioApp.jsx` | Owns shell and template entry bindings; current `canChoose` is not template-management authorization |
| `shared/projectTypes.js` | Existing IDs and broad categories; do not globally rename these to match local group headings |
| `server/routes/templates.js` | Read/version endpoints and admin-only POST; no edit/archive/delete/usage endpoint |
| `server/repositories/templateRepository.js` | Latest-by-publication-order reads; no group/archive/usage metadata |
| `server/db/migrations/001_core.sql` | Published template rows are append-only; campaign versions reference exact template ID/version |
| `server/services/templateBrandService.js` | Published brand assignment appends versions and is admin-only for the shared catalog |
| `server/routes/bannerTemplateEditor.js` | Draft export preserves campaign state; action endpoints may honestly return unavailable |
| `server/assetWorkflows/catalog.js` | Simulation-only capabilities are not a production creation/authoring flow |

Do not import historical plan claims as working features. Revalidate these facts when execution starts.

## Product decisions before dependent tasks

| Decision | Recommended implementation | Effect if changed |
| --- | --- | --- |
| Add tile | Start a new reusable template, with current group/brand preselected | If it instead creates an output, route it through Task 4; do not duplicate authoring work |
| Edit scope | Dedicated template-authoring flow; saving publishes a new validated version | Exact editable fields and authoring UI need agreement; an output editor cannot stand in for this |
| Delete meaning | Remove from future catalog selection; preserve versions used by existing work | Decide whether removal is from this brand/workspace or the shared catalog, and whether restoration is exposed |
| Management roles | Retain current admin-only reusable-template writes | Designer/marketer management would be an explicit permission change |
| Last used | Most recent confirmed persisted use by the current user in this workspace | Shared-team use needs a different query and label; editor visits never qualify |

These decisions do not prevent the read model, layout and card composition from being built with isolated fixtures after implementation authorization. They prevent enabling dependent production writes. A release with requested actions still unavailable is not the full completed redesign.

## Dependency order

1. Normalize catalog/group/capability data.
2. Build toolbar and grouped layout.
3. Build reusable hover/focus/touch card actions.
4. Connect Create with template to real creation drafts.
5. Implement the agreed Add/Edit/Delete lifecycle.
6. Bind truthful usage metadata and sorting.
7. Verify complete flows, responsive UI and inherited contracts.

Tasks 2–4 depend on Task 1. Management and usage work depend on the product decisions above. No new general-purpose framework, visual group editor, paid generation, or unrelated output renderer is included.

## Task 1 — Catalog read model and extensible groups

**Files:** Create `src/studio/templateCatalog.js`, `src/studio/templateCatalog.test.js`. Modify `src/studio/TemplateLibrary.jsx` and only the exports needed from `NovartisTemplateGallery.jsx` / `PresentationLibrary.jsx`.

**Interfaces:**

```ts
type TemplateGroup = {
  id: string; label: string; singularLabel: string;
  order: number; previewRatio: string;
};
type CatalogEntry = {
  key: string; templateId: string; version: string;
  name: string; brandId: string | null; groupId: string;
  source: 'published' | 'bundled' | 'reference';
  preview: { kind: 'manifest' | 'image'; value: unknown };
  capabilities: { create: boolean; edit: boolean; delete: boolean };
  lastUsedAt: string | null;
};
// Definitions live in templateCatalog.js; the types document its JS contract.
normalizeCatalog({ templates, brands, bundledEntries, groups }): CatalogEntry[]
selectCatalog({ entries, groups, brandId, groupId, query, sort }):
  Array<{ group: TemplateGroup; entries: CatalogEntry[] }>
readCatalogLocation(search: string): { brandId: string | null; groupId: string; query: string; sort: string }
```

- [ ] Write tests for brand isolation, explicit legacy mapping, a third arbitrary group, no matches, missing usage, deterministic sorting and source-specific capabilities. A useful pure-model test is:

```js
test('renders a third registered group without a page branch', () => {
  const groups = [
    { id: 'banners', label: 'Banners', singularLabel: 'Banner', order: 1, previewRatio: '1 / 1' },
    { id: 'slides', label: 'Slides', singularLabel: 'slide', order: 2, previewRatio: '16 / 9' },
    { id: 'documents', label: 'Documents', singularLabel: 'document', order: 3, previewRatio: '3 / 4' },
  ];
  const entries = [{ key: 'document-1', groupId: 'documents', brandId: 'brand-a', name: 'Guide', lastUsedAt: null }];
  const result = selectCatalog({ entries, groups, brandId: 'brand-a', groupId: 'all', query: '', sort: 'name' });
  expect(result.map(item => item.group.label)).toEqual(['Banners', 'Slides', 'Documents']);
  expect(result[2].entries.map(item => item.name)).toEqual(['Guide']);
});
```

- [ ] Run `npm run test:run -- src/studio/templateCatalog.test.js`; observe failures before implementation.
- [ ] Normalize sources through explicit adapters. Use real brand IDs where present; migrate legacy aliases deliberately. Never assign all unbranded records to each selected brand. Preserve unassigned records in an explicit scope.
- [ ] Declare groups in one catalog metadata registry and render them by mapping that registry. Keep group identity separate from output family. Unknown groups use a labeled fallback and unavailable creation capability until a renderer is registered; they must not be rendered as banners by default.
- [ ] Filter before grouping; sort inside each group. Keep group order stable. For equal/missing timestamps, sort by name and stable key. Keep configured empty groups available for Add; distinguish a truly empty group from filtered-out matches.
- [ ] Rerun the suite; review only this task's diff before any commit.

## Task 2 — Toolbar, layout and route state

**Files:** Modify `src/studio/TemplateLibrary.jsx`; create `src/studio/template-library.css`, `src/studio/TemplateGroup.jsx`; update `src/studio/DesignSystemTemplateCatalog.test.jsx`.

**Interfaces:** `TemplateGroup({group, entries, renderCard, addAction})`; `addAction` is `{label, allowed, onAdd, reason}`. `TemplateLibrary` consumes Task 1's model and existing API context.

- [ ] Add behavior tests for search, clearing, group filter, brand changes, sort, back/forward and direct legacy links. Example:

```js
await user.click(screen.getByRole('button', { name: 'Search templates' }));
await user.type(screen.getByRole('searchbox', { name: 'Search templates' }), 'summer');
expect(screen.getByText('Summer courses')).toBeVisible();
expect(screen.queryByText('Winter courses')).not.toBeInTheDocument();
await user.click(screen.getByRole('button', { name: 'Clear search' }));
expect(screen.getByText('Winter courses')).toBeVisible();
```

Use a real TemplateLibrary render with explicit synthetic entries for those two names; define it in the test file, not in production data.

- [ ] Run `npm run test:run -- src/studio/DesignSystemTemplateCatalog.test.jsx` and confirm the absent toolbar behavior fails.
- [ ] Replace the category tabs/campaign callout with Heading → toolbar → group list. Keep `#template-categories` as the stable entry. Preserve the StudioApp sidebar and header untouched.
- [ ] Use public SearchField/Select/Menu controls. Put brand, group, query and sort in URL state. Maintain explicit legacy aliases such as `category=ads` and `category=presentations`; do not let them overwrite a newer explicit group parameter. Invalid values normalize to a valid visible scope.
- [ ] Keep the work column centered, toolbar aligned to groups, and two desktop columns. Wrap controls and switch to one column at the content breakpoint. Use public spacing tokens and application-owned containers only.
- [ ] Place Add last in each group. Use supported Surface/Button composition; record the missing dashed variant instead of styling package internals or substituting a file dropzone.
- [ ] Verify URL changes preserve filters on back/refresh. Search Escape closes the expanded field and restores the search-trigger focus. Rerun tests.

## Task 3 — Reusable template card and revealed actions

**Files:** Create `src/studio/TemplateCard.jsx`, `src/studio/TemplateCard.test.jsx`; extend `template-library.css`.

**Interfaces:** `TemplateCard({entry, preview, onCreate, onEdit, onDelete, pendingAction, error})`. Callbacks receive the exact `entry`; application commands live outside the card. `pendingAction` is null, `create`, `edit` or `delete`.

- [ ] Test exact entry/version routing for all three controls, menu labels, permission-disabled actions, busy duplicate prevention and an error that preserves the card.

```js
const onCreate = vi.fn(), onEdit = vi.fn(), onDelete = vi.fn();
const entry = { key: 'summer@2', templateId: 'summer', version: '2', name: 'Summer courses',
  capabilities: { create: true, edit: true, delete: true }, lastUsedAt: null };
render(<TemplateCard entry={entry} preview={<img alt="Summer preview" src="/fixture.png" />}
  onCreate={onCreate} onEdit={onEdit} onDelete={onDelete} pendingAction={null} error={null} />);
await user.click(screen.getByRole('button', { name: 'Create with template' }));
expect(onCreate).toHaveBeenCalledWith(entry);
await user.click(screen.getByRole('button', { name: 'Actions for Summer courses' }));
await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
expect(onEdit).toHaveBeenCalledWith(entry);
```

- [ ] Run `npm run test:run -- src/studio/TemplateCard.test.jsx`; observe failure, then implement using public Surface, Text/Heading, Button and Menu. Use the installed Menu's icon-only prop and supported ellipsis icon.
- [ ] Keep metadata permanently visible. Position a plain action wrapper within the preview, with reserved dimensions; preserve image ratio and contain artwork. No nested clickable card root, duplicated title action or click propagation between menu and Create.
- [ ] Show actions on card hover and `focus-within`; keep controls in the keyboard sequence. Use opacity/pointer handling on the wrapper, not `display:none` that makes the controls unreachable. Coarse-pointer/no-hover users see actions continuously.
- [ ] Verify the portalled menu stays usable after leaving the card. Escape returns focus to its trigger. The menu and action wrapper must not be clipped by artwork overflow; use a separate preview-clipping region.
- [ ] Keep Create visible but disabled with a meaningful reason when unsupported; likewise communicate management restrictions. Do not silently make a reference-only image editable. Run tests and browser-only hover/focus checks; jsdom alone cannot prove CSS visibility.

## Task 4 — Create with template and return behavior

**Files:** Modify `TemplateLibrary.jsx`, `StudioApp.jsx`, `BannerTemplateEditor.jsx`, `PresentationLibrary.jsx` only at their routing/draft boundaries. Extend `BannerTemplateEditor.interaction.test.jsx`, `PresentationLibrary.test.jsx` and `DesignSystemTemplateCatalog.test.jsx`.

**Interfaces:** `beginTemplateUse(entry)` resolves the entry's source/version and opens the existing compatible output editor. `returnToCatalog({key, search, scrollY})` restores catalog context. Define these near TemplateLibrary, not in a new workflow engine.

- [ ] Test that Create opens the chosen banner/slide with its captured version, does not publish a reusable template, and returns to the same filtered catalog. Also test obsolete links and changed permissions.
- [ ] Run the affected suites before changing implementation.
- [ ] Reuse BannerTemplateEditor for banner output content and SlideEditor for slide output content. Expose SlideEditor through a named export if needed. Preserve its draft-storage and validation contract; retain sample-content labels.
- [ ] Capture a draft once per explicit creation action and protect it from refetch-driven resets. Version changes must not replace its manifest behind the user's back. Preserve existing refresh behavior and clearly record any existing browser-only persistence limitation.
- [ ] Keep Create free of implicit paid generation, publishing or approval. For a source without a production editor, retain an accurate unavailable state; a simulator is not a substitute.
- [ ] Return focus to the original card's Create control. If the card no longer exists, focus its group heading or the catalog heading. Restore URL filters and scroll.
- [ ] Rerun banner/slide regression suites and exercise existing deep links. Completion means an editable output draft is available; it does not claim an exported or approved asset exists.

## Task 5 — Add, Edit and Delete management lifecycle

**Dependency gate:** first record the agreed Add destination, editable template fields, deletion scope/recovery and management roles in the design brief. The exact authoring interface is a separate bounded design decision; do not ship a JSON textarea, rename-only form or output-content editor as an invented substitute.

**Existing files to integrate:** `server/routes/templates.js`, `server/repositories/templateRepository.js`, `server/services/workflowService.js`, `server/services/templateBrandService.js`, `shared/contracts.js`, `src/studio/api.js`, `src/studio/TemplateLibrary.jsx`.

**Proposed new files:** `shared/templateCatalogContracts.js`, `server/services/templateCatalogService.js`, `server/services/templateCatalogService.test.js`, `server/routes/templateCatalog.js`, `server/routes/templateCatalog.test.js`, `server/repositories/templateCatalogRepository.js`, `server/repositories/templateCatalogRepository.integration.test.js`, `src/studio/TemplateManagement.jsx`, `src/studio/TemplateManagement.test.jsx`. Allocate the next unused migration number at execution; existing migrations are shared with concurrent work.

**Recommended command contract (proposal, not an existing API):**

```ts
createCatalogTemplate({ actor, brandId, groupId, draft, operationId })
  -> { entry, publishedVersion }
publishCatalogTemplateRevision({ actor, entryId, expectedRevision, draft, operationId })
  -> { entry, publishedVersion }
archiveCatalogTemplate({ actor, entryId, expectedRevision, operationId })
  -> { entryId, archived: true, revision }
```

`draft` is the validated authoring payload defined by the agreed authoring scope. Do not add that payload to the strict renderer schema as arbitrary UI fields. Keep catalog metadata and immutable creative manifests separate.

- [ ] Before implementation, make the authoring scope executable: identify fields, preview renderer, Save/Cancel, validation, draft retention and publication effect. Choose catalog-entry ownership and archive scope explicitly. If user decisions are pending, implement neither management UI nor a pretend success callback.
- [ ] Write route/service tests for permitted and rejected roles, cross-scope access, captured-revision conflict, exact entry identity, invalid manifest, duplicate command reconciliation, and archival preserving historical references.
- [ ] Implement mutable catalog metadata outside the append-only `templates` rows. Archive the selected logical catalog entry; never delete immutable versions or silently broaden the operation to other brands/workspaces.
- [ ] Saving an edit appends a validated version and advances the catalog pointer only after success. Preserve the original draft on 400/403/409/5xx responses. Existing outputs retain their captured version.
- [ ] Bind Add to the agreed new-template flow with brand/group prefilled. Bind Edit to the reusable-template draft, not output content. Do not auto-save or publish on opening either flow.
- [ ] Bind Delete to a concrete confirmation identifying the template and scope. Explain that existing outputs remain. Keep the card while the request runs; remove it only after an authoritative response. On uncertain network outcome, reconcile by operation identity before retrying.
- [ ] Check that archive filtering does not make old editor drafts/exports unusable. In particular, the current banner export route checks membership in `listTemplates`; separate discovery visibility from authorized exact-version resolution before changing that list.
- [ ] Only enable the management menu where the real capability permits it. Run the new route/service/UI suites plus `server/services/templateBrandService.test.js` and `server/routes/bannerTemplateEditor.test.js`. Run database checks against the isolated test database, never live data.

## Task 6 — Real usage metadata and sorting

**Files:** Extend the new catalog response/contracts/repository as needed; modify `templateCatalog.js` and the actual creation service that owns the agreed persisted use event. Add its focused service test. Keep browser-only reference sources explicitly unknown.

**Interface:** nullable `lastUsedAt` in the catalog response. If a new recorder is necessary, define `recordTemplateUse({actor, entryId, version, outputId})`; derive time on the server and deduplicate by authoritative output identity. The caller must prove ownership/access and successful persistence of that output.

- [ ] Establish the qualifying event and personal/shared scope from the decision table before adding writes. Never use hover, page load, metadata Edit, button click alone or an attempted download as a completed output event.
- [ ] Test newest known use first, nulls last, stable name/key ties, failed creation leaving usage unchanged, duplicate events and an actor unable to report another actor's output.
- [ ] Expose server-backed metadata only for sources with that evidence. Keep **Usage not recorded** for old/bundled/reference records until a real event exists. Never derive it from publication time or browser-local visit history.
- [ ] Render a readable relative label and expose the full localized date via semantic time/accessible text. Recompute relative dates at a reasonable boundary without resorting the user's current list mid-interaction.
- [ ] Name sorting and search must work even when every usage value is unknown. A missing timestamp is a supported data state, not proof the template was never used.

## Task 7 — Verification, documentation and delivery

**Files:** Update the design brief and this checklist with evidence. Add confirmed native fallbacks to `docs/design-system/missing-components.md`. Update the coordination Observatory location only if a destination changes.

- [ ] Run focused tests for catalog, card, create routing and management/usage commands. Keep failure cases meaningful: stale version, inaccessible brand, forbidden management, unavailable renderer, lost network response, preview failure and no results.
- [ ] Run from the application checkout:

```sh
npm run test:run -- src/studio/templateCatalog.test.js src/studio/TemplateCard.test.jsx src/studio/DesignSystemTemplateCatalog.test.jsx src/studio/BannerTemplateEditor.test.jsx src/studio/BannerTemplateEditor.interaction.test.jsx src/studio/PresentationLibrary.test.jsx
npm run design-system:check
npm run build
```

Management-specific suites above are additional when Task 5 is implemented. Run broader affected shell/route tests if their bindings change. Do not rewrite tests merely to accept broken draft or permission behavior.

- [ ] Inspect the latest mockup and rendered result side by side: group hierarchy, toolbar alignment, preview proportions, metadata and hover actions. Use actual published records for integration and clearly labeled synthetic fixtures for a third group, long names, missing images and all error states.
- [ ] Inspect 1598px reference width, 1280px desktop, 390px touch and 320px reflow. Ensure no page-level horizontal overflow, readable wrapping, no card jump on hover, and uncut open menus.
- [ ] Exercise mouse hover, keyboard Tab/Enter/Escape and touch. Verify create/menu controls can be reached before they are visually revealed, maintain visible focus, and restore focus after cancellation/navigation/deletion.
- [ ] Verify every enabled Create/Edit/Delete/Add path through its actual authorized result, refresh and return. Check old version links after archive, conflict retention and duplicate prevention using isolated synthetic data.
- [ ] Record pass/fail/unverified for each requirement below. A fixture-only action is not verified production integration; a disabled requested action is an open dependency, not full completion.
- [ ] Read the Observatory record back, confirm Screen `Banner Studio templates`, Section `Asset groups`, and directly open its registered `#template-categories` route. Update the task to ready only for the currently requested deliverable.
- [ ] Review only the owned diff. Commit implementation only under the user's execution scope; preserve unrelated working changes. Deliver the route, brief, verification evidence and actual remaining limitations.

## Requirement-to-evidence checklist

| Requirement | Owning task | Acceptance evidence |
| --- | --- | --- |
| Unchanged sidebar | 2, 7 | Shell diff and desktop/mobile inspection |
| Any number of groups | 1, 2 | Synthetic third-group test and rendered example |
| Preview/name/usage cards | 3, 6 | Real content, missing preview and unknown-use checks |
| Hover Create + ellipsis | 3 | Pointer and keyboard browser checks; command identity test |
| Edit/Delete menu | 3, 5 | Real management command, permission/conflict/failure tests |
| Add tile per group | 2, 5 | Correct group/brand context and agreed workflow |
| Search/brand/type/sort | 1, 2, 6 | Filter combinations, no results, URL back/refresh |
| Square banners / landscape slides | 2, 3 | Aspect-ratio and visual inspection |
| Create with template | 4 | Exact-version draft plus existing editor regressions |
| Accessible responsive operation | 3, 7 | Hover/focus/touch, menu portal, 320px reflow |
| Design-system compliance | All, 7 | Public API review, boundary check and rendered review |

## Planning-deliverable verification

This plan and its brief have been checked against the current entry points, public component declarations, template repository/routes, immutable database constraints, brand assignments and current output editors. The latest reference image is saved with the brief. Runtime tests and builds are deliberately not claimed as run for this documentation-only task; they are execution steps above. Outstanding product decisions are explicit and scoped to their dependent tasks.
