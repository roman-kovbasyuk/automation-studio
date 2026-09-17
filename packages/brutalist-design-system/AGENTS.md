# Brutalist Design System

## Living in Automation Studio

During the Automation Studio pilot this package lives in that repository as the workspace package `packages/brutalist-design-system` (Automation Studio decision D36). It is a standalone product and must stay detachable.

- Never import application code or files outside this directory. Declare every module the package imports in `package.json`.
- Keep product vocabulary out of `src`: no *Automation Studio*, *campaign*, *banner*, *recipe* or *escalation*. The generic `Banner` component is a reviewed exception. Automation Studio's `npm run design-system:check` enforces both rules.
- Consumers use only `brutalist-design-system` and `brutalist-design-system/styles.css`. The `source` export condition serves `src/atomic` to the Automation Studio dev server and tests; production builds use `dist-atomic-library`.
- From the repository root, verify with `npm run verify --workspace brutalist-design-system`.
- Additive changes bump the patch version in the same pull request. Breaking changes (a removed or renamed export, a changed required prop) need the owner's approval and a minor version bump.

# Atomic Design rules

- Dependency direction: Basics → Components → UI blocks → Screens. Lower layers never import higher layers.
- Basics owns tokens, typography, icons and layout in `src/atomic/atoms`.
- Components owns reusable controls and interaction behavior in `src/atomic/components`.
- UI blocks compose only Basics and Components; do not introduce private controls or depend on another block as a building block.
- Expose missing reusable features in the owning lower layer first. Reusing CSS classes on private markup is not component reuse.

- Use components from `src/atomic/` for application controls and layouts before creating new markup.
- If a required pattern does not exist, add it to the design-system component library first, then use that component at the product call site.
- Keep design-system styling and interaction behavior canonical; do not create one-off tabs, buttons, menus, or form controls in screen components.
- Reuse the existing design tokens and responsive rules. Product-specific CSS should only compose or size a shared component, not redefine its interaction model.

## Component usage guidance

Before choosing or documenting a component, check the [Component Usage Guidance](docs/guides/component-usage.md). The component’s purpose, context, alternatives, and application responsibilities must be consistent with that document.
