# Automation Studio

@AGENTS.md

## Claude Code notes

- There is no default session agent and no project skills in this repository. The legacy marketing-agent pipeline was removed ([D10](docs/product/decisions.md)).
- For FigJam diagrams, use the Figma MCP and the Figma skills (`figma:figma-use-figjam`, `figma:figma-generate-diagram`). Generate from recipe files or specifications; label boards with their source.
- Keep machine-local settings in `.claude/settings.local.json` and `CLAUDE.local.md` (both Git-ignored).
