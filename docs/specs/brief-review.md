# Brief review

**Status:** Implemented, awaiting review · **Updated:** 17 September 2026 · **Requirements:** BRIEF-2–5, COPY-1, VIS-1, VIS-5, NFR-2, NFR-5, NFR-6 · **Decisions:** D36, D37, D39 · **Depends on:** M0, DS0 · **Plan:** [implementation plan](../plans/2026-09-17-brief-review.md)

How the Brief stage of a banner set turns one AI analysis into a confirmed brief: the AI prefills what it can, and the requester reviews it on one page.

## Summary

- One AI analysis reads the request and attached materials, structures the brief, finds existing copy and prefills settings and visual keywords.
- The requester edits the summary and audience in place and reviews up to three sections, all open at once: **Copy found** (only when copy was found), **Settings** and **Visual context**. One **Proceed to copy →** confirms the brief.
- On a confirmed brief the sections collapse into one-line summaries with **Edit**. Changes save automatically, except a change that would write new copy, which waits for **Proceed to copy →**.
- Values the AI filled are marked **Suggested** until changed. Settings without a basis stay empty; required ones must be answered.
- Found copy is always kept. The requester chooses whether to also write new copy options.
- Image prompts must use the visual keywords, the audience settings and the goal.
- Builds on the current briefing: the same analysis job and confirmation request, no database migration, and additive Brutalist changes (a tags variant of `RadioGroup`, `TagInput`, and hover elevation on tags).

## Scope

**In scope:** the banner set Brief stage from analysis to confirmation and later edits, the analysis and image prompt instructions, the copy choice, the `RadioGroup` tags variant and `TagInput`.

**Out of scope:**

- Deck briefs. M3 reuses the section pattern with its own sections.
- Web research and brand knowledge during analysis.
- Adding materials after analysis (unchanged), routed steps (R1), and the `InlineText` autosave option (R2): the review saves the whole confirmed brief instead.
- Saving an unconfirmed draft: it stays in the browser until **Proceed to copy →**.

## Decided choices

Agreed with the owner on 17 September 2026 while designing this page, and revised the same day after the owner used the first version, which had numbered steps opened one at a time.

| Question | Decision |
| --- | --- |
| What the analysis uses | Only the request and attached materials; no web research or brand knowledge |
| Prefilling | The AI fills settings it has a basis for, marked Suggested until changed; without a basis they stay empty |
| Settings | Age range from 18 to 65+, gender, goal and reach, with icons on the gender, goal and reach tags |
| Summary and audience | Text edited in place at the top of the stage, not in a panel, with the materials below them |
| Found copy | Always kept; the requester chooses whether to also write new copy |
| Visual context | Keywords shown right away; the entry is the last tag, and its placeholder says *Images are based on these keywords, your brief and your copy.* Keywords and settings drive image prompts |
| Sections | All open after analysis, without step numbers or per-section actions; one **Proceed to copy →** at the end. Settings and Visual context carry a large accent-coloured circle icon |
| Saving a confirmed brief | Sections start collapsed and **Edit** reveals one with a short animation. Changes save automatically; a change that would write new copy waits for **Proceed to copy →** |
| Explanatory lines | None: *Copy and visuals will need updating* and *Starts writing 5 copy options* were removed; requesters learn the behaviour over time |
| Motion | Interactive elements lift slightly on hover |
| Analysis progress | One AI call and one progress panel, without simulated per-stage progress |
| Delivery | After DS0, in one pull request that also adds the `RadioGroup` tags variant and `TagInput` to Brutalist |

## Experience

### Layout

Before confirmation:

