# Application component adoption

**Status:** Current · **Updated:** 20 September 2026

Remaining application-owned compositions and adoption opportunities after the M0 and phase-preparation removals. The detachable Brutalist workspace owns generic components; [FRONTEND.md](../../FRONTEND.md) and the [integration specification](../specs/design-system-integration.md) govern changes.

## Remaining opportunities

These are live consumers, not dead modules. Migrate them only when replacement behavior is verified.

| ID | Live consumer | Candidate | Required preservation |
| --- | --- | --- | --- |
| A1 | `src/studio/brand/ColorTokenEditor.jsx` native color input | Public `ColorPicker` | Read-only and disabled states; token confirmation/evidence |
| A2 | Review, admin recipe editor and offline-prototype disclosures | Public `Accordion` | Expanded content, keyboard behavior and current actions; frozen editor is low priority |
| A3 | `molecules/AsyncStatus.jsx` | Public `Spinner` and `Text`, or settled-state `Alert` | A single useful live region per operation |
| A4 | `molecules/FormField.jsx` custom-control slot | Public `Label` and `Hint` | Label/control association and error descriptions |
| A5 | `organisms/OperationsLayout.jsx` navigation | Public `NavigationList` | URLs, current item, keyboard access and layout |
| A6 | `PromptComposer` in Brief, brand AI and brand materials | Public `PromptInput` | File-only submission, attachments, draft retention, read-only and busy states |
| A7 | Visuals hidden image input | Public `FileDropzone` or `AttachmentArea` | File validation, explicit upload, retry and image provenance |

## Retained application boundaries

- `compatibility.jsx` translates callbacks/props for live consumers. Its unused `FormSection`, `TagButton` and `SelectionTile` exports were removed during preparation.
- Native controlled `Dialog`/`Drawer` remain until the public trigger contract covers externally opened dialogs.
- `InlineText` adapts draft identity and navigation state. `AutoSaveSummary` remains for legacy analyzed-brief rendering; the current reviewed brief has its own confirmation-aware save policy.
- Brand wizard links remain application navigation; replacing them must preserve actual links, not just click callbacks.
- Prompt, module frame, empty-state and decision compositions retain domain behavior around public components.
- `TagInput` is already public and used by the Brief visual-context section. R7 is closed.

See the [gap list](missing-components.md) for the remaining R1–R6/R8 contracts. Do not copy removed component code back into application adapters to bypass a missing package capability.

## Removed history

The earlier unreachable screen inventory, obsolete extraction maps and dated verification checkpoints were removed once their replacements existed. Git history retains them. [Preparation review](../engineering/phase-preparation-review.md) records the current deletion scope and evidence; old counts do not describe this checkout.
