# Application component library

> **Compatibility layer.** The installed `brutalist-design-system` package is the source of UI components ([FRONTEND.md](../../../FRONTEND.md), [consumer boundary](../../../docs/design-system/migration.md)). Components in this folder are adapters or migration debt; do not add new skins here.

Browse `/design-system` → Library structure. Search by component, responsibility or constraint, then check adoption status. Current library imports:

```jsx
import { AppButton } from './atoms/AppButton.jsx'
import { WorkflowSteps } from './molecules/WorkflowSteps.jsx'
import { SelectMenu } from './molecules/SelectMenu.jsx'
import { PromptComposer } from './organisms/PromptComposer.jsx'
import { WorkflowModuleFrame } from './organisms/WorkflowModuleFrame.jsx'
```

Paths above are relative to this directory. Import supported adapters from the `atoms/`, `molecules/` and `organisms/` paths. The remaining `compatibility.jsx` exports serve live consumers; unused wrappers were removed in the preparation cleanup. Domain-aware components stay in `src/studio`.

- [Consumer boundary and migration](../../../docs/design-system/migration.md)
- [Missing components and native fallbacks](../../../docs/design-system/missing-components.md)
- Current consumer contract: [workspace integration](../../../docs/specs/design-system-integration.md); earlier contracts remain in Git history

The only supported application theme is light.

New components need a responsibility, explicit props, supported states, constraints, an actual consumer, and appropriate keyboard/interaction verification. Classify by responsibility; do not force domain logic into lower atomic levels or create one variant set for different kinds of content.

## Copy-module shared patterns

- `molecules/ActionCard.jsx`: generic content surface, with `label`, `status`, `actions`, `persistentAction`, `highlighted`, `dismissing`, `exiting`, and content slots. Hover actions also reveal on focus and touch. Exiting cards are inert and hidden from assistive technology. Metadata wraps independently of controls on small screens.
- `molecules/EmptyState.jsx`: centered decorative `icon` and guidance `children`. It owns presentation, never generation or retry logic.
- `organisms/PreviewDialog.jsx`: mount to open, with `title`, `onClose`, and content. Native modal focus containment, Escape/close control, focus restoration and viewport-bounded scrolling; no fetching or domain actions.
- `molecules/useExitPresence.js`: retains removed keyed items for the shared 200ms disclosure window. Pass an immutable, stable array of unique IDs; render returned exits as inert display-only content. Reduced motion skips the animation window and timers clean up on unmount.

Consumer: `src/studio/campaign/modules/copy/CopyView.jsx`. Copy content, approval semantics, limits, API calls, and asset loading remain outside the design system. Tests live beside the presence hook and in `CopyCards.test.jsx`/`CopyModule.test.jsx`; preview focus and responsive geometry are also checked in the browser.

## Brief-module shared patterns

- `molecules/InlineText.jsx`: text-first editing with `label`, `value`, `sourceKey`, `onSave(value, capturedSourceKey)`, `onDirty`, `readOnly`, `maxLength` (500 by default), `required`, and `multiline`. Saves trim the value; failed saves retain the draft. Enter saves, Shift+Enter inserts a line, and Escape cancels when idle. A changed source key produces a retained-draft notice; the caller owns conflict resolution and validation beyond required text. Editable display targets are at least 44px high; read-only values render as text.
- `molecules/AsyncStatus.jsx`: caller-supplied `children` in a status region with a decorative loading icon. It describes indeterminate work; requests, timing, failure recovery, and progress wording belong to the caller.

Consumers: `src/studio/campaign/modules/brief/BriefModule.jsx` uses InlineText and AsyncStatus; `AutoSaveSummary.jsx` uses InlineText; `BriefView.jsx` and `ModuleHost.jsx` use AsyncStatus. Schema validation, permissions, source keys, and campaign mutation behavior remain in Studio. The [Brief review specification](../../../docs/specs/brief-review.md) describes the current composition; the [preparation review](../../../docs/engineering/phase-preparation-review.md) records verification evidence.

## Form patterns

- `molecules/FormField.jsx`: native input props, persistent `label`, optional `hint`/`error`, and generated IDs. A render-function child can compose `SelectMenu` using its `triggerId`. Password fields never receive stored secrets.
- `SelectMenu` owns provider/model selection and keyboard navigation; opening a list with no saved selection focuses its first option. `AppButton` owns all actions and busy/disabled states.

Consumers: admin records and recipe screens (`src/studio/admin/`).

### Specimen layout sizing

Component example grids reflow using their available content width: 280px minimum columns, or 260px for button cells, each capped at 100% for narrow containers. Buttons retain natural widths; text may wrap only when space is insufficient. Keep focus rings and intentional overlay layers visible; do not hide overflow to mask sizing issues. Data tables retain their own scroll containers.

### Catalog presentation

The catalog uses one white content surface with flat sections and consistent 24px specimen gaps. Section and specimen wrappers have no card background or enclosing border. Input boundaries, interactive component previews, and raised popovers retain their own functional styling. Control grids use the available width with a 280px minimum column and stack when narrower. Source paths and relevant token chips are available in each heading's Reference disclosure; repeated descriptive prose is omitted. Sidebar anchors remain on the visible headings.

## Brand parameters for banner templates

Brand systems are separate from the application UI tokens. Each template version can reference one published brand; many template layouts can share that system. `shared/resolveTemplateBrand.js` maps semantic palette and typography roles into the existing geometry and saves an immutable resolved manifest. Primary logo graphics are verified raster snapshots with contained scaling and a white backing. Layouts retain their sizes, safe areas and motion.

`AnimatedBanner` and the PNG renderer consume these resolved parameters. Registered rendering families are Inter and OFL-licensed Arimo, at weights 400/600/700. Arimo is the Arial-compatible substitute for the supplied MSD reference; that publisher's typography is not presented as official MSD guidance. Logo teal is sampled from the supplied asset; the pale teal is a derived tint. Original source/license metadata remains in the MSD record.

Admin-only `POST /api/v1/brand-design-systems/:brandId/templates` accepts `{ templateIds: [...] }` and publishes new versions into the shared catalog. Brand publication/restoration atomically refreshes assigned templates. Existing template and campaign snapshots remain unchanged. Returning to Templates reloads the catalog. No template creation UI is introduced. To reproduce the local demo fixture, run `node scripts/setup-msd-templates.mjs` with the demo API's database and asset-store configuration; the script is idempotent and blocked in production.
