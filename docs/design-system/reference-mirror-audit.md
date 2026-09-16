# Reference mirror audit: Templates

## Sources inspected

- `/private/tmp/atomic-consumer-wJEnhr/atomic-templates.html` and `atomic-templates.jsx` — the supplied Atomic Design System consumer entry point.
- `/private/tmp/atomic-consumer-wJEnhr/src/studio/TemplateLibrary.jsx` — the reference Templates composition.
- `src/studio/TemplateLibrary.jsx` — the application composition before this alignment.
- `src/studio/PresentationLibrary.test.jsx`, `src/studio/BannerTemplateEditor.test.jsx`, and `src/components/design-system/AtomicContracts.test.jsx` — existing behavioral and atomic-contract coverage.
- The live `/mvp/templates` route at `http://127.0.0.1:5176/mvp/templates` — rendered behavior after alignment.

## Reference contract

The supplied consumer renders `TemplateLibrary` inside `AtomsRoot` with the shared `brutalist-design-system` stylesheet. The Templates surface therefore owns only composition and routing. Category tabs, campaign entry, banner cards, template editor, presentation library, and empty states must use the existing shared exports and feature components; the reference does not inject a second visual gallery.

Expected Ads state:

- `Templates` heading with the preview pause/play action.
- The four top-level tabs: `Ads`, `Web`, `Presentations`, `Other`.
- The campaign entry surface followed directly by the three selectable banner previews.
- No additional Novartis gallery, duplicate cards, or new visual treatment.

Expected non-Ads state:

- `Web` and `Other` show the existing empty state.
- `Presentations` renders the existing `PresentationLibrary`.

## Alignment made

`src/studio/TemplateLibrary.jsx` now matches the supplied reference composition:

- removed the `NovartisTemplateGallery` import;
- removed the injected Novartis gallery from Ads, Web, and Other;
- restored the reference content branch: Presentations use `PresentationLibrary`, while the other categories use the existing banner gallery or empty state.

No external design-system package, tokens, component skins, backend behavior, or campaign flow was changed.

## Verification

- Regression assertion added: the Ads reference view must not contain the Novartis gallery.
- Red check observed with the injected gallery: 1 expected failure.
- Green check: 4 focused test files, 21 tests passed.
- `npm run design-system:check` passed.
- `npm run build` passed; only existing chunk-size warnings remain.
- Impeccable detector returned no findings for the changed source and test.
- Live route verified: Ads shows only the campaign entry and three reference banner previews; Web shows the existing empty state.
