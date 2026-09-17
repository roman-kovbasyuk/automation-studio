# Brief review

**Status:** Implemented, awaiting review · **Updated:** 17 September 2026 · **Requirements:** BRIEF-2–5, COPY-1, VIS-1, VIS-5, NFR-2, NFR-5, NFR-6 · **Decisions:** D36, D37, D39 · **Depends on:** M0, DS0 · **Plan:** [implementation plan](../plans/2026-09-17-brief-review.md)

How the Brief stage of a banner set turns one AI analysis into a confirmed brief: the AI prefills what it can, and the requester reviews it in up to three steps.

## Summary

- One AI analysis reads the request and attached materials, structures the brief, finds existing copy and prefills settings and visual keywords.
- The requester reviews **What we understood** and up to three steps, one open at a time: **Copy found** (only when copy was found), **Settings** and **Visual context**. Finished steps collapse into a one-line summary with **Edit**.
- Values the AI filled are marked **Suggested** until changed. Settings without a basis stay empty; required ones must be answered.
- Found copy is always kept. The requester chooses whether to also write new copy options.
- Image prompts must use the visual keywords, the audience settings and the goal.
- Builds on the current briefing: the same analysis job and confirmation request, no database migration, and one additive Brutalist change (a tags variant of `RadioGroup`).

## Scope

**In scope:** the banner set Brief stage from analysis to confirmation, the analysis and image prompt instructions, the copy choice, and the `RadioGroup` tags variant.

**Out of scope:**

- Deck briefs. M3 reuses the step pattern with its own steps.
- Web research and brand knowledge during analysis.
- Adding materials after analysis (unchanged), routed steps (R1), autosave (R2) and a tag input component (R7).

## Decided choices

Agreed with the owner on 17 September 2026 while designing this page.

| Question | Decision |
| --- | --- |
| What the analysis uses | Only the request and attached materials; no web research or brand knowledge |
| Prefilling | The AI fills settings it has a basis for, marked Suggested until changed; without a basis they stay empty |
| Settings step | Age range, gender, goal and reach. **What we understood** (summary and audience) sits above the steps and stays editable |
| Found copy | Always kept; the requester chooses whether to also write new copy |
| Visual context step | Keywords; the collapsed steps above it serve as the recap. Keywords and settings drive image prompts |
| Step behaviour | Stacked, one open at a time; finished steps collapse into summaries with Edit |
| Analysis progress | One AI call and one progress panel, without simulated per-stage progress |
| Delivery | After DS0, in one pull request that also adds the `RadioGroup` tags variant to Brutalist |

## Experience

### Layout

```text
┌ What we understood ───────────────────────────────────────────┐
│ Summary (editable)                                            │
│ Audience (editable)                                           │
└───────────────────────────────────────────────────────────────┘
 1 Copy found      "Spring sale: 20% off" +2 more · Also write new copy  [Edit]
 2 Settings        25–44 · Women · Sign-ups · National                   [Edit]
┌ 3 Visual context ──────────────────────────────── Step 3 of 3 ┐
│ Keywords [Suggested]   winter light ✕   tram stop ✕   + Add   │
│ Images are based on these keywords, your brief and your copy. │
│ Starts writing 5 copy options.                                │
│                          [Finalize brief & proceed to copy →] │
└───────────────────────────────────────────────────────────────┘
 Materials
```

### States

| State | What the requester sees |
| --- | --- |
| Analyzing | One panel, **Analyzing your materials**, with a spinner and one sentence naming the work: understanding the request, structuring the brief, finding existing copy, and suggesting settings and visual keywords. No per-item progress. The status line reads *Analyzing your materials…* |
| Analysis failed or uncertain | As after M0: the plain-language reason and a way forward (analyze again, or **Mark as failed** when the outcome is uncertain) |
| Ready | **What we understood** and the first step open: Copy found when copy was found, otherwise Settings. Later steps stay hidden until reached |
| Reviewing | One step open. Steps already reached are collapsed summaries with Edit |
| Confirmed | **What we understood** and every step collapsed, including Copy found when copy was found |
| Read-only (no edit rights) | **What we understood** and every step collapsed, without Edit, actions or editable fields |

### Steps

Steps are numbered in the order shown; without found copy there are two. An open step shows *Step n of N*.

**Copy found** (only when the analysis found copy)

