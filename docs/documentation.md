# How documentation is maintained

**Status:** Current · **Updated:** 16 September 2026

## One source

- **`docs/` is the only place for product and engineering documentation** ([D11](product/decisions.md)).
- `docs-site/` contains only the VitePress configuration and theme. It renders `docs/` as the team site at `/docs`.
- Root files have fixed roles:

  | File | Role |
  | --- | --- |
  | `README.md` | What the repository is, how to start, where the docs are |
  | `CLAUDE.md`, `AGENTS.md` | Instructions for AI coding agents |
  | `FRONTEND.md` | Front-end contract for application UI work |
  | `DESIGN.md` | Visual guide for the application UI |
  | `PRODUCT.md` | Short product context used by design tooling |

- Source folders may contain a `README.md` about that code only. Product behaviour belongs in `docs/`.

## Where things go

| Content | Location |
| --- | --- |
| Product concept, terms, decisions, roadmap | `docs/product/` |
| Recipe model; later, the recipe files themselves | `docs/product/recipes.md`; `recipes/` |
| Requirements and specifications | [PRD](product/prd.md) and [`docs/specs/`](specs/index.md) |
| Implementation plans for a milestone | `docs/plans/`, one file per milestone, named with its date |
| How the current code works | `docs/engineering/` |
| Engineering proposals not yet accepted | `docs/engineering/proposals/` |
| Application design-system rules and design briefs | `FRONTEND.md`, `DESIGN.md`, `docs/design-system/` |
| Hosting and infrastructure | `docs/operations/` |
| Superseded documents | `docs/archive/`, listed in its README |

## Status labels

Every page starts with a status line: `**Status:** <label> · **Updated:** <date>`.

| Label | Use for |
| --- | --- |
| **Current** | Describes what the code does today |
| **Target** | Agreed direction, not yet built |
| **Proposal** | Recommendation not yet accepted |
| **Historical** | Archived only |

## Rules

1. **Update docs in the same change as the behaviour.** A code change that alters behaviour updates the affected page.
2. **Record decisions in the [decision log](product/decisions.md)** and update every page they affect.
3. **Use the [glossary](product/glossary.md) terms.** Old names appear only when referring to existing code.
4. **Never cite the archive as an authority.** Replace an archived document with a current page instead of editing it.
5. **Separate evidence types.** Tests passing, browser checks, live provider checks and deployments are different claims; state which one was done.
6. **No secrets, personal machine paths or temporary URLs** in documents.
7. **Archive, don't delete, superseded specifications.** Move the file to `docs/archive/`, add it to the archive index and link its replacement.

## Diagrams

- Use Mermaid in Markdown for diagrams in these docs.
- FigJam boards are generated from recipe files or specifications with the Figma MCP and Figma skills ([D8](product/decisions.md)). Label generated boards with their source and version; change the source, not the board.

## Commands

```sh
npm run dev:docs     # local site at http://127.0.0.1:5180/docs/
npm run build:docs   # build into dist/docs; fails on broken links
```
