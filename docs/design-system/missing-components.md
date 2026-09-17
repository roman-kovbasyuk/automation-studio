# Design-system gap list

**Status:** Current · **Reviewed against:** `brutalist-design-system` `0.1.0-atomic.0`, commit `50c322c7fc38b934abb5391587dd509d0de40f62` · **Updated:** 17 September 2026

Patterns the application needs that the installed Brutalist package does not provide, the fallback used meanwhile, and what would replace it. The process is defined in [design system integration](../specs/design-system-integration.md); the evidence for each entry is in the [adoption audit](adoption-audit.md).

## Rules

- Check the package exports and this list before writing local UI.
- A fallback uses unstyled native behaviour or a composition of public components. Never style a native element to imitate a missing library control.
- Generic gaps are fixed in `packages/brutalist-design-system` in the pull request that needs them. Record that pull request here.
- Close an entry only in the change that replaces the fallback with the package component.
- When the package changes, re-review this list and update the version above. DS2 makes this list checkable by `npm run design-system:check`.

Status values: `open` (no request yet), `requested`, `available` (released, not yet adopted), `closed`.

## Open and available gaps

| ID | Pattern | Used in | Fallback | Waiting for | Request | Status |
| --- | --- | --- | --- | --- | --- | --- |
| G-routed-steps | Step navigation where steps are links | Brand setup wizard (`molecules/WorkflowSteps.jsx`); planned four-stage asset creation flow | Local ordered list of links; the campaign page uses public `WorkflowSteps` with `onChange` | `WorkflowSteps` with optional `href` per step | R1 | open |
| G-autosave-inline-text | Text saved automatically after a pause and on blur, respecting IME composition, with retry | Brief summary (`AutoSaveSummary.jsx` via `molecules/InlineText.jsx`) | Native textarea and button; 700 ms pause, blur, IME, captured revision, failed-save retry | `InlineText` autosave option | R2 | open |
| G-dialog-external-open | Dialog opened by application state or a custom trigger | `compatibility.jsx` `Dialog`/`Drawer`; `PreviewDialog` | Native `<dialog>` with focus return; no local modal skin | `Dialog`/`Drawer` with optional `trigger` when controlled | R3 | open |
| G-sidebar-profile-trigger | Profile block with avatar, name and upward menu | `SidebarAccountMenu.jsx` | Native buttons and menu items | `SidebarPanel` account trigger slot | R4 | open |
| G-sidebar-primary-disabled | Disabled primary action for read-only roles | Studio sidebar | Navigation callback blocked; no visual override | `SidebarPanel` `primaryAction.disabled` | R5 | open |
| G-sidebar-project-metadata | Project type icon and secondary label in the sidebar | Studio sidebar | Title only | `SidebarPanel` project `icon` and secondary label | R5 | open |
| G-sidebar-shell-border | Sidebar with only a right divider | Studio shell | Public component with all four borders, no override | `SidebarPanel` shell/border variant | R5 | open |
| G-keyword-input | Free-text tags added with Enter | Brief visual keywords (`BriefQuestionsView.jsx`) | Public `TextField` with Enter handler plus removable `Tag`s | `TagInput` component | R7 | open (low priority) |
| G-canvas-text | Editing banner text on the artwork | Banner template editor | Public fields beside the artwork | Canvas text editing component | none | open (deferred) |
| G-icon-bundle-size | Tree-shakeable icons | Whole application bundle | None; large design-system chunk | Per-icon or tree-shakeable icon registry | R8 | open |
| G-color-picker | Brand palette colour picking | `ColorTokenEditor.jsx` | Native `<input type="color">` | `ColorPicker` (released); read-only state still missing | R6 (read-only) | available → adopt A1 |
| G-attachment-selection | File attachment in composers and Visuals | `PromptComposer.jsx`, `VisualsView.jsx` | Hidden native file inputs behind public buttons | `PromptInput`, `FileDropzone`, `AttachmentArea` (released) | none | available → adopt A6, A7 |

## Closed

| ID | Pattern | Resolution | Date |
| --- | --- | --- | --- |
| G-empty-decision | Empty and decision regions | Public `EmptyState`; decisions compose public `Alert` | 17 Sep 2026 |
| G-recipe-graph | Recipe graph editor | Not a design-system concern; editor frozen (D4) | 17 Sep 2026 |
| G-button-link | Button used as navigation | Links use public `TextAction` with `href` | 17 Sep 2026 |

## Contract changes to keep in mind

| Change in the package | Application boundary |
| --- | --- |
| `CanvasText` removed | Banner text is edited in public fields beside the artwork. Do not skin a textarea to imitate it. |
| `Dialog`/`Drawer` require a string trigger | Existing externally opened dialogs keep the native fallback until R3. Do not wrap existing buttons in the new trigger. |
| `Button` is not polymorphic | Navigation uses `TextAction` with `href` or unstyled anchors; never click-only buttons for links. |
| `SelectionTile` removed | Selections compose `Surface` and a labelled pressed `Button`; the artwork is a preview. |

## Boundary

- Application code imports public components and `brutalist-design-system/styles.css` only. Existing local import paths in `src/components/design-system/` are adapters (see the audit); do not add new skins there.
- Product brand palettes, artwork fonts, slide layouts and export geometry are application data, not UI tokens.
- `npm run design-system:check` rejects a non-workspace install, package imports of application code or undeclared modules, deep imports, unreviewed product vocabulary, missing named exports, package token redefinitions, private component selectors and explicit `className`/`style` on directly imported upstream components. It cannot prove the effect of spread props, re-export chains or ancestor selectors; keep rendered checks for new routes and patterns.