```text
 Brief
 Evening courses in Norwegian for adults at the Oslo campus.        (edit in place)
 Adults in Oslo who want to learn Norwegian in the evening          (edit in place)
 Campaign sources
┌ Copy found ─────────────────────────────────────────────────────┐
│ Learn Norwegian together this winter · From brochure.pdf        │
│ Also write new copy options?  (No, use this copy) (Yes, also …) │
└─────────────────────────────────────────────────────────────────┘
┌ (o) Settings ───────────────────────────────────────────────────┐
│ Age range [Suggested]  18–24 ●━━━━━━━━━━━━━━━━━━━● 65+          │
│ Gender   (Men) (Women) (Both)       each tag with an icon       │
│ Goal     (Brand awareness) (Traffic) … (Other)                  │
│ Reach    (Local) (National) (Global)                            │
└─────────────────────────────────────────────────────────────────┘
┌ (o) Visual context ─────────────────────────────────────────────┐
│ Keywords [Suggested]  winter light ✕  tram stop ✕               │
│ ( Images are based on these keywords, your brief and your copy.)│
└─────────────────────────────────────────────────────────────────┘
                                              [Proceed to copy →]
```

After confirmation:

```text
 Copy found            "Learn Norwegian together this winter" · Use this copy only  [Edit]
 (o) Settings          25–44 · Women · Sign-ups · National                          [Edit]
 (o) Visual context    winter light, tram stop                                      [Edit]
```

### States

| State | What the requester sees |
| --- | --- |
| Analyzing | One panel, **Analyzing your materials**, with a spinner and one sentence naming the work: understanding the request, structuring the brief, finding existing copy, and suggesting settings and visual keywords. No per-item progress. The status line reads *Analyzing your materials…* |
| Analysis failed or uncertain | As after M0: the plain-language reason and a way forward (analyze again, or **Mark as failed** when the outcome is uncertain) |
| Ready | Summary and audience, the materials, then every section open (Copy found when copy was found, Settings and Visual context) and **Proceed to copy →** |
| Confirmed | Summary and audience, the materials, and every section collapsed into a summary with **Edit**, including Copy found when copy was found |
| Editing a confirmed brief | **Edit** reveals its section and becomes **Done**. Changes save automatically; a change that would write new copy shows **Discard changes** and **Proceed to copy →** below the sections instead |
| Read-only (no edit rights) | Summary and audience as plain text and every section collapsed, without Edit, actions or editable fields |

### Sections

Sections appear in this order, without numbers; without found copy there are two.

**Copy found** (only when the analysis found copy)

- Up to three found options as compact previews: headline, body, offer and CTA, leaving out empty fields. Each names its source (*From brochure.pdf*, or *From brochure.pdf and 1 more*) as a link that opens it. Wording read from an image (verification `needs_review`) shows *Check this wording*.
- With more than three options, **Show all (N)** opens the existing found copy dialog.
- The question **Also write new copy options?** as tags: *No, use this copy* and *Yes, also write new options*. Required.
- Collapsed: *"Spring sale: 20% off" +2 more · Use this copy only* or *· Also write new copy*. The first non-empty field stands in for an empty headline. Without an answer the summary ends with *Copy choice needed*.

**Settings** (header icon: settings)

- **Age range:** `RangeSlider` over *18–24*, *25–34*, *35–44*, *45–54*, *55–64* and *65+*. The full range means all ages.
- **Gender:** tags *Men*, *Women* and *Both*, with Mars, Venus and people icons.
- **Goal:** tags *Brand awareness* (eye), *Traffic* (trend), *Lead generation* (person with plus), *Sign-ups* (person with tick), *Sales* (cart) and *Other*, without an icon. Other reveals a required text field (*Describe the goal*, up to 500 characters). Required.
- **Reach:** tags *Local* (map pin), *National* (flag) and *Global* (globe). Required.
- Collapsed: age · gender · goal · reach, for example *25–44 · Women · Sign-ups · National*. Age reads *All ages*, *45+* or *25–44*; gender reads *Men*, *Women* or *Men and women*; Other shows its text shortened to 40 characters. Missing answers read *Goal needed* and *Reach needed*.

**Visual context** (header icon: image)