- Up to three found options as compact previews: headline, body, offer and CTA, leaving out empty fields. Each names its source (*From brochure.pdf*, or *From brochure.pdf and 1 more*) as a link that opens it. Wording read from an image (verification `needs_review`) shows *Check this wording*.
- With more than three options, **Show all (N)** opens the existing found copy dialog.
- The question **Also write new copy options?** as tags: *No, use this copy* and *Yes, also write new options*. Required.
- Action: **Proceed to settings →**.
- Collapsed: *"Spring sale: 20% off" +2 more · Use this copy only* or *· Also write new copy*. The first non-empty field stands in for an empty headline. Without an answer the summary ends with *Copy choice needed*.

**Settings**

- **Age range:** `RangeSlider` over *Under 18*, *18–24*, *25–34*, *35–44*, *45–54*, *55–64* and *65+*. The full range means all ages.
- **Gender:** tags *Men*, *Women* and *Both*.
- **Goal:** tags *Brand awareness*, *Traffic*, *Lead generation*, *Sign-ups*, *Sales* and *Other*. Other reveals a required text field (*Describe the goal*, up to 500 characters). Required.
- **Reach:** tags *Local*, *National* and *Global*. Required.
- Action: **Proceed to visual context →**.
- Collapsed: age · gender · goal · reach, for example *25–44 · Women · Sign-ups · National*. Age reads *All ages*, *Under 35*, *45+* or *25–44*; gender reads *Men*, *Women* or *Men and women*; Other shows its text shortened to 40 characters. Missing answers read *Goal needed* and *Reach needed*.

**Visual context**

- Keywords as removable tags and an add field: Enter adds, duplicates are ignored, up to 12 keywords of up to 60 characters each. At 12 the field is disabled with the reason.
- Hint: *Images are based on these keywords, your brief and your copy.*
- Action: **Finalize brief & proceed to copy →**.
- Collapsed: the first four keywords and *+N more*, or *No keywords*.

### Moving between steps

- **Proceed** checks only its own step. Problems show next to their fields and focus moves to the first one. When the step is complete it collapses, the next step opens and focus moves to its heading.
- **Edit** opens that step and collapses the open one without checking it; its summary shows any missing answers. **Proceed** always opens the next step in order.
- **Finalize** checks everything, including **What we understood**, where summary and audience are required. A problem reopens the step that owns it, or focuses the field above the steps.

### Suggested marks

A *Suggested* badge appears next to a block's label (copy question, age range, gender, goal, reach, keywords) while all of these hold:

- the brief is not confirmed;
- the block's value equals the analysis proposal;
- that value is not a default or empty: all ages, Both, no goal, no reach, no copy answer, no keywords;
- the block has not been changed in this session.

Summary and audience have no badge: the heading **What we understood** already says where they come from.

### Finalize and save

- **Finalize** confirms the brief in one request and opens Copy. When new copy will be written (*Yes, also write new options*, or no found copy), a line above the button says *Starts writing 5 copy options.* and copy writing starts after confirmation, as today.
- **Confirmed briefs:** **Edit** opens a step with **Save changes** and **Cancel** instead of its action. Changing **What we understood** shows the same two buttons below it. **Save changes** confirms every unsaved change in the brief; **Cancel** discards them all and collapses the open step.
- Before saving, a warning names what will go out of date: *Copy and visuals will need updating* or *Visuals will need updating*. When the save starts copy writing, it also says *Starts writing 5 copy options.*
- After **Save changes** the Brief stage stays open with every step collapsed, unless copy writing started, which opens Copy.

### Wording

- Interface text follows the [glossary](../product/glossary.md): no *campaign* on screen, so the second step is **Settings**.
- Interface text keeps the application's US spelling (*Analyze*, *Finalize*); documentation prose stays British.
- The step actions use the owner's wording: **Proceed to settings →**, **Proceed to visual context →** and **Finalize brief & proceed to copy →**.

### Accessibility and responsiveness

- Each step is a region labelled by its heading. **Edit** buttons name their step (*Edit settings*).
- Tag choices are native radio groups: one tab stop, and arrow keys move the selection.
- The age range uses two labelled native sliders that announce text values such as *25–34*.
- Suggested badges are text and are read with their label.
- Analysis progress and step changes are announced in a polite live region; errors are alerts next to their fields.
- At 320 px, tags wrap, the slider spans the width, and collapsed summaries wrap below the step title with Edit still visible.

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
9. **Keywords:** up to seven short phrases describing what the images should show: subject, place, people, mood and light, style. Grounded in the materials and consistent with the suggested audience; in the language of the request; no text, logos, brand names or names of people. Local scenery only when the materials support it (existing rule).
10. Summary, audience description and found copy extraction are unchanged.

**Normalisation.** When the analysis result is accepted, before it is stored, the server corrects what the model can get wrong without failing the analysis:

