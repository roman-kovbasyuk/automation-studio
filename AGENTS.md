## Front-end design contract

For any application page, screen, shell, interaction, styling, or output-template work, read [FRONTEND.md](FRONTEND.md) before implementation. It governs the three design layers, master/descendant contracts, composition, state behavior, consumer boundaries and verification. Use [the design brief](docs/design-system/page-brief-template.md) for new components, surfaces, flows and substantial changes; narrow fixes may record only the changed decisions in their task.

The installed public Brutalist package owns UI appearance and shared interaction. Application patterns own composition and domain behavior. Published brand systems own artwork and generated assets. Read [DESIGN.md](DESIGN.md) for the current visual application guide. Do not infer current product behavior from historical PRODUCT.md, DESIGN.history.md, stage files or old plans when they conflict with FRONTEND.md and the latest accepted feature specification.

# UI implementation rules

- The installed `brutalist-design-system` package is the single source of UI components and tokens. Prefer direct public imports; local adapters may translate app callbacks/props without changing component appearance or interaction.
- Do not edit the external repository, vendored archive, or node_modules during consumer cleanup. Refresh with `npm run design-system:update`; use `-- --check` to preflight without changing the app. Commit the selected archive, provenance JSON and both manifests together after verification.
- Do not target upstream component classes, redefine upstream tokens, or reproduce component skins through local classes/inline styles. Plain app-owned containers may arrange content. `npm run design-system:check` enforces package provenance, named imports, private CSS selectors, token definitions and explicit JSX className/style props on direct upstream imports; manual review still covers indirect wrappers and spread props.
- When a required interaction is absent upstream, use native browser defaults and record the gap in `docs/design-system/missing-components.md`. Do not extend or patch the external design system without explicit authorization. Existing legacy adapters listed there are migration debt, not permission to add new ones.

## Campaign module architecture

- The current runtime has six internal module IDs and five visible modules: Brief → Copy → Visuals → Banners → Distribute. Review is an internal projection presented through Banners. Read FRONTEND.md and the latest accepted workflow specification before changing this mapping.
- Preserve Review preparation, Figma state and approval authorization as internal responsibilities. The committed workflow redesign reaches verified Figma creation; downstream approval/export/distribution redesign requires its own accepted specification. Distribute and Visuals are the current visible labels.
- Each module owns its functionality, local state, and explicit input/output contract, and must support independent development and debugging. The page owns layout and navigation; workflow coordination connects module outputs to their dependents.
- Internal module changes should not require page changes when the module contract stays compatible. Contract changes must be checked against dependent modules and chain tests.
- Step-specific functional changes will be defined by the user later. This structural decision does not authorize inventing functionality or changing review permissions, approval requirements, or delivery behavior.
- The live campaign page uses `src/studio/campaign/CampaignPage.jsx` and an actor/campaign-scoped runtime. `moduleContracts.js` separates internal IDs from visible IDs. The campaign README contains historical six-step and automatic-generation descriptions; use its structural guidance only where it agrees with current contracts and FRONTEND.md. Legacy Stage exports are compatibility adapters, not the live workflow controller.
- Never key a module by campaign revision or replace the module tree during a mutation refresh. Preserve local drafts and send their captured input key through named commands. Keep backend authorization and artifact integrity authoritative.
