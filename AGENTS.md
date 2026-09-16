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

<!-- task-observatory:start -->
## Task Observatory

Before acting on project requests, read and follow [observatory/AGENT-INSTRUCTIONS.md](observatory/AGENT-INSTRUCTIONS.md). Use its CLI to pull existing tasks, record new requests, report progress, and verify completion. Keep credentials and sensitive application data out of task records.
<!-- task-observatory:end -->
