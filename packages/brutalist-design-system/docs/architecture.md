# Architecture

The source follows one-way Atomic Design dependencies:

```text
atoms → components → ui-blocks → screens/docs
```

Atoms own tokens, typography, icons, layout, and surfaces. Components own reusable controls and interaction behavior. UI Blocks compose those lower layers into application patterns. Documentation screens assemble the public library and never define private controls.

The public entry point is `src/atomic/index.ts`. `src/atomic/componentManifest.js` is metadata only: it maps public export names to documentation destinations and does not import UI. Tests compare it with the actual public exports and the independent consumer.

Add a reusable interaction to its owning lower layer first. Reuse existing tokens and responsive rules. Product screens may compose or size a shared component but must not recreate its interaction model.
