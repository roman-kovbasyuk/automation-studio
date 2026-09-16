# Agent instructions — Automation Studio

These instructions apply to every AI coding agent working in this repository. `CLAUDE.md` imports this file.

## The product

Automation Studio produces on-brand content automatically. A company's **brand** is the foundation of every asset; **templates** are built on the brand; **recipes** turn a brief into finished assets through four stages — **Brief → Copy → Visuals → Assets**; **designers** are involved only through **escalation** when automatic quality is not good enough. Banners are the first asset type, decks the second.

The code is behind this model. It still implements a banner-only "campaign" flow with mandatory designer review. Read [known issues](docs/engineering/known-issues.md) before assuming the target exists.

## Read first

| Task | Read |
| --- | --- |
| Anything | [Product concept](docs/product/concept.md), [glossary](docs/product/glossary.md), [decision log](docs/product/decisions.md) |
| Planning or specifying features | [Roadmap](docs/product/roadmap.md), [recipes](docs/product/recipes.md) |
| Changing code | [Architecture](docs/engineering/architecture.md), [local development](docs/engineering/local-development.md), [known issues](docs/engineering/known-issues.md) |
| AI generation | [AI generation](docs/engineering/ai-generation.md) |
| Application UI, pages, styling, interaction | [FRONTEND.md](FRONTEND.md) (required), [DESIGN.md](DESIGN.md) |
| Documentation | [How documentation is maintained](docs/documentation.md) |

## Authority

When sources disagree, use this order:

1. The latest explicit decision from the user in the current task.
2. The [decision log](docs/product/decisions.md).
3. Current product and specification pages in `docs/product/` (and `docs/specs/` once written) for what to build.
4. Code, schemas and fresh test results for what exists today, described in `docs/engineering/`.

Never treat `docs/archive/` as an authority. Never infer intended product behaviour from old names in the code ("campaign", "Banner Studio", six modules, review statuses). Record unresolved conflicts and ask; do not resolve them by picking the newest file.

## Working rules

- **Use glossary terms** in documents and new interface copy. Use old names only when referring to existing code.
- **No implicit AI work.** Opening, refreshing, navigating or checking status must never dispatch generation. Never turn a timeout into an automatic paid retry. Never run live paid generation just to get a screenshot or a passing check.
- **The server is authoritative** for permissions, revisions, versions and completion. Client state is never permission.
- **The local API writes to a real demo database** (`banner_studio_demo`). Use `npm run dev:prototype` or the isolated launchers in `scripts/testing/` for experiments. Ask before creating records in the demo database.
- **Never commit secrets** or paste them into documents. Never prefix secrets with `VITE_`.
- **Recipes are files** and the single source of truth ([D8](docs/product/decisions.md)). Generate FigJam diagrams from them with the Figma MCP and Figma skills; never treat a board as the source.
- **Keep documentation in sync.** A change that alters behaviour updates the affected page in `docs/` in the same change. Record decisions in the decision log.
- **Report evidence precisely.** Distinguish unit tests, integration tests, browser checks, live provider checks and deployments.

## Front-end design contract

For any application page, screen, shell, interaction, styling, or output-template work, read [FRONTEND.md](FRONTEND.md) before implementation. It governs the three design layers, master/descendant contracts, composition, state behavior, consumer boundaries and verification. Use [the design brief](docs/design-system/page-brief-template.md) for new components, surfaces, flows and substantial changes; narrow fixes may record only the changed decisions in their task.

The installed public Brutalist package owns UI appearance and shared interaction. Application patterns own composition and domain behavior. Published brand systems own artwork and generated assets. Read [DESIGN.md](DESIGN.md) for the current visual application guide. Do not infer current product behavior from archived documents when they conflict with FRONTEND.md and the current product documentation.

## UI implementation rules

- The installed `brutalist-design-system` package is the single source of UI components and tokens. Prefer direct public imports; local adapters may translate app callbacks/props without changing component appearance or interaction.
- Do not edit the external repository, vendored archive, or node_modules during consumer cleanup. Refresh with `npm run design-system:update`; use `-- --check` to preflight without changing the app. Commit the selected archive, provenance JSON and both manifests together after verification.
- Do not target upstream component classes, redefine upstream tokens, or reproduce component skins through local classes/inline styles. Plain app-owned containers may arrange content. `npm run design-system:check` enforces package provenance, named imports, private CSS selectors, token definitions and explicit JSX className/style props on direct upstream imports; manual review still covers indirect wrappers and spread props.
- When a required interaction is absent upstream, use native browser defaults and record the gap in `docs/design-system/missing-components.md`. Do not extend or patch the external design system without explicit authorization. Existing legacy adapters listed there are migration debt, not permission to add new ones.

## Current campaign flow code

The existing banner flow lives in `src/studio/campaign/`. Until it is migrated to the asset creation flow, keep its guarantees intact:

- The runtime has six internal module IDs (Brief, Copy, Visuals, Banners, Review, Distribute) and five visible modules; Review is an internal projection shown inside Banners. `moduleContracts.js` separates internal from visible IDs. The target maps Banners, Review and Distribute to the single **Assets** stage.
- Each module owns its functionality, local state and explicit input/output contract. The page owns layout and navigation; `workflowCoordinator.js` connects module outputs. Contract changes must be checked against dependent modules and chain tests.
- Never key a module by campaign revision or replace the module tree during a mutation refresh. Preserve local drafts and send their captured input key through named commands. Keep backend authorization and artifact integrity authoritative.
- Do not change review permissions, approval requirements or delivery behaviour without an accepted specification. Decision D1 (designer review as escalation) requires its own specification before implementation.
- The live campaign page is `src/studio/campaign/CampaignPage.jsx`. Legacy Stage exports are compatibility adapters, not the live workflow controller. Unused prototype code in `src/mvp/`, `src/domain/`, `src/data/` and parts of `src/screens/` is scheduled for removal; do not build on it.

See [campaign modules](docs/engineering/campaign-modules.md) for the module boundary, playground and verification commands.

## Commands

```sh
npm run dev:api          # local API on 3010 (demo database)
npm run dev              # application on 5173
npm run dev:prototype    # offline prototype on 5190
npm run test:run         # tests
npm run design-system:check
npm run build            # application and docs
npm run dev:docs         # documentation site on 5180
```