- a proposal with found copy and `create_new` gets an empty copy question; a proposal without found copy gets `create_new`;
- age groups become the smallest continuous range covering them, and all seven groups become no limit.

### Image prompts

The visual directions request already contains the whole brief with its confirmed answers, and the keywords as `context.tags`. Only the instructions change:

- Every direction visibly uses the keywords. A keyword that would need text, logos or unsafe content is left out.
- People shown match the age range and gender. With all ages or both genders, choose what fits the brief.
- Places fit the reach and the materials.
- The scene fits the goal, for example someone starting or joining for a sign-up goal.
- Existing rules stay: no text or logos, and space left for layout.

Because the request data does not change, stored copy and visuals do not go out of date when this ships.

### Mock provider

The mock provider fills settings from explicit lines (`Age: 25-44`, `Gender: women`, `Goal: signups`, `Reach: local`, `Keywords: winter light, tram stop`, `Copy: keep` or `Copy: keep and write`) and from a short word list (for example *students*, *pensioners*, *sign up*). Briefs without them leave settings empty, so tests and the isolated launcher cover both suggested and empty settings.

## Data and server

### Copy choice

`copyMode` gains `keep_and_create`.

| Found copy | `copyMode` | Found copy imported | Copy writing starts |
| --- | --- | --- | --- |
| Yes | `keep_original` | Once, as today | No |
| Yes | `keep_and_create` | Once, as today | On the first confirmation of these copy settings |
| Yes | `create_new` | Rejected with `found_copy_not_kept` (422): *Found copy is always kept. Choose whether to also write new copy.* | — |
| No | `create_new` | — | On the first confirmation of these copy settings, as today |
| No | `keep_original` or `keep_and_create` | Rejected with `no_supplied_copy` (422), as today | — |

- *These copy settings* means the existing copy key: summary, audience, age groups, gender, reach and goal.
- For `keep_and_create`, the 30-option capacity check also counts the five new options.
- Older confirmed briefs with found copy and `create_new` stay valid until edited. Editing one starts with an empty copy question.

### Suggested marks

Derived in the browser from the stored proposal and the draft, using the rules above. Nothing new is stored.

### Age range

- Shared helpers in `shared/briefingContracts.js` convert between a slider range (two indexes into the age groups) and age groups. The full range is an empty list, meaning no limit.
- The draft is normalised to one range when loaded, so what is shown is what gets confirmed.
- Confirmed answers must have an empty list or one continuous range that is not all seven groups. Stored drafts keep accepting older values.

### Drafts and saving

- Step progress and edits stay in the browser until **Finalize** or **Save changes**. Leaving with unsaved changes shows the existing warning, and materials stay locked while there are unsaved changes, as today.
- Reopening an unconfirmed brief starts again at the first step, from the stored proposal.
- No new endpoints. The confirmation request and response are unchanged apart from the new `copyMode` value.
- After a new analysis the draft resets to the new proposal, and a notice says *Your materials changed, so the settings were suggested again.*
- The out-of-date warning and the *Starts writing* line use the shared `classifyBriefChange` check in the browser. The server still skips copy writing when the same copy settings were confirmed before; Copy then shows the existing options.

## Components

### Brutalist (after DS0)

- `RadioGroup` gets `variant: 'default' | 'tags'`. The tags variant draws each option as a wrapping, tag-shaped native radio, and the selected option uses the accent tone. Keyboard and screen reader behaviour stay native. `instructions`, `error`, `required` and `customOption` work in both variants.
- Package tests (keyboard, selection, error, custom option), an accessibility check and a documentation example; a patch version, because the change is additive (D25).
- `RangeSlider` handles now share one scale: both span the full range and are clamped so they never cross. Building this page showed that each handle's range stopped at the other, which drew the handles on different scales and locked the upper handle at the maximum (for example with 65+).
- No gap entry is needed, because no fallback ships.

### Application

In `src/studio/campaign/modules/brief/`:

| Unit | Purpose |
| --- | --- |
| `briefReviewModel.js` | Pure logic: visible steps, per-step checks from the confirmation schema, collapsed summaries, suggested marks and the *Starts writing* rule |
| `BriefReview.jsx` | Holds the draft, the open step and changed blocks; renders **What we understood**, the steps, and Finalize or Save changes |
| `BriefStep.jsx` | Step container built on `Panel`: a collapsed summary with Edit, or open content with its actions |
| `FoundCopyStep.jsx` | Previews with source links, Show all through `FoundCopyDialog`, and the copy question |
| `SettingsStep.jsx` | Age `RangeSlider`; tag `RadioGroup`s for gender, goal (with Other) and reach; `Badge` for Suggested |
| `VisualContextStep.jsx` | Keyword tags and the add field, moved from `BriefQuestionsView.jsx` |
| `AnalysisProgress.jsx` | The analyzing panel |

