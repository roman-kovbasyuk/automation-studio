# Brief review — implementation plan

**Status:** Implemented, awaiting review · **Date:** 17 September 2026 · **Design:** [Brief review](../specs/brief-review.md) · **Decisions:** D36, D37; D39 recorded in T10 · **Depends on:** M0; DS0 before T6

## Goal

Build the [Brief review](../specs/brief-review.md) design: one AI analysis prefills the brief's settings, the requester reviews them in up to three stacked steps (one page with every section open after T12), found copy is always kept with optional new copy, and image prompts use the keywords and audience settings.

**Exit check:** with the mock provider, a brief with found copy and a brief without both reach Copy through the steps; suggested marks appear and clear; `keep_and_create` imports found copy and writes five options; the direction instructions name the keywords and settings; `npm run test:run`, `npm run design-system:check`, the package `verify`, `npm run build`, `node scripts/verify-build.mjs`, `npm run build:docs` and `npm run test:workflow` pass; a browser check at desktop width and at 320 px passes using only the keyboard.

## Scope

**In scope:** everything on the design page.

**Out of scope:** as listed on the design page: deck briefs, web research, adding materials after analysis, routed steps (R1) and the `InlineText` autosave option (R2). T12 brought the tag input (R7) and automatic saving of confirmed briefs into scope.

## Working rules

- Branch `feat/brief-review` in its own worktree with its own `node_modules` (`npx npm@10 ci`); one commit per task. The design and this plan are part of the branch.
- While M0 and DS0 are in review the branch sits on `feat/ds0-brutalist-workspace`, which sits on `feat/m0-stabilise`; it is rebased onto `v3` as they merge.
- T1–T5 do not need DS0. T6–T9 start after DS0 merges.
- Behaviour changes start with a failing test.
- Tests and manual checks use the mock provider, `npm run dev:prototype` or `scripts/testing/start-isolated-studio.mjs`, never the demo database. Real Vertex AI checks need the owner's approval (T11).
- New interface code imports Brutalist public components directly. Compatibility adapters in `src/components/design-system/compatibility.jsx` are migration debt and are not used for new controls ([FRONTEND.md](../../FRONTEND.md)).
- One pull request into `v3` when all tasks pass.

## Tasks

### T1 — Copy choice and age range contracts

**Files:** `shared/briefingContracts.js`, `shared/briefingContracts.test.js`.

- `copyMode` accepts `keep_and_create`.
- New helpers: `ageRangeFromGroups(groups)` returns `[first, last]` indexes into `AGE_GROUPS`, with an empty list giving `[0, 6]`; `ageGroupsFromRange([low, high])` returns the groups, with `[0, 6]` giving an empty list; `normalizeAgeGroups(groups)` combines both.
- `briefAnswersConfirmedSchema` requires age groups to be empty or one continuous range that is not all seven: *Choose one continuous age range.* The draft schema keeps accepting older values.

**Tests first:** every range round-trips; gaps become the covering range; all seven groups become an empty list; the confirmed schema accepts `keep_and_create` and rejects gaps and all seven groups; the draft schema accepts both.

**Verify:** `npx vitest run shared/`.

### T2 — Confirmation rules

**Files:** `server/services/briefingService.js`, `server/services/briefingConfirmation.integration.test.js`, `server/testing/briefingFixtures.js`, `scripts/test-studio-workflow.mjs`, and other tests that confirm `create_new` with found copy.

- Import found copy for `keep_original` and `keep_and_create`, once per import key as today.
- Return `initialCopy: 'offer_generation'` for `create_new` and `keep_and_create` when no earlier confirmation has the same copy key.
- Reject `create_new` when the proposal has found copy: `found_copy_not_kept` (422), *Found copy is always kept. Choose whether to also write new copy.* `no_supplied_copy` covers both keeping modes.
- For `keep_and_create`, the capacity check counts five more options.
- Fixtures and `test:workflow` confirm `keep_original` when the proposal has found copy, otherwise `create_new`.

