# Atomic Components Batch 2 Implementation Plan

**Goal:** Continue the approved rewrite with exactly five more components, then stop for review.

**Architecture:** Atoms → Components → UI blocks → Screens. Each new component consumes Atoms and existing internal field support. The catalog only composes public components and provides demo state. Keep legacy source and the application shell unchanged.

**Tech stack:** React, TypeScript, scoped CSS with Atom variables, Vitest/Testing Library, isolated Vite catalog.

**Spec:** User-approved rewrite direction and batch checkpoint: preserve existing UI, rebuild from Atoms, work directly without delegation, review every five. Previous visual comments define the cyan switch, pill tags and three-option sliding black segmented selection.

## Contracts and files

1. `Toggle.tsx`, `toggle.css`: labelled native checkbox with switch role, controlled/uncontrolled state, native form name/value, disabled and helper/error. 48×28 visual track, 20px thumb, 44px minimum label target; white thumb, black stroke, cyan selected background, token-based ease-out motion. Reuse FieldSupport.
2. `TextArea.tsx`: visible H7 label, body text, same field styling as TextField; helper/error/required/disabled/readOnly. Autoheight grows and shrinks on input, controlled changes and width changes; no manual resize handle. Native textarea rows is the minimum height. Geometry fallback uses ResizeObserver only for width changes to avoid feedback loops.
3. `Select.tsx`, `select.css`: labelled native single-select with typed string options, placeholder, disabled options, controlled/uncontrolled value and helper/error. Atom chevron, native keyboard/form semantics; no custom popup or option icons in this contract.
4. `Tag.tsx`, `tag.css`: noninteractive small-text pill, neutral/accent/success/danger tones, optional Atom icon, optional accessible removal action using Button. No fake button semantics on the label. Removal button is a separate 44px target.
5. `SegmentedControl.tsx`, `segmented-control.css`: labelled single-choice radio group, three demo options, controlled/uncontrolled value, disabled options, roving keyboard focus with arrows/Home/End, equal-width segments and black moving indicator. No elevation at rest; token elevation on hover. Reduced motion disables movement. Radio semantics because density selection does not own tab panels. Optional name submits selected value through a hidden input.

## Test-first execution

- [x] Add `batch-2.test.tsx`: assert missing public exports first, then native switch form state and disabled handling; textarea value/error wiring; Select placeholder/disabled option/form value; Tag removal label/action; segmented controlled selection, keyboard wrap/skip/Home/End, empty/all-disabled states and form value.
- [x] Run `npm run test:atomic` and confirm missing-component failures.
- [x] Implement the five components and only necessary Atom size tokens. Export each from `components/index.ts`.
- [x] Add `ComponentsBatchTwo.tsx`; compose all five with real demo state. Append stable anchors and navigation to existing catalog; don't introduce private controls.
- [x] Run `npm run test:atomic`, `npm run typecheck`, `npm run build:atomic`. Resolve failures before browser review.
- [x] Browser verification: 19 tests pass; desktop and 375px checked. Textarea grows/shrinks. Narrow labels now remain intact in Atom ScrollArea. Keyboard navigation explicitly scrolls the focused option into view (verified End selects Spacious and moves scrollLeft to 112px).
- [x] Update README and Observatory, stop after component ten. No commit, push, or publication in this checkpoint.