- `BriefModule.jsx` shows `AnalysisProgress` while analysis runs and `BriefReview` once a proposal exists.
- `workflowCoordinator.js` opens Copy after **Finalize**, and after **Save changes** only when the response starts copy writing (`initialCopy: 'offer_generation'`).
- `ReviewedBriefView.jsx` and `BriefQuestionsView.jsx` are removed and their tests replaced.
- `brief.css` keeps layout only, using tokens and no private Brutalist classes.
- Shared and server changes: `shared/briefingContracts.js` (copy mode, age helpers and range rule), `briefingService.js` (copy choice table), proposal normalisation next to `verifyBriefingProposal`, instructions in `geminiProvider.js`, `mockProvider.js`, test fixtures, and the prototype API in `src/prototype/api/flow.js`.

## Errors and edge cases

| Situation | What the requester sees | Way forward |
| --- | --- | --- |
| Analysis fails or its outcome is unknown | The M0 plain-language reason | Analyze again; **Mark as failed** when uncertain |
| Materials change during review | Materials are locked while there are unsaved changes. After a new analysis: *Your materials changed, so the settings were suggested again.* | Review the steps again |
| A check fails on Finalize | The owning step reopens with the problem next to its field | Fix it and finalize |
| Materials changed before confirming (`brief_source_changed`) | The existing message next to the button | Analyze again |
| Edit conflict or interrupted connection | The existing messages next to the button; the draft is kept | Check the latest state and try again |
| No room for found copy (`copy_capacity_exceeded`) | Copy found reopens with the existing message | Delete copy options in Copy, then finalize again |
| Copy writing fails after Finalize | The brief stays confirmed; Copy shows its own error | Retry in Copy |
| Wording read from an image | *Check this wording* on its preview | Review it in Copy |
| Other goal without text | *Describe the goal.* | Enter the goal |
| 12 keywords | The add field is disabled: *Up to 12 keywords.* | Remove one first |
| No edit rights | Collapsed steps without Edit or actions | — |

## Testing

- **Unit:** age helpers and the range rule; copy choice combinations in the schemas; `briefReviewModel` (visible steps, per-step checks, summaries, suggested marks, *Starts writing* rule); proposal normalisation.
- **Server:** confirming with `keep_and_create` imports found copy and returns `offer_generation`; the capacity check counts five new options; `create_new` with found copy is rejected; older confirmed briefs still load.
- **AI instructions:** analysis instructions include the basis and no-stereotype rules; direction instructions reference the keywords, age range, gender, reach and goal; the mock provider's lines and words.
- **Components:** Copy found hidden without found copy; Proceed checks and focus; Edit and collapse; Suggested marks clear on change; Finalize calls confirmation; Save changes with the out-of-date warning and navigation rule; read-only view; 320 px layout.
- **Brutalist:** `RadioGroup` tags variant tests and the package `verify`.
- **End to end:** `npm run test:workflow` goes through the steps, plus a browser check with the isolated launcher at desktop width and at 320 px.
- **Prompt quality:** running real briefs through Vertex AI EU needs the local API, which writes to the demo database, so the owner is asked first.

## Documentation updates

Made in the implementation pull request:

- **Decision D39**: *Brief review is AI-prefilled and stepwise. One analysis fills the settings it has a basis for and marks them as suggested; the requester reviews them in up to three steps; found copy is always kept, with optional new copy; image prompts use the keywords and audience settings.*
- **PRD:** BRIEF-3 becomes *The analysis prefills the settings it has a basis for and marks them as suggested; the requester reviews every setting and answers those left empty.* BRIEF-5 becomes *Found copy is always kept; the requester chooses whether to also write new copy options.*
- **[Asset creation flow UX](asset-creation-flow-ux.md):** the Brief region table points here; the status line row for a brief ready for review, in the interface's US spelling; the Brutalist mapping (`RadioGroup` tags variant, `RangeSlider`).
- **[Recipes](recipes.md):** the `copyMode` values; `importSuppliedCopy` runs when `{ analysis: foundCopy, exists: true }`; the `confirmBrief` questions.
- **Roadmap:** a row for this work after DS0.

## Delivery

1. M0 ([pull request #2](https://github.com/roman-kovbasyuk/automation-studio/pull/2)) merges.
2. DS0 imports Brutalist as a workspace package ([design system integration](design-system-integration.md#import-from-the-standalone-repository)).
3. One pull request into `v3` with everything on this page. The AI and copy choice work can start before DS0 merges; the interface builds on DS0.