- Keywords as removable tags followed by a dashed, tag-shaped entry. Typing in it and pressing Enter adds a keyword; Backspace in an empty entry removes the last one; leaving the entry adds what was typed. Duplicates are ignored, up to 12 keywords of up to 60 characters each.
- The entry's placeholder is *Images are based on these keywords, your brief and your copy.* The entry grows into the rest of its row so the sentence fits; on very narrow screens it ends with an ellipsis.
- At 12 keywords the entry is hidden and the reason shows: *Up to 12 keywords. Remove one to add another.*
- Collapsed: the first four keywords and *+N more*, or *No keywords*.

### Proceed to copy

- **Proceed to copy →** checks everything, including summary and audience, which are required. Problems show next to their fields and focus moves to the first one; when that is a choice, focus goes to the choice itself.
- It then confirms the brief in one request and opens Copy. When new copy will be written (*Yes, also write new options*, or no found copy), copy writing starts after confirmation, as before.

### Suggested marks

A *Suggested* badge appears next to a block's label (copy question, age range, gender, goal, reach, keywords) while all of these hold:

- the brief is not confirmed;
- the block's value equals the analysis proposal;
- that value is not a default or empty: all ages, Both, no goal, no reach, no copy answer, no keywords;
- the block has not been changed in this session.

Summary and audience have no badge: they are the analysis's wording until the requester edits them.

### Changing a confirmed brief

- Sections start collapsed. **Edit** reveals one with a short fade and slide (none with reduced motion) and becomes **Done**. Summary and audience stay editable in place.
- Changes save about a second after the last one, without a button or message. Saving confirms the brief again without calling the AI, and the Brief stage stays open. The stepper's *Needs updating* marks show what went out of date.
- A change that would start writing copy is never saved automatically: a new copy setting while new copy is requested, or switching the question to *Yes, also write new options*. **Discard changes** and **Proceed to copy →** appear below the sections. **Proceed to copy →** confirms and opens Copy; **Discard changes** restores the confirmed brief and collapses the sections.
- Controls stay usable while a save runs. A change made during a save is kept and saved next.
- A failed automatic save shows its reason below the sections and keeps the change; the next change tries again.

### Wording

- Interface text follows the [glossary](../product/glossary.md): no *campaign* on screen, so the settings section is **Settings**.
- Interface text keeps the application's US spelling (*Analyze*); documentation prose stays British.
- The action uses the owner's wording: **Proceed to copy →**.

### Accessibility and responsiveness

- Each section is a region labelled by its heading. **Edit** and **Done** name their section (*Edit settings*, *Collapse settings*).
- Summary and audience are buttons (*Edit Summary*, *Edit Audience*) that open a text field; Enter saves and Escape cancels.
- Tag choices are native radio groups: one tab stop, and arrow keys move the selection. Their icons, and the section header icons, are hidden from screen readers.
- The age range uses two labelled native sliders that announce text values such as *25–34*.
- Suggested badges are text and are read with their label.
- Analysis progress is announced in a polite live region; errors are alerts next to their fields.
- Hover elevation and the reveal animation are off with reduced motion.
- At 320 px, tags wrap, the slider spans the width, the keyword entry takes a full row, and collapsed summaries wrap below the section title with Edit still visible.

## AI behaviour

### Analysis

Still one call (`analyseBrief` with sources). New and changed instructions:

1. Use only the request text and attached materials.
2. Fill a setting only when the materials state it or clearly imply it. Examples: *for pensioners* gives 65+; *at our Oslo campus* gives Local; a *Sign up now* button gives Sign-ups.
3. Never infer age or gender from stereotypes about the product, service or topic. A yoga course does not imply women.
4. **Age:** one continuous range of the fixed groups, or no limit.
5. **Gender:** men or women only when the materials target one; otherwise both.
6. **Goal:** one of the fixed goals; *Other* with a short description only when a stated goal fits none of them.
7. **Reach:** Local when the materials target a city or region, National for one country, Global for several countries.
8. **Copy question:** with found copy, *use this copy only* when the materials say to use the wording as it is, *also write new* when they ask for alternatives, otherwise empty. Without found copy, new copy is written and there is no question.
9. **Keywords:** five to seven short phrases describing what the images should show: subject, place, people, mood and light, style. Grounded in the materials and consistent with the suggested audience; fewer only when the materials genuinely support fewer than five distinct ideas, never invented beyond what is given; in the language of the request; no text, logos, brand names or names of people. Local scenery only when the materials support it (existing rule).
10. Summary, audience description and found copy extraction are unchanged.

