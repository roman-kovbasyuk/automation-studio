# Asset creation flow — user experience

**Status:** Target (draft for owner review) · **Updated:** 17 September 2026 · **Requirements:** FLOW-1, FLOW-4–6, FLOW-9, BRIEF-4, COPY-3, VIS-4, ESC-5 · **Governed by:** [FRONTEND.md](../../FRONTEND.md)

Screens, states, actions and wording for starting a flow, working through its four stages and handling escalations. Component names refer to the installed Brutalist package; gaps are listed at the end.

## Principles

1. **One active task.** The current stage has the space; other stages are one click away and keep their drafts.
2. **Always show state.** The header answers: what is happening, whose turn it is, what to do next.
3. **Explicit AI work.** Buttons that start generation name what they generate. Opening, navigating or refreshing never generates.
4. **Every problem has a way forward.** Each error names its cause and offers one primary recovery action.
5. **Results early.** Assets show outputs as soon as they exist, with checks, not after long forms.

## Navigation and routes

| Area | Route (target) | Current route |
| --- | --- | --- |
| Home | `/` | `/` |
| Start a flow | `/flows/new?type=banners` | `/mvp/new` |
| Flow stage | `/flows/:id/:stage` (`brief`, `copy`, `visuals`, `assets`) | `/mvp/campaign/:id?module=:module` |
| Escalations (designers) | `/escalations` | — |
| Brands, templates, settings, admin | unchanged | `/mvp/system`, `/mvp/templates`, `/mvp/settings`, `/mvp/admin` |

Old routes redirect to new ones once the new routes exist.

**Sidebar** (`SidebarPanel`): Create new; Home; Templates; Brands; Escalations (designers and admins, with count); recent flows (title, asset type icon, state).

## Start a flow

**Home** shows the brief composer directly; **Create new** shows asset types first. Both lead to the same form.

1. **Asset type:** Banner set or Deck. Other types are not shown until they work.
2. **Brand:** the user's default brand, changeable. Only automation-ready brands are selectable; others show why they are not ready (for example *Image style not confirmed*).
3. **Brief:** `PromptInput` with text and files (text, PDF, DOCX, PNG, JPEG, WebP; 25 MB total).
4. **Start** creates the flow and **immediately opens the Brief stage**. Upload and analysis progress appear there, never on Home.

If creation fails, the form keeps its content and shows the error inline. An uncertain creation result checks the flow list before offering to try again.

## Flow page

```text
┌──────────────────────────────────────────────────────────────┐
│ Title (editable)          Banner set · MSD v3                │
│ Status line: Copy ready — select at least one option  [Next] │
├──────────────────────────────────────────────────────────────┤
│ ① Brief ✓   ② Copy ●   ③ Visuals   ④ Assets                  │
├──────────────────────────────────────────────────────────────┤
│ Active stage                                                 │
└──────────────────────────────────────────────────────────────┘
```

- **Header:** title (`InlineText`), asset type (`Tag`), brand name and version, status line and its primary action.
- **Stage navigation:** `WorkflowSteps` with links. Step states: complete (check), current, available, locked (with reason in a tooltip and on focus), stale (warning marker).
- **Stage area:** one stage visible; visited stages stay mounted so drafts survive navigation.
- **Keyboard:** moving to a stage sends focus to its heading.

### Status line

| Situation | Status line | Primary action |
| --- | --- | --- |
| Analysing materials | Analysing your materials… | — |
| Brief ready for review | Review the brief and confirm | Confirm and write copy / Confirm and outline deck |
| Writing copy | Writing 5 copy options… | — |
| Copy ready | Select at least one option | Continue to visuals |
| Generating images | Creating images (2 of 3)… | — |
| Visuals ready | Images ready for 3 selected options | Continue to assets |
| Composing | Composing 18 banners… | — |
| Outputs checked | 14 ready to accept · 4 need attention | Accept all ready (14) |
| With designer | 2 banners with the designer — expected by Thu 10:00 | View escalation |
| Returned | The designer returned 2 banners | Review returned banners |
| Ready to download | 16 banners accepted | Download package |
| Stale input | Copy changed — 6 banners use the old text | Recompose affected banners |

## Stages

### Brief

| Region | Content | Components |
| --- | --- | --- |
| Materials | Files with status (processing, ready, failed with reason); add or remove | `FileList`, `FileDropzone` |
| Analysis | Progress while running; result when ready | `Spinner`, `Text` |
| Understanding | Summary and audience, editable with autosave | `InlineText` (autosave, gap R2) |
| Campaign | Goal, reach, age groups, gender | `Select`, `RadioGroup`, `Checkbox` |
| Visual keywords | Suggested keywords as removable tags; add with Enter | `TextField` + `Tag` (gap R7) |
| Copy found | *We found wording in your materials* with a preview; keep verbatim or create new | `RadioGroup`, `Dialog` |
| Recipe inputs | Only missing inputs, for example sizes or slide count | `MultiSelect`, `NumberStepper`, `Select` |
| Action | **Confirm and write copy** (or **Confirm and import copy**, **Confirm and outline deck**) | `Button` primary |

Confirming validates required answers inline before anything starts.

### Copy — banner set

- **Options** as cards (`Surface`): headline, body, offer, CTA; each editable inline; origin tag (*From your materials*, *Generated*, *Edited*); **Select** (`Checkbox`); **Delete** with undo.
- **Toolbar:** *5 options · 2 selected*; **Write 5 more** (appends, keeps edits); limit message at 30 options.
- **Generating:** existing cards stay usable; new cards appear as placeholders (`Skeleton`).
- **Action:** **Continue to visuals** (disabled until one option is selected, with the reason).

