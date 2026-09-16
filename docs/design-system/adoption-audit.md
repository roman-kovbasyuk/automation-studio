# Brutalist adoption audit

**Status:** Current · **Audited:** 17 September 2026 · **Installed package:** `brutalist-design-system` `0.1.0-atomic.0`, commit `50c322c` (84 exports)

How much of the application UI uses Brutalist, where local code remains, and what to do about it. Follows [design system integration](../specs/design-system-integration.md).

## Method and limits

- **Reachability:** static import graph from `src/main.jsx`, following static and dynamic imports. Files not reached are listed as unreachable. Test files and test helpers are excluded. A file reached only through tests or scripts would appear unreachable; confirm before deleting.
- **Native controls:** `<input>`, `<select>`, `<textarea>`, `<button>`, `<dialog>`, `<table>`, `<details>` and `<progress>` in reachable files.
- **API fit:** checked against the installed type declarations. Fit is a candidate until verified in the running application.
- Not covered: rendered visual comparison, accessibility testing, CSS inside reachable pages beyond the component layer.

## Summary

| Measure | Result |
| --- | --- |
| Brutalist exports used by the application | about 39 of 84 |
| Reachable application source files | 119 |
| Unreachable non-test source files | 73 files, about 6,400 lines |
| Reachable files with native controls | 9 |
| Gap list entries re-assessed | 15: 3 closed or resolved, 2 now adoptable, 10 still open (1 lower priority) |

## Adopt now

No upstream change needed. Each item needs a focused change and browser verification.

| # | Where | Today | Use instead | Notes |
| --- | --- | --- | --- | --- |
| A1 | `src/studio/brand/ColorTokenEditor.jsx` | Native `<input type="color">` | `ColorPicker` (`label`, `value`, `onChange`, `presets`) | `ColorPicker` has no `disabled`/read-only prop; request R6 for read-only brands |
| A2 | `src/studio/campaign/modules/review/ReviewView.jsx`, `src/studio/admin/RecipeEditor.jsx`, `src/prototype/PrototypeApp.jsx` | Native `<details>` disclosure | `Accordion` (`label`, `items`, `multiple`) | Recipe editor is frozen; do it last or skip |
| A3 | `molecules/AsyncStatus.jsx` | `<p role="status">` text | `Spinner` with visible `Text`, or `Alert` for settled states | Keep one live region per operation |
| A4 | `molecules/FormField.jsx` (custom control slot) | Local `<label>`, note paragraph and `form-field.css` | `Label` (with `hint`) and `Hint` (`tone="danger"` for errors) | Removes a local skin |
| A5 | `organisms/OperationsLayout.jsx` (`OperationsNavigation`) | Local `<nav>` with local classes | `NavigationList` | Layout container itself stays app-owned |
| A6 | Remaining `PromptComposer` consumers: `BriefView`, `BrandAiComposer`, `MaterialsStep`, `PresentationLibrary` (unreachable) | Local composer with hidden file input and `prompt-composer.css` | `PromptInput` (as Home already does through `AtomicPromptInputAdapter`) | Confirm file-only submission and draft retention per consumer |
| A7 | `src/studio/campaign/modules/visuals/VisualsView.jsx` | Hidden native file input behind public buttons | `FileDropzone` (has `state`, `progress`, `error`, `onRetry`) or `AttachmentArea` | Upload UX decision for the Visuals stage |

## Unreachable code

Not reachable from the application entry point. Candidates for removal in roadmap milestone M0.

| Area | Files |
| --- | --- |
| `src/mvp/` | Entire earlier MVP: shell, sidebar, stages, contracts, fixtures, gateway, workflow rules (11 files) |
| `src/components/` (outside the design-system folder) | `AppShell`, `AssetWorkspace`, `BannerWorkspace`, `BannerPreview`, `CopyWorkspace`, `CostDialog`, `ProcessingScreen`, `ReviewWorkspace`, `StepRail`, `TemplateCard`, `VisualArtwork` |
| `src/components/ui/` | 13 shadcn components (`sidebar.jsx` alone is 718 lines) |
| `src/screens/` | `DashboardScreen`, `DesignerReviewScreen`, `TemplatesScreen`, `WorkflowScreen` (864 lines) |
| `src/domain/`, `src/data/`, `src/hooks/`, `src/lib/` | Prototype domain logic and fixtures |
| `src/studio/` | `BannerStage`, `BrandDesignSystems`, `CampaignOverview`, `CampaignTimeline`, `CopyStage`, `PresentationLibrary`, `ReviewStage`, `VisualStage`, `exportAnimation.js`, `admin/AssetWorkflowScaffold` |
| `src/studio/campaign/` | `BriefingClarificationWizard`, `CopyManualEntryView`, `workspaceFixtures.js` (may be test-only) |
| `src/components/design-system/` | Flat re-exports (`AppButton`, `PillTabs`, `PromptComposer`, `WorkflowSteps`), `atoms/Switch`, `atoms/TextAction`, `atoms/TokenChip`, `atoms/TokenCopyTarget`, `atoms/UpdatedText`, `molecules/FactGrid`, `molecules/PillTabs`, `molecules/SelectionTile`, `organisms/MediaWorkflowCard`, `organisms/SettingsPanel` |

The dependencies `radix-ui`, `class-variance-authority`, `clsx` and `@tailwindcss/vite` may only serve unreachable shadcn code; check before removing them.