**Normalisation.** When the analysis result is accepted, before it is stored, the server corrects what the model can get wrong without failing the analysis:

- a proposal with found copy and `create_new` gets an empty copy question; a proposal without found copy gets `create_new`;
- age groups become the smallest continuous range covering them, and all six groups become no limit.

### Image prompts

The visual directions request already contains the whole brief with its confirmed answers, and the keywords as `context.tags`. Only the instructions change:

- Every direction visibly uses the keywords. A keyword that would need text, logos or unsafe content is left out.
- People shown match the age range and gender. With all ages or both genders, choose what fits the brief.
- Places fit the reach and the materials.
- The scene fits the goal, for example someone starting or joining for a sign-up goal.
- Existing rules stay: no text or logos, and space left for layout.

Because the request data does not change, stored copy and visuals do not go out of date when this ships.

### Mock provider

The mock provider fills settings from explicit lines (`Age: 25-44`, `Gender: women`, `Goal: signups`, `Reach: local`, `Keywords: winter light, tram stop`, `Copy: keep` or `Copy: keep and write`) and from a short word list (for example *students*, *pensioners*, *sign up*). Briefs without them leave those settings empty, so tests and the isolated launcher cover both suggested and empty settings. Keywords are the exception: without an explicit `Keywords:` line the mock still fills five to seven, drawn from the brief's own words first and topped up deterministically from a fixed list only when the brief is too thin — so trying the flow without hand-authored cues still shows keywords filled in.

## Data and server

### Copy choice

`copyMode` gains `keep_and_create`.

| Found copy | `copyMode` | Found copy imported | Copy writing starts |
| --- | --- | --- | --- |
| Yes | `keep_original` | Once, as today | No |
| Yes | `keep_and_create` | Once, as today | On the first confirmation of these copy settings that asks for new copy |
| Yes | `create_new` | Rejected with `found_copy_not_kept` (422): *Found copy is always kept. Choose whether to also write new copy.* | — |
| No | `create_new` | — | On the first confirmation of these copy settings that asks for new copy, as today |
| No | `keep_original` or `keep_and_create` | Rejected with `no_supplied_copy` (422), as today | — |

- *These copy settings* means the existing copy key: summary, audience, age groups, gender, reach and goal. Only an earlier confirmation that started copy writing counts, so settings first confirmed with *No, use this copy* still start copy writing when later confirmed with *Yes, also write new options*.
- When found copy is imported with `keep_and_create`, the 30-option capacity check also counts the five new options. Copy writing keeps its own 30-option limit.
- Older confirmed briefs with found copy and `create_new` stay valid until edited. Editing one starts with an empty copy question.

### Suggested marks

Derived in the browser from the stored proposal and the draft, using the rules above. Nothing new is stored.

### Age range

- Shared helpers in `shared/briefingContracts.js` convert between a slider range (two indexes into the age groups) and age groups. The full range is an empty list, meaning no limit.
- The draft is normalised to one range when loaded, so what is shown is what gets confirmed.
- The groups run from *18–24* to *65+*; there is no under-18 group.
- Confirmed answers must have an empty list or one continuous range that is not all six groups. Stored drafts keep accepting older values.

### Drafts and saving