### Copy — deck

1. **Outline:** ordered list of slides: number, layout (`Select` with layout name and purpose), key message; **Move up/down** buttons, **Add slide**, **Remove**. Count against the requested slide count.
2. **Write slide text** fills every slide.
3. **Slide text:** one panel per slide with fields per slot, character and line counters, and a fit indicator (*Fits*, *Too long by 2 lines*). Fixed fields (page numbers) are read-only.
4. **Action:** **Continue to visuals**, or **Continue to assets** when no layout has an image slot.

### Visuals

- **Banner set:** one row per selected copy option: image preview, prompt (collapsed), status; **Regenerate this image**, **Upload instead**, **Use this image**.
- **Deck:** one row per image slot: slide number and layout, preview, same actions.
- Failed or blocked images explain the reason and keep the others. Uploads show type, size and minimum-dimension errors inline.
- **Action:** **Continue to assets** (disabled until every required image exists).

### Assets — banner set

**Setup** (collapsed after first composition):

- **Templates:** available templates for the brand as selectable cards; unavailable ones show the missing brand field.
- **Sizes:** from the brief, editable.
- **Total:** *3 options × 2 templates × 3 sizes = 18 banners* before composing.
- **Compose 18 banners.**

**Results:**

- Grouped by option (copy and image); filters by template, size and state (`SegmentedControl`, `Select`).
- **Card:** thumbnail at true aspect ratio; check summary (`StatusBadge`: *Ready* or *2 issues*); *AI review 8/10 (experimental)*; actions **Accept** or **Request design help**; **Details**.
- **Details** (`Drawer`, gap R3): large preview; each check with a plain explanation (*Headline needs 3 lines; the template allows 2*); repair history; AI review scores and concerns; revision history; **Edit copy for this banner** (applies an output override) or **Change image**.
- **Bulk:** **Accept all ready (14)**.
- **Package bar:** *16 accepted* → **Download package**.

### Assets — deck

- **Slide strip** with state per slide, a large preview of the selected slide and **Preview document** (all slides in order).
- Same checks, details and escalation actions per slide.
- **Download** requires every slide to be accepted; the button explains how many remain.

## Escalation

### Requester

- **Request design help** opens a `Dialog`: selected outputs, reason (prefilled with failed checks when offered), optional notes. **Send to designer.**
- Escalated cards show *With designer — expected by …* and cannot be accepted meanwhile. **Cancel request** is available until the designer returns work.
- Returned outputs show which designer returned them and the designer's note; **Accept** or **Ask for changes** (comment required).

### Designer

- **Escalations** page (`Table`): flow, brand, asset type, outputs, reason, age, due time, state; filter by state.
- **Escalation view:** outputs with failed checks and the requester's reason; Figma instructions (open the plugin in the destination file, import); import status; after editing, submit from the plugin. **Upload returned files** is the fallback when the plugin is unavailable.
- Designers see the flow read-only apart from escalation actions.

## Errors and recovery

| Situation | Message pattern | Primary action |
| --- | --- | --- |
| Source unreadable | *campaign-brief.pdf could not be read (password protected).* | Replace file |
| Analysis unavailable (access, quota) | *Analysis is unavailable: the AI quota for today is used up.* | Check again |
| Generation failed (known cause) | *Copy could not be written: the provider rejected the request.* | Try again |
| Generation blocked by safety | *The image request was blocked by the provider's safety rules.* | Edit prompt / Upload instead |
| Outcome uncertain | *Checking whether the images were created…* then, after the timeout, *We could not confirm the result.* | Check again / Mark as failed |
| Stale input | *Copy changed after these banners were composed.* | Recompose affected banners |
| Edit conflict | *Someone else changed this brief. Your draft is kept.* | Review changes |
| Permission denied | *Only requesters can accept banners.* | — |
| Connection lost | *Connection lost. Your draft is saved in this browser.* | Retry |

Never show internal status names (for example *Generation unknown*).

## Wording rules

- Buttons are verb + object: *Write 5 more*, *Compose 18 banners*, *Request design help*.
- Counts are exact; estimates say *about*.
- Use glossary terms: flow, brief, copy, visuals, assets, escalation. Do not show "campaign", "direction" or "module".

## Accessibility and responsiveness

- WCAG 2.2 AA. Every icon-only action has a label; status changes use polite live regions; errors use alerts next to their field.
- Reordering slides works with buttons and keyboard; no drag-only interactions.
- At 320 px width: stage navigation wraps within its region; result grids become one column; tables scroll inside a labelled region.
- Thumbnails keep their aspect ratio at every width.

## Brutalist mapping and gaps

| Need | Component | Gap |
| --- | --- | --- |
| Stage navigation with links | `WorkflowSteps` | R1 (`href` per step) |
| Autosaving summary | `InlineText` | R2 (autosave) |
| Details drawer and controlled dialogs | `Drawer`, `Dialog` | R3 (optional trigger) |
| Keyword tags | `TextField` + `Tag` | R7 (`TagInput`) |
| Everything else in this page | Public components listed above | none |

See the [gap list](../design-system/missing-components.md).

## Changes from the current interface

- Six campaign modules become four stages; Banners, Review and Distribute merge into Assets.
- Home no longer waits for upload and analysis.
- The Create new page hides asset types that do not work.
- The designer checklist and separate approval are removed for recipe-driven flows.

## Acceptance

- From Home, a banner set brief opens the Brief stage within one second of submission, with analysis progress visible.
- Every state in the status line table appears with its action in a fixture run.
- No page load, refresh or navigation creates a generation job (verified by request logs in tests).
- All flows are usable at 320 px width and by keyboard only.