## Local component layer (reachable)

| Component | Kind | Action |
| --- | --- | --- |
| `compatibility.jsx`: `AppButton`, `SelectField`, `SwitchField`, `FileDropzone`, `StatusBadge`, `Alert`, `SidebarPanel`, `Menu`, `TagButton`, `FormSection`, `ActionCard`, `SelectionTile`, `AITaskStatus` | Prop and callback adapters over public components | Keep while consumers migrate; replace call sites with direct imports over time |
| `compatibility.jsx`: `Dialog`, `Drawer` | Native `<dialog>` for dialogs opened from outside or with a custom trigger | Blocked by G-dialog-external-open (request R3) |
| `molecules/WorkflowSteps.jsx` (brand setup wizard) | Local ordered list of links with `workflow-steps.css` | The campaign page already uses the public `WorkflowSteps`. Blocked by G-routed-steps (request R1) |
| `molecules/InlineText.jsx` → `AutoSaveSummary` | Native textarea and button for pause-based autosave | Blocked by G-autosave-inline-text (request R2) |
| `molecules/DecisionNotice.jsx`, `molecules/EmptyState.jsx`, `organisms/WorkflowModuleFrame.jsx` | Thin compositions of public `Alert`, `EmptyState`, `Surface` | Keep |
| `molecules/AsyncStatus.jsx`, `molecules/FormField.jsx`, `organisms/OperationsLayout.jsx` | Local markup or skins | A3, A4, A5 |
| `organisms/PromptComposer.jsx`, `organisms/PromptInputBlock.jsx`, `organisms/AtomicPromptInputAdapter.jsx` | Local composer and adapter | A6 |
| `src/studio/SidebarAccountMenu.jsx` | Native buttons for the profile menu | Blocked by G-sidebar-profile-trigger (request R4) |

## Gap list re-assessment

Against commit `50c322c`. The refreshed list is in [missing components](missing-components.md).

| Gap | Previous entry | Result |
| --- | --- | --- |
| G-autosave-inline-text | Autosaving brief summary | **Open.** `InlineText` saves on commit (`onSave`, `sourceKey`) but has no pause-based autosave or composition handling. |
| G-color-picker | Brand palette picker | **Available.** `ColorPicker` exists → A1. |
| G-attachment-selection | Hidden file inputs | **Available in part.** `FileDropzone` and `AttachmentArea` exist → A6, A7. |
| G-routed-steps | Routed workflow navigation | **Open.** `WorkflowSteps`, `VerticalStepper` and `DotStepper` select steps with `onChange`; none renders links. |
| G-empty-decision | Empty and decision regions | **Closed.** Public `EmptyState` is used; decisions compose `Alert`. |
| G-recipe-graph | Recipe graph | **Closed (not a design-system concern).** The graph editor is frozen (D4). |
| G-sidebar-project-metadata | Sidebar project metadata | **Open.** `SidebarPanel` projects have `title`, `href`, `pinned`, `current`, `actions` only. |
| G-sidebar-primary-disabled | Sidebar primary action permissions | **Open.** `primaryAction` has no `disabled`. |
| G-sidebar-shell-border | Sidebar shell border placement | **Open.** No border or shell variant. |
| G-sidebar-profile-trigger | Sidebar profile trigger | **Open.** `account` accepts `label`, `actions`, `onAction` only. |
| G-keyword-input | Inline keyword input | **Changed.** The brief now uses public `TextField` plus removable `Tag`s. `MultiSelect` and `Combobox` accept only fixed options. A free-text tag input is still a generic gap, lower priority. |
| G-dialog-external-open | Dialog trigger contract | **Open.** `Dialog` supports controlled `open` but requires a string `trigger`. |
| G-canvas-text | CanvasText removed | **Open, deferred.** Banner text is edited in fields beside the artwork. |
| G-button-link | Button is not a link | **Resolved.** Links use `TextAction` with `href`. |
| G-icon-bundle-size | Full icon registry in bundle | **Open.** Package-level tree-shaking. |

## Proposed change requests

Ordered by need for the asset creation flow (roadmap M2). All additive.

| ID | Component | Change | Unblocks |
| --- | --- | --- | --- |
| R1 | `WorkflowSteps` | Optional `href` per step rendering a link; keep `aria-current`, disabled and complete states | G-routed-steps; four-stage flow navigation |
| R2 | `InlineText` | Optional autosave after a pause and on blur, respecting text composition (IME), with save status and failed-save retry | G-autosave-inline-text |
| R3 | `Dialog`, `Drawer` | Make `trigger` optional when `open` and `onOpenChange` are supplied | G-dialog-external-open |
| R4 | `SidebarPanel` | Account trigger slot (avatar, name, placement) | G-sidebar-profile-trigger |
| R5 | `SidebarPanel` | `primaryAction.disabled`; project `icon` and secondary label; shell border variant | G-sidebar-primary-disabled, G-sidebar-project-metadata, G-sidebar-shell-border |
| R6 | `ColorPicker` | `disabled` / read-only state | A1 for read-only brands |
| R7 | New `TagInput` | Free-text tags with add on Enter, remove, limits | G-keyword-input |
| R8 | Package | Per-icon imports or tree-shakeable icon registry | G-icon-bundle-size |

R3 and R5 are grouped by component when submitted.
