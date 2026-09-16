# Design System Library and Layout Implementation Plan

**Goal:** Make the design-system Library groups a floating menu, constrain the page to a 1000px reading width with content-sized controls, and correct swatch copy-control stroke and icon alignment.

**Architecture:** Reuse the canonical `SelectMenu` interaction for Library group selection, keep the existing `PillTabPanel` content contract, and express the width and control corrections through scoped design-system CSS tokens. Preserve existing search, item selection, keyboard behavior, and responsive stacking.

**Tech Stack:** React, Vitest Testing Library, scoped CSS, lucide-react icons.

**Spec:** User browser comments for the design-system Library and Foundations surfaces.

## Global Constraints

- Use shared components from `src/components/design-system/` for controls.
- Preserve existing accessibility semantics, keyboard behavior, and responsive rules.
- Keep unrelated dirty-worktree changes untouched.

### Task 1: Floating Library group menu

**Files:**
- Modify: `src/components/design-system/examples/LibraryIndex.jsx`
- Modify: `src/components/design-system/examples/library-index.css`
- Test: `src/screens/DesignSystemScreen.test.jsx`

- [x] Replace the inline category `PillTabs` control with `SelectMenu` using the three category names as options and the existing `chooseCategory` callback.
- [x] Style the Library menu wrapper and trigger so the shared floating listbox reads as a compact top-level group menu.
- [x] Extend the screen test to assert the menu opens, exposes Basics/Components/UI blocks, changes the active panel, and closes after selection.

### Task 2: Constrained reading width and content-sized controls

**Files:**
- Modify: `src/screens/DesignSystemScreen.jsx`
- Modify: `src/styles/design-system.css`
- Modify: `src/components/design-system/examples/library-index.css`

- [x] Set the design-system screen and major sections to a 1000px maximum width with centered margins.
- [x] Retain grid layouts only for visual arrays (color, icon, image specimens); set non-array control groups and value controls to intrinsic or token-bounded widths.
- [x] Add narrow viewport rules that preserve readable overflow and stacking.

### Task 3: Swatch copy-control stroke and icon alignment

**Files:**
- Modify: `src/styles/design-system.css`
- Modify: `src/components/design-system/atoms/token-copy-target.css`
- Test: `src/screens/DesignSystemScreen.test.jsx`

- [x] Remove the extra swatch button stroke while retaining the swatch perimeter stroke.
- [x] Center the copy icon in its compact button using the shared control alignment rules.
- [x] Add a focused style assertion and run the design-system test suite.

### Task 4: Verification

- [x] Run focused design-system tests and `git diff --check`.
- [x] Run the Impeccable detector against changed UI files.
- [x] Reload the browser route and verify the floating menu, 1000px layout, swatch stroke, and centered icon at desktop and narrow widths.