- Before confirmation, edits stay in the browser until **Proceed to copy →**. After confirmation they save automatically, apart from changes that would write copy. Leaving with unsaved changes shows the existing warning, and materials stay locked while there are unsaved changes, as today.
- Reopening an unconfirmed brief shows the stored proposal again.
- No new endpoints. The confirmation request and response are unchanged apart from the new `copyMode` value.
- After a new analysis the draft resets to the new proposal, and a notice says *Your materials changed, so the settings were suggested again.*
- Whether a change to a confirmed brief would write copy is decided in the browser with the shared `classifyBriefChange` check, plus a switch of the copy question into a writing mode, because the copy key leaves `copyMode` out. The server still decides: it skips copy writing when these copy settings already started it, and Copy then shows the existing options.
- An automatic save runs as the brief's confirm operation. It does not lock the review, and the review adopts the input key its own save produced, so a change made during a save is saved next rather than rejected as a source change.

## Components

### Brutalist (after DS0)

- `RadioGroup` gets `variant: 'default' | 'tags'`. The tags variant draws each option as a wrapping, tag-shaped native radio, and the selected option uses the accent tone. Keyboard and screen reader behaviour stay native. `instructions`, `error`, `required` and `customOption` work in both variants.
- Package tests (keyboard, selection, error, custom option), an accessibility check and a documentation example; a patch version, because the change is additive (D25).
- `RangeSlider` handles now share one scale: both span the full range and are clamped so they never cross. Building this page showed that each handle's range stopped at the other, which drew the handles on different scales and locked the upper handle at the maximum (for example with 65+).
- `TagInput` closes gap R7: free-text tags with a dashed, tag-shaped entry inline with the tags that grows into the rest of its row. Typed text is trimmed, deduplicated ignoring case and limited in length.
- Removable `Tag`s and `RadioGroup` tag choices lift on hover and focus, like `Button` and `Panel`.
- Versions 0.1.1 (tags variant, `RangeSlider`) and 0.1.2 (`TagInput`, hover elevation). No new gap entry is needed, because no fallback ships.

### Application

In `src/studio/campaign/modules/brief/`:

| Unit | Purpose |
| --- | --- |
| `briefReviewModel.js` | Pure logic: visible sections, required-field checks from the confirmation schema, collapsed summaries, suggested marks, the copy-writing rule and the tag icons |
| `BriefReview.jsx` | Renders summary and audience with `InlineText`, the materials, the sections and **Proceed to copy →**; validation focus, open sections and automatic saving |
| `BriefStep.jsx` | Section container built on `Panel`: an optional circle icon, and a collapsed summary with Edit or the open content |
| `FoundCopyStep.jsx` | Previews with source links, Show all through `FoundCopyDialog`, and the copy question |
| `SettingsStep.jsx` | Age `RangeSlider`; tag `RadioGroup`s with icons for gender, goal (with Other) and reach; `Badge` for Suggested |
| `VisualContextStep.jsx` | Keywords through `TagInput` |
| `AnalysisProgress.jsx` | The analyzing panel |

- `BriefModule.jsx` shows `AnalysisProgress` while analysis runs and `BriefReview` once a proposal exists, passing the materials in below summary and audience. It keeps the draft across refreshes and keeps a change made during a save.
- `ModuleHost.jsx` shows the Brief stage without the outer card (`WorkflowModuleFrame` with `bare`), because the sections are panels themselves.
- `workflowCoordinator.js` opens Copy after the first confirmation, and after later saves only when the response starts copy writing (`initialCopy: 'offer_generation'`).
- `ReviewedBriefView.jsx` and `BriefQuestionsView.jsx` are removed and their tests replaced.
- `brief.css` keeps layout only, using tokens and no private Brutalist classes.
- Shared and server changes: `shared/briefingContracts.js` (copy mode, age helpers and range rule), `briefingService.js` (copy choice table), proposal normalisation next to `verifyBriefingProposal`, instructions in `geminiProvider.js`, `mockProvider.js`, test fixtures, and the prototype API in `src/prototype/api/flow.js`.

## Errors and edge cases

