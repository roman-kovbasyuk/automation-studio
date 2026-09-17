# Design system integration

**Status:** Target · **Accepted:** 17 September 2026 ([D13–D16, D24–D27](../product/decisions.md)) · **Not yet implemented**

How Automation Studio uses, extends and updates the Brutalist design system. The design-system side of the change process is specified in the Brutalist repository: `docs/superpowers/specs/2026-09-17-change-protocol-v2-design.md` (branch `docs/change-protocol-v2`).

## Summary

- Automation Studio uses Brutalist components wherever they exist.
- Needs that any application could have are added to Brutalist; product-specific compositions stay in the app.
- Brutalist changes are made only through the change protocol. Additive changes requested by this app are pre-approved; breaking changes need the owner's approval.
- Any AI agent, or a person, can implement a request. Guarantees come from the pipeline, not from the agent.
- There is one way to install a Brutalist release into the app, and it always records provenance.

## Problems this solves

Found in the review of 16–17 September 2026 ([adoption audit](../design-system/adoption-audit.md)):

1. The change pipeline only runs Codex (`codex exec`) and assumes the Observatory task tool.
2. The pipeline installs releases with an absolute local path and no provenance record, which the app's `design-system:check` rejects and which breaks Docker and CI builds.
3. Pipeline releases stay on the local machine, while the app's updater builds from GitHub.
4. The gap list was reviewed against an older package commit and is not checked automatically; at least one listed gap (color picker) is already available.
5. The app's agent rules forbade extending the design system while the pipeline auto-approves requests.

## Principles

1. **Use the library first.** If a Brutalist component exists for the need, use it.
2. **Extend upstream for generic needs.** Keep domain logic and product compositions in the app.
3. **One change path and one install path**, always with provenance.
4. **Agents are interchangeable.** Isolation, allowed paths, verification, packaging and installation checks are enforced by tooling.

## Where a need belongs

| Goes into Brutalist | Stays in the app |
| --- | --- |
| Interaction or visual primitives any application could use | Compositions that know about brands, templates, recipes, projects, AI jobs or escalations |
| Missing props, slots or variants on existing components | Screen layouts, page patterns and navigation structure |
| Accessibility fixes in shared components | Product copy and state wording |

Test: *Would a different application need this? Can it be described without product terms?* If both answers are yes, it belongs in Brutalist.

Examples from the current gap list: routed step navigation, autosaving inline text and a free-text tag input belong in Brutalist. The project page, brand preview cards and the escalation panel stay in the app.

## Workflow for a missing capability

1. **Check** the installed exports and the [gap list](../design-system/missing-components.md).
2. **Decide** where the need belongs using the table above.
3. **App-specific:** compose Brutalist components in app-owned containers. Stop here.
4. **Generic:** implement the unstyled native fallback required by [FRONTEND.md](../../FRONTEND.md) and add a gap entry.
5. **Submit a change request** (see below) and record its ID in the gap entry.
6. **When the release is installed**, replace the fallback with the component and close the gap entry in the same change.

A gap entry is never closed by a package update alone; the fallback must be replaced and the replacement verified.

## Gap list

The gap list in `docs/design-system/missing-components.md` becomes machine-checkable. Each entry records:

| Field | Meaning |
| --- | --- |
| ID | Stable identifier, e.g. `G-routed-steps` |
| Pattern | The needed behaviour |
| Used in | Routes or source files using the fallback |
| Fallback | What the app does today |
| Waiting for | The exact upstream export, prop or slot that would replace the fallback |
| Request | Change request ID, or `none` |
| Status | `open`, `requested`, `available` (released but not adopted), `closed` |

The list records the package commit it was reviewed against.

**Checks to add to `npm run design-system:check`:**

- Warn when an entry's awaited export or prop exists in the installed package while the entry is not `closed`.
- Warn when the reviewed commit differs from the installed commit.
- Fail when an entry is `closed` but its fallback is still referenced in source.

The entries are stored as JSON and rendered into the page (D24). Until that is built, the Markdown table follows these fields exactly.

## Change requests

