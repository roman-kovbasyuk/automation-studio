# Atomic components — batch 1

User direction: rename Basics to Atoms, rewrite Components from Atoms, work directly, pause after every five components. App shell is excluded.

## Scope

Rename all new source/catalog/documentation references to Atoms. Preserve stable category anchors such as #shape. Atom source is `src/atomic/atoms`; Components source is `src/atomic/components`. Components may import Atoms and other Components; Atoms may never import Components. Neither may import the catalog or legacy implementation. Enforce resolved imports in the isolated build, including dynamic imports.

Exactly five public components in this batch:

1. Button: native button, primary/secondary/danger/quiet, default48/compact44, labelled icon-only, optional leading/trailing Lucide Icon, disabled/busy, native keyboard, default type button. Label uses H6; interaction uses Atom elevation/motion/focus tokens. No anchor-button overload in this first contract.
2. Panel: semantic section built from Surface, Stack, Heading H4, Text. 32px radius and padding, 4px heading-description gap, 24px slot gap. One unified interior; no separator. Hover/focus-within elevation, reduced-motion translation removed. Content and description optional, zero content retained.
3. TextField: native text/email/password/search/url/tel input, visible label, helper/error associations, disabled/readOnly/required and normal native props. Unique generated or supplied IDs; preserve caller describedby. No hardcoded field colors/type outside Atoms.
4. Checkbox: native input, controlled or uncontrolled, mixed state through native indeterminate, full label target, helper/error, disabled. Check icon decorative; native input remains keyboard target.
5. RadioGroup: native fieldset/legend and same-name radio controls, controlled/uncontrolled exclusivity, option/group disabled, helper below caption and above choices, error association. 20px black1px outer ring, white unchecked; cyan checked with white10px center.

## Implementation and verification

Make the minimum supporting Atom additions: native label typography via Text, Surface semantic tag/overridable elevation custom property, focus/state/selection tokens. Native semantics remain in Components. Form helper composition is internal, never a public sixth component.

Add focused behavior tests for button activation/disabled/busy, label/error wiring, mixed checkbox, controlled/uncontrolled radios, disabled native form submission, labelled Panel content. Catalog demonstrates all five owners with real state changes and a visible Components destination. No private duplicate controls in examples.

Run focused atomic tests, typecheck, isolated build/import-boundary gate, then one browser pass for desktop/narrow layout and keyboard/native interactions. Keep all previous source intact. No package publishing, merge or commit. Pause for user review after this batch.