| Situation | What the requester sees | Way forward |
| --- | --- | --- |
| Analysis fails or its outcome is unknown | The M0 plain-language reason | Analyze again; **Mark as failed** when uncertain |
| Materials change during review | Materials are locked while there are unsaved changes. After a new analysis: *Your materials changed, so the settings were suggested again.* | Review the sections again |
| A check fails on **Proceed to copy →** | The problem next to its field, with focus on the first one | Fix it and proceed |
| Materials changed before confirming (`brief_source_changed`) | The existing message next to the button | Analyze again |
| Edit conflict or interrupted connection | The existing messages next to the button; the draft is kept | Check the latest state and try again |
| No room for found copy (`copy_capacity_exceeded`) | Focus moves to Copy found and the existing message shows below the sections | Delete copy options in Copy, then proceed again |
| Copy writing fails after confirming | The brief stays confirmed; Copy shows its own error | Retry in Copy |
| An automatic save fails | The reason below the sections; the change stays in the draft | Make another change to try again, or reload |
| Wording read from an image | *Check this wording* on its preview | Review it in Copy |
| Other goal without text | *Describe the goal.* | Enter the goal |
| 12 keywords | The entry is hidden: *Up to 12 keywords. Remove one to add another.* | Remove one first |
| No edit rights | Collapsed sections without Edit or actions | — |

## Testing

- **Unit:** age helpers and the range rule; copy choice combinations in the schemas; `briefReviewModel` (visible sections, required-field checks, summaries, suggested marks, the copy-writing rule including a switch of the copy question); proposal normalisation.
- **Server:** confirming with `keep_and_create` imports found copy and returns `offer_generation`; settings first kept with `keep_original` still write copy when confirmed with `keep_and_create`; the capacity check counts five new options; `create_new` with found copy is rejected; older confirmed briefs still load.
- **AI instructions:** analysis instructions include the basis and no-stereotype rules; direction instructions reference the keywords, age range, gender, reach and goal; the mock provider's lines and words.
- **Components:** every section open before confirmation with one action; Copy found hidden without found copy; checks and focus; collapse after confirming, including while the stage stays mounted; Edit and Done; Suggested marks clear on change; automatic saving, including no retry after a failure and controls staying usable during a save; a copy-writing change waiting for the explicit action and Discard; a change made during a save saved next; read-only view.
- **Brutalist:** `RadioGroup` tags variant and `TagInput` tests, hover rules, and the package `verify`.
- **End to end:** `npm run test:workflow`, plus a browser check with the isolated launcher at desktop width and at 320 px.
- **Prompt quality:** running real briefs through Vertex AI EU needs the local API, which writes to the demo database, so the owner is asked first.

## Documentation updates

Made in the implementation pull request:

- **Decision D39**: *Brief review is AI-prefilled and reviewed on one page. One analysis fills the settings it has a basis for and marks them as suggested; the requester reviews them in up to three sections shown together and confirms once; a confirmed brief saves changes automatically unless they would write new copy; found copy is always kept, with optional new copy; image prompts use the keywords and audience settings.*
- **PRD:** BRIEF-3 becomes *The analysis prefills the settings it has a basis for and marks them as suggested; the requester reviews every setting and answers those left empty.* BRIEF-5 becomes *Found copy is always kept; the requester chooses whether to also write new copy options.*
- **[Asset creation flow UX](asset-creation-flow-ux.md):** the Brief region table points here; the status line row for a brief ready for review, in the interface's US spelling; the Brutalist mapping (`RadioGroup` tags variant, `RangeSlider`, `TagInput`).
- **[Design-system gap list](../design-system/missing-components.md):** G-keyword-input (R7) closed.
- **[Recipes](recipes.md):** the `copyMode` values; `importSuppliedCopy` runs when `{ analysis: foundCopy, exists: true }`; the `confirmBrief` questions.
- **Roadmap:** a row for this work after DS0.

## Delivery

1. M0 ([pull request #2](https://github.com/roman-kovbasyuk/automation-studio/pull/2)) merges.
2. DS0 imports Brutalist as a workspace package ([design system integration](design-system-integration.md#import-from-the-standalone-repository)).
3. One pull request into `v3` with everything on this page. The AI and copy choice work can start before DS0 merges; the interface builds on DS0.