Requests follow protocol v2 in the Brutalist repository. In addition to the v1 fields (`requestId`, `installedVersion`, `component`, `change`), a request carries:

- **Acceptance criteria:** observable behaviour that must hold.
- **Consumer:** the app route or file that needs it, and how it will be used.
- **Accessibility expectations.**
- **Change type:** `additive` or `breaking`, as declared by the requester. The pipeline also detects breaking changes and its result wins.

**Approval policy:**

| Change type | Approval |
| --- | --- |
| Additive (new component, prop, slot or variant; bug fix without API change) | Pre-approved for requests from Automation Studio |
| Breaking (removed or renamed export, changed required prop, changed default behaviour) | Held for the owner's approval |

**Who implements:** any agent or person. By default requests wait to be claimed (pull mode); optional adapters can start Codex, Claude Code or another command automatically.

## Installing releases

There is exactly one install path: the app's own updater.

| Mode | Command | Use |
| --- | --- | --- |
| Build from upstream | `npm run design-system:update` | Manual update to the latest `main` on GitHub (exists today) |
| Install a released artifact | `npm run design-system:update -- --artifact <tgz> --commit <sha>` | Used by the change pipeline (to be added) |

Both modes must:

1. Refuse to run when `package.json`, `package-lock.json` or `vendor/` have uncommitted changes.
2. Verify the artifact checksum and that the commit exists on the GitHub repository.
3. Copy the artifact into `vendor/` with a commit-named filename.
4. Write `vendor/brutalist-design-system.json` (repository, commit, version, artifact, SHA-256, file hashes).
5. Set the dependency to `file:vendor/<artifact>` and update the lockfile.
6. Run `npm run design-system:check`, the test suite and `npm run build`.
7. Never leave absolute paths in manifests.

On failure, the artifact mode restores all dependency files and exits unsuccessfully, because the pipeline runs unattended. The existing build-from-upstream mode keeps its current behaviour: it leaves the candidate installed for diagnosis and prints where the manifest backups are.

Brutalist releases are pushed to GitHub (`main` and a version tag) before any app installs them, so every machine and CI build resolves the same package.

## Rules for agents working in the app

Recorded in [AGENTS.md](../../AGENTS.md) and [FRONTEND.md](../../FRONTEND.md):

- Never edit the Brutalist repository, the vendored archive or `node_modules` from the app.
- Request design-system changes through the change protocol. The owner's standing approval covers additive requests from this app; breaking changes need owner approval.
- Every release must pass Brutalist verification and the app's install checks before use.
- While a request is open, use the documented native fallback and keep the gap entry current.

## Rollout

| Step | Work | Done when |
| --- | --- | --- |
| 1 | Adoption fixes that need no upstream change (see [audit](../design-system/adoption-audit.md#adopt-now)) | Listed items use Brutalist components; gap list updated |
| 2 | App install mode `--artifact/--commit`; Brutalist pipeline calls it; releases pushed to GitHub | A pipeline release installs into the app and passes `design-system:check`, tests and build with no absolute paths |
| 3 | Protocol v2: single allowed-paths list, pull mode, adapter contract, `CLAUDE.md` in Brutalist | The same request can be completed by Codex, Claude Code and a person |
| 4 | Checkable gap list; breaking-change gate | A stale gap entry and a removed export are both caught automatically |
| 5 | First requests from the audit (routed steps first) | Fallbacks replaced and gap entries closed |

Step 5 is needed before the project page interface (roadmap milestone M2).

## Decided choices

Settled on 17 September 2026 ([decision log](../product/decisions.md)).

| Question | Decision |
| --- | --- |
| Gap list storage | JSON file rendered into the documentation page (D24) |
| Release version scheme (currently fixed `0.1.0-atomic.0`) | Semantic versions before 1.0: patch for additive, minor for breaking (D25) |
| Where the queue runs; Observatory | Owner's machine for the pilot; Observatory reporting optional (D26) |
| Pull-mode claims | Do not expire; released explicitly (D27) |
| Agents and Observatory | Agents do not use Observatory (D30) |
