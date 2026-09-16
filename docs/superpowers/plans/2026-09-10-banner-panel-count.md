# Banner panel count implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the Banners panel count as distinct copies × distinct templates × selected resize formats.

**Architecture:** Derive the three factors from the existing selected design identities and ratio IDs inside the Banners view. Reuse the same derived values for the selection bar and confirmation dialog; do not alter the saved design payload or server validation.

**Tech Stack:** React, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-10-banner-panel-count-design.md`

## Global Constraints

- Preserve individual selected design identities and `ratioIds` in the save payload.
- Do not change template compatibility, Figma handoff, review authorization, or server behavior.
- Count unique `copyId` values, unique template/version pairs, and selected resize IDs.

---

### Task 1: Derive and present the requested panel total

**Files:**
- Modify: `src/studio/campaign/modules/banners/BannersView.jsx`
- Modify: `src/studio/campaign/modules/banners/BannersSelection.test.jsx`

**Interfaces:**
- Consumes: `selected` design identities with `copyId`, `templateId`, and `templateVersion`; selected `ratioIds`.
- Produces: `SelectionTotal` content in the form `N copies × N templates × N sizes` and their numeric product.

- [ ] **Step 1: Write the failing UI regression test**

```jsx
it('counts distinct selected copies, templates, and resize formats', () => {
  const { workspace, templates } = makeScenario('visuals-ready')
  const input = projectModuleInput('banners', workspace, { templates })
  input.composition = {
    designs: [
      { templateId: templates[0].id, templateVersion: templates[0].version, copySetId: 'copy-set-1', copyId: 'copy-1', directionId: 'direction-1' },
      { templateId: templates[1].id, templateVersion: templates[1].version, copySetId: 'copy-set-1', copyId: 'copy-2', directionId: 'direction-1' },
    ],
    ratioIds: ['square', 'story'],
  }
  setup({ input })
  expect(screen.getByRole('status', { name: 'Banner selection total' }))
    .toHaveTextContent('2 copies × 2 templates × 2 sizes')
  expect(screen.getByRole('status', { name: 'Banner selection total' })).toHaveTextContent('8')
})
```

- [ ] **Step 2: Run the focused test and verify it fails because the current UI shows only designs × sizes.**

Run: `npm test -- --run src/studio/campaign/modules/banners/BannersSelection.test.jsx`

Expected: FAIL because the selection total does not contain `2 copies × 2 templates × 2 sizes`.

- [ ] **Step 3: Derive distinct copy IDs and template/version pairs in `SelectionTotal`, then multiply their counts by `ratioIds.length`.**

```jsx
const copies = new Set(designs.map(design => design.copyId)).size
const templates = new Set(designs.map(design => `${design.templateId}@${design.templateVersion}`)).size
const total = copies * templates * sizes.length
```

- [ ] **Step 4: Pass the complete selected design list and selected ratio IDs to both selection-total instances.**

```jsx
<SelectionTotal designs={selected} sizes={ratioIds} />
```

- [ ] **Step 5: Re-run the focused Banners selection suite and confirm it passes.**

Run: `npm test -- --run src/studio/campaign/modules/banners/BannersSelection.test.jsx`

Expected: PASS.

- [ ] **Step 6: Do not commit.**

The shared checkout contains unrelated user changes, so leave this narrowly scoped change uncommitted.
