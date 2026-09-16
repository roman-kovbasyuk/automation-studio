# Banner workflow three states implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Banners the sole campaign module for selection, Figma review, and final-file readiness, removing the separate Review step from navigation.

**Architecture:** Preserve the existing server-owned version, Figma handoff, review-history, approval, and delivery contracts. The browser projects Review’s existing input and actions into Banners after a composition is saved, then routes legacy Review URLs to Banners. Distribute remains responsible for packaging and downloading approved files.

**Tech Stack:** React, Vitest, campaign runtime projections, existing Figma handoff API.

**Spec:** `docs-site/recipes/campaign-flow.md`

## Global Constraints

- Keep the separate designer/marketer authorization checks in the server and runtime.
- Keep version/hash identity checks and immutable approved files unchanged.
- Preserve legacy `?module=review` and numeric Review links by resolving them to Banners.
- Do not add Figma polling or client-side approval authority.

---

### Task 1: Fold the Review projection into Banners

**Files:**
- Modify: `src/studio/campaign/moduleContracts.js`
- Modify: `src/studio/campaign/workflowState.js`
- Test: `src/studio/campaign/workflowState.test.js`

**Interfaces:**
- Consumes: the existing `review` projection, review history, and `reviewGuard` authorization result.
- Produces: a Banners input with `review` data and Banners access that permits review commands only when the existing review guard permits them.

- [ ] **Step 1: Write the failing workflow-state test**

```js
test('keeps Figma review states inside Banners and advances to Distribute only after approval', () => {
  expect(state('in-review').currentModule).toBe('banners')
  expect(state('ready').modules.banners.canEdit).toBe(true)
  expect(state('approved').modules.banners.complete).toBe(true)
  expect(state('approved').modules.distribute.canVisit).toBe(true)
})
```

- [ ] **Step 2: Run the focused test and verify it fails because review still owns the state.**

Run: `npm test -- --run src/studio/campaign/workflowState.test.js`

- [ ] **Step 3: Extend the Banners input with the existing Review input and assign review guards to Banners for `in_review`, `changes_requested`, `ready`, `approved`, and `delivered`.**

- [ ] **Step 4: Re-run the focused state tests and confirm they pass.**

### Task 2: Render review and ready states inside Banners

**Files:**
- Modify: `src/studio/campaign/modules/banners/BannersModule.jsx`
- Modify: `src/studio/campaign/modules/banners/BannersView.jsx`
- Modify: `src/studio/campaign/workflowCoordinator.js`
- Test: `src/studio/campaign/modules/banners/BannersSelection.test.jsx`

**Interfaces:**
- Consumes: Banners selection commands and existing Review commands.
- Produces: one Banners module that shows the selection UI before composition, then the existing Figma handoff/review UI, and uses the existing Distribute module after approval.

- [ ] **Step 1: Write the failing Banners module test.**

```jsx
it('shows the Figma review state in Banners and does not navigate to Review after selection', async () => {
  // confirm a selected batch and assert the Banners module contains the Figma handoff action
  // while the navigation callback receives 'banners'
})
```

- [ ] **Step 2: Run the focused Banners test and verify it fails because Banners navigates to Review.**

Run: `npm test -- --run src/studio/campaign/modules/banners/BannersSelection.test.jsx`

- [ ] **Step 3: Compose the existing Review view into Banners with the review actions supplied by the coordinator, and keep the existing review form, role checks, and handoff state.**

- [ ] **Step 4: Change the post-confirmation navigation target from `review` to `banners`, then re-run the focused Banners tests.**

### Task 3: Remove Review from the visible campaign workflow while preserving links

**Files:**
- Modify: `src/studio/campaign/moduleContracts.js`
- Modify: `src/studio/campaign/moduleRegistry.js`
- Modify: `src/studio/campaign/CampaignPage.jsx`
- Modify: `src/studio/campaign/campaignRoutes.js`
- Test: `src/studio/campaign/CampaignPage.test.jsx`
- Test: `src/studio/campaign/campaignRoutes.test.js`

**Interfaces:**
- Consumes: `MODULE_IDS` and semantic module URLs.
- Produces: a five-item visible timeline: Brief, Copy, Visuals, Banners, Distribute; Review links resolve to Banners.

- [ ] **Step 1: Write failing route and page tests for the five-item timeline and Review-to-Banners compatibility mapping.**

```js
expect(parseCampaignModule('?module=review')).toBe('banners')
expect(headings).toEqual(['Brief', 'Copy', 'Visuals', 'Banners', 'Distribute'])
```

- [ ] **Step 2: Run those tests and verify they fail with the old Review module.**

Run: `npm test -- --run src/studio/campaign/campaignRoutes.test.js src/studio/campaign/CampaignPage.test.jsx`

- [ ] **Step 3: Remove Review from the visible module list and timeline subscriptions, map legacy review steps and anchors to Banners, and keep Distribute as the final module.**

- [ ] **Step 4: Run route/page tests and the focused campaign workflow suite.**

### Task 4: Verify end-to-end client behavior

**Files:**
- Test: `src/studio/campaign/modules/banners/BannersModule.test.jsx`
- Test: `src/studio/campaign/modules/review/figmaReviewFlow.test.jsx`

- [ ] **Step 1: Run the focused Banners, route, workflow-state, runtime, and Figma review tests.**

Run: `npm test -- --run src/studio/campaign/modules/banners src/studio/campaign/campaignRoutes.test.js src/studio/campaign/workflowState.test.js src/studio/campaign/modules/review/figmaReviewFlow.test.jsx`

- [ ] **Step 2: Run `npm run build` and inspect the campaign page at the Banners anchor.**

- [ ] **Step 3: Record the verified Banners destination in Observatory and mark the task ready with test/build/browser evidence.**