**Tests first:** one integration case per row of the design's [copy choice table](../specs/brief-review.md#copy-choice); `keep_and_create` is rejected when fewer than five slots remain after the import while `keep_original` succeeds; replaying a confirmation returns the stored response.

**Verify:** `npx vitest run server/services/briefing` and `npm run test:workflow`.

### T3 — Proposal normalisation

**Files:** `server/briefSources/analysisEvidence.js`, `server/briefSources/analysisEvidence.test.js`.

- `normalizeBriefingProposal(proposal)`: with found copy, `create_new` becomes `null`; without found copy, `copyMode` becomes `create_new`; age groups pass through `normalizeAgeGroups`.
- `verifyBriefingProposal` returns the normalised proposal, so analysis acceptance (`generationService.js`) and confirmation (`briefingService.js`) see the same values.

**Tests first:** each correction; normalising twice changes nothing; invalid evidence still fails with `invalid_copy_evidence`.

**Verify:** `npx vitest run server/briefSources`.

### T4 — AI instructions, mock provider and prototype

**Files:** `server/providers/geminiProvider.js`, `server/providers/mockProvider.js`, `src/prototype/api/flow.js`, and their tests.

- **Analysis:** in `briefingInstructions`, replace the sentence that leaves settings unknown unless explicitly given with the ten [analysis rules](../specs/brief-review.md#analysis). The evidence and untrusted-data rules stay.
- **Directions:** add the [image prompt rules](../specs/brief-review.md#image-prompts) to `systemInstructions.generateDirections`, naming where the values are: `brief.briefing.answers` and `context.tags`. The prompt builders do not change.
- **Mock provider:** read the brief notes and source text for `Age:`, `Gender:`, `Goal:`, `Reach:`, `Keywords:` and `Copy:` lines and for the words *students* (18–24), *pensioners* (65+) and *sign up* (Sign-ups); fill `answers` and `suggestedVisualTags`. Without cues the proposal stays empty, as today.
- **Prototype API:** proposals and confirmations accept `keep_and_create`; confirmation returns `offer_generation` only for `create_new` and `keep_and_create`.

**Tests first:** the analysis instruction contains the basis, no-stereotype, continuous-range and copy question rules; the direction instruction names the keywords, age range, gender, reach and goal; prompt builder output is unchanged for an existing fixture; mock cues give the expected answers and pass `verifyBriefingProposal`; a brief without cues gives empty settings.

**Verify:** `npx vitest run server/providers src/prototype`.

### T5 — Review model

**Files:** `src/studio/campaign/modules/brief/briefReviewModel.js` and its test (new).

Pure functions used by the interface:

| Function | Returns |
| --- | --- |
| `initialDraft(answers, proposal)` | Answers with normalised age groups; `copyMode` emptied when the proposal has found copy and the answer is `create_new` |
| `visibleSteps(proposal)` | `['copy', 'settings', 'visuals']`, without `copy` when no copy was found |
| `stepIssues(step, draft)` | Field messages from `briefAnswersConfirmedSchema` for the fields the step owns: `understanding` (summary, audience), `copy` (copyMode), `settings` (ageGroups, goal, goalCustom, reach), `visuals` (visualTags) |
| `stepSummary(step, draft, proposal)` | The collapsed summary text in the design's formats |
| `suggestedBlocks(draft, proposal, changedBlocks, confirmed)` | The blocks that show *Suggested* |
| `writesCopy(draft, briefing)` | Whether Finalize or Save changes starts copy writing |
| `outOfDate(savedBrief, draftBrief)` | `'copy'`, `'visuals'` or `null`, from `classifyBriefChange` |

**Tests first:** table-driven cases for each function, including age labels (*All ages*, *Under 35*, *45+*, *25–44*), *Men and women*, Other shortened to 40 characters, missing-answer markers, and suggested marks for defaults, changed blocks and confirmed briefs.

**Verify:** `npx vitest run src/studio/campaign/modules/brief/briefReviewModel.test.js`.

### T6 — Brutalist `RadioGroup` tags variant (after DS0)

**Files:** in `packages/brutalist-design-system`: `src/atomic/components/RadioGroup.tsx`, `src/atomic/components/forms.css`, `src/atomic/components/components.test.tsx`, the component documentation example, `package.json` (patch version) and the changelog.

- `variant?: 'default' | 'tags'`. The tags variant adds a modifier class, lays the options out in a wrapping row and draws each choice row as a tag. The native radio stays in the accessibility tree and focus order; the focus ring and checked state are drawn on the tag. Selected tags use the accent tone; disabled and forced-colours states stay visible.
- In the tags variant, the custom option's text field renders only while the custom option is selected.
- `RangeSlider` needs no change: it already passes `formatValue` to both handles.

**Tests first:** the variant renders radios with the modifier class; clicking a tag selects it and reports the value; instructions and errors stay linked; the custom field appears only while its option is selected; existing default-variant tests pass unchanged.

**Verify:** the package `verify` and `npm run design-system:check`.

### T7 — Step shell

**Files:** `AnalysisProgress.jsx`, `BriefStep.jsx`, `BriefReview.jsx` and their tests (new); `BriefModule.jsx`, `BriefView.jsx`, `brief.css`.

- `AnalysisProgress` replaces the analysis status in `BriefView` when sources are analysed: the panel from the design, in a polite live region.
- `BriefStep` is built on `Panel`: open (title, *Step n of N*, content, actions) or collapsed (title, summary, **Edit** named after its step).
- `BriefReview` holds the draft (`initialDraft`), the open step, the reached steps and the changed blocks. It renders **What we understood** (summary `TextArea`, audience `TextField`) and the visible steps, implements Proceed, Edit and focus as in [moving between steps](../specs/brief-review.md#moving-between-steps), and has a read-only mode.
- `BriefModule` renders `BriefReview` in place of `ReviewedBriefView`; a runtime refresh keeps a changed draft, as today.

**Tests first:** the first open step with and without found copy; unreached steps hidden; Proceed with a missing answer focuses its field; a complete step collapses and focus moves to the next heading; Edit collapses the open step without checking it; read-only shows collapsed steps without buttons; the progress panel while analysing.

**Verify:** `npx vitest run src/studio/campaign/modules/brief`.

### T8 — Step contents and suggested marks

**Files:** `FoundCopyStep.jsx`, `SettingsStep.jsx`, `VisualContextStep.jsx` and their tests (new).

- `FoundCopyStep`: up to three previews, source links through the existing source opener, *Check this wording* for `needs_review`, **Show all (N)** with `FoundCopyDialog`, and the copy question as a tags `RadioGroup`.
- `SettingsStep`: `RangeSlider` over indexes 0–6 with `formatValue` giving age labels and handle labels *From* and *To*; tags `RadioGroup`s for gender, goal (Other through `customOption`) and reach.
- `VisualContextStep`: keyword tags with removal and the add field, moved from `BriefQuestionsView.jsx`, with the limit message.
- A *Suggested* `Badge` in each block label, from `suggestedBlocks`.

**Tests first:** previews, Show all and source links; every settings control updates the draft; Other text; adding, duplicate, removing and the keyword limit; badges show for proposal values and clear after a change; no badges for defaults or confirmed briefs.

**Verify:** `npx vitest run src/studio/campaign/modules/brief`.

### T9 — Finalize, save changes and cleanup

**Files:** `BriefReview.jsx`, `workflowCoordinator.js`, `workflowCoordinator.test.js`; remove `ReviewedBriefView.jsx`, `BriefQuestionsView.jsx` and their tests; update `BriefModule.reviewed.test.jsx`, `BriefModule.sources.test.jsx`, `ConnectedStudio.review.integration.test.jsx`, `CampaignPage.test.jsx`, `campaignChain.test.jsx` and `briefingCoordinator.test.js` where they drive the old form.

- **Finalize** checks every step and **What we understood**, reopens the first step with a problem, then confirms the draft. *Starts writing 5 copy options.* shows when `writesCopy` is true.
- **Confirmed briefs:** Edit shows **Save changes** and **Cancel**; changes to **What we understood** show them below it; the out-of-date warning comes from `outOfDate`.
- After a new analysis the draft resets and the design's notice shows.
- `workflowCoordinator.js` opens Copy after Finalize, and after Save changes only when the response is `offer_generation`.
- Confirmation errors show next to the button; `copy_capacity_exceeded` reopens Copy found.

**Tests first:** Finalize with an empty summary focuses it; Finalize without a goal reopens Settings; a successful Finalize sends normalised answers; the *Starts writing* line for each copy mode; Save changes and Cancel on a confirmed brief; the warning texts for copy and visual changes; the coordinator's navigation rule; the reset notice.

**Verify:** `npx vitest run src/studio`.

### T10 — Documentation

**Files:** `docs/product/decisions.md`, `docs/product/prd.md`, `docs/product/roadmap.md`, `docs/specs/asset-creation-flow-ux.md`, `docs/specs/recipes.md`, `docs/specs/brief-review.md`, `docs/engineering/ai-generation.md`.

- Record D39 with the text on the design page, using the next free number.
- Change PRD BRIEF-3 and BRIEF-5, the roadmap, the UX spec and the recipes spec as listed in the design's [documentation updates](../specs/brief-review.md#documentation-updates).
- `ai-generation.md`: `analyseBrief` also proposes settings.
- The design page status becomes *Implemented*.

**Verify:** `npm run build:docs` with no dead links.

### T11 — Final verification and pull request

- Run `npm run test:run`, `npm run design-system:check`, the package `verify`, `npm run build`, `node scripts/verify-build.mjs`, `npm run build:docs` and `npm run test:workflow`.
- Browser check with the isolated launcher and mock provider: a brief with found copy and cues, a brief with neither, Save changes on a confirmed brief, keyboard only, and 320 px width. Record the results in this plan.
- Ask the owner before trying real briefs with Vertex AI EU, because the local API writes to the demo database.
- Open one pull request into `v3`.

### T12 — One-page review (after the owner used T1–T11)

**Files:** `BriefReview.jsx`, `BriefStep.jsx`, `SettingsStep.jsx`, `VisualContextStep.jsx`, `BriefModule.jsx`, `briefReviewModel.js`, `brief.css`, `briefingService.js`, `WorkflowModuleFrame.jsx`, `ModuleHost.jsx`, `shared/briefingContracts.js`, the mock provider, their tests; in Brutalist, `TagInput`, tag hover styles and the changelog.

- Summary and audience become `InlineText` at the top of the stage with the materials below them; every section is open after analysis, without numbers or per-section actions, and one **Proceed to copy →** confirms.
- A confirmed brief collapses its sections; **Edit** reveals one with a short animation and becomes **Done**. Changes save automatically, except a change that would write new copy, which shows **Discard changes** and **Proceed to copy →**.
- Age runs from 18 to 65+. Gender, goal and reach tags get icons; Settings and Visual context get large circle icons; the out-of-date and *Starts writing* lines are removed.
- Keywords use Brutalist `TagInput`, whose placeholder carries the hint; removable tags and tag choices lift on hover (Brutalist 0.1.2).

**Verify:** the full T11 checks and a browser check at desktop width and 320 px.

## Results

| Task | Result (17 September 2026) |
| --- | --- |
| T1 | `keep_and_create` accepted; age range helpers; confirmed briefs need no age limit or one continuous range |
| T2 | Keeping found copy with new copy imports it once and writes copy for new copy settings; `found_copy_not_kept` rejects dropping found copy; the capacity check counts five new options. The mock provider now finds every headline in a block. Fixtures keep found copy; `test:workflow` needed no change because its brief has none |
| T3 | `normalizeBriefingProposal` runs inside `verifyBriefingProposal`, at analysis acceptance and at confirmation |
| T4 | Analysis and direction instructions updated; the mock provider reads setting lines and a few words; the prototype proposes settings and writes copy only for writing modes |
| T5 | `briefReviewModel.js` with 13 tests |
| T6 | `RadioGroup` tags variant, tests, documentation example, usage guidance, changelog; Brutalist 0.1.1 |
| T7 | `BriefStep` and `AnalysisProgress`; the analysis status in `BriefView` became the progress panel. `BriefReview` moved to T9 so that every commit stays green |
| T8 | `FoundCopyStep`, `SettingsStep`, `VisualContextStep` and `SuggestedBadge` with 4 tests |
| T9 | `BriefReview` with 7 tests; `BriefModule` wiring; the coordinator's navigation rule with a test; the single review form, its questions view and stale wizard styles removed. The browser check found two defects, both fixed: Brutalist's `RangeSlider` drew its handles on different scales and locked the upper handle at the maximum (fixed in the package, recorded in 0.1.1), and a spacing step Brutalist does not define collapsed the found copy step |
| T10 | D39; PRD BRIEF-3 and BRIEF-5; UX spec Brief region, status line and Brutalist mapping; recipe spec and product recipe example; roadmap; AI generation page; design status |
| T12 | The one-page review, automatic saving, age from 18, icons, `TagInput` and hover elevation; the Brief stage lost its outer card; D39, the design page, the UX spec, the gap list (R7 closed) and the roadmap updated. Using it in the browser found defects that are now fixed and tested: Edit showed before confirmation; sections stayed open after confirming because the stage stays mounted; validation focus landed on a fieldset; switching the copy question to *Yes, also write new options* saved silently and wrote no copy, both in the browser rule and on the server, which counted a kept-copy confirmation as copy already written; an automatic save hid the controls and could drop a change made during it; a failed automatic save retried every second; `div`s sat inside headings and choice labels; the keyword placeholder was cut off |

## Final verification

After T12, on 17 September 2026. The first version's run (1,791 tests, Brutalist 0.1.1) is superseded.

| Check | Result |
| --- | --- |
| `npm run test:run` | 1,802 passed, 1 skipped |
| `npm run design-system:check`, `npm run test:design-system` | Pass |
| `npm run verify --workspace brutalist-design-system` | Pass: 151 tests, typecheck, builds, documentation examples, packed consumer at 0.1.2 |
| `npm run build` (including the docs), `npm run build:docs`, `npm run verify:production` | Pass, no dead links |
| `npm run test:workflow` | Pass: the isolated studio delivered the banner set |
| Browser, desktop, isolated launcher with mock providers | A brief with found copy and setting lines opened with every section and reached Copy with **Proceed to copy →**. Back on Brief the sections were collapsed with Edit. A gender change saved without a button and survived a reload. Switching the copy question to Yes showed **Discard changes** and **Proceed to copy →**, which opened Copy with new options beside the found copy. Keywords were added with Enter and by leaving the entry, and the entry showed its whole placeholder |
| Browser, 320 px | No horizontal scroll in the review; choices, icon tags and keywords wrap; the keyword entry takes a full row and ends its placeholder with an ellipsis. Outside this work, the page header's *Draft* badge is squeezed into a narrow column |
| Keyboard only | Not repeated for T12; component tests cover the native radios, sliders, `InlineText` and `TagInput` keys |
| Real briefs through Vertex AI EU | Not run: needs the owner's approval because the local API writes to the demo database |

## Risks

| Risk | Mitigation |
| --- | --- |
| DS0 takes longer than expected | T1–T5 do not need it; the interface tasks wait |
| The AI infers too much, or from stereotypes | Basis and no-stereotype rules; Suggested marks keep the requester in control; real briefs checked with approval in T11 |
| Tests and scripts that confirm `create_new` with found copy, or separate age groups, start failing | Fixtures, `test:workflow` and the prototype change in T2 and T4; the full suite runs in T11 |
| The tags variant relies on `:has()` | Brutalist choice rows already use `:has()`; forced-colours check in T6 |
| The standalone Brutalist checkout has uncommitted dependency bumps (`jsdom` 30.1, `vite` 8.3) | DS0 decides whether to commit or discard them before the import; this plan does not touch them |

## Owner decisions

| Decision | When |
| --- | --- |
| Approve the wording of D39 | T10 |
| Approve the revised wording of D39 (one page, automatic saving) | T12 |
| Allow real Vertex AI briefs against the demo database | T11 |
| Keep or discard the uncommitted Brutalist dependency bumps | DS0 |
