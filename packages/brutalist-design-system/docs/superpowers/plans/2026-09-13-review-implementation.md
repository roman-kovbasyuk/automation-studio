# Review rounds 1–2 implementation

**Goal:** Implement the approved review, personally, in the atomic worktree. No commits or publishing.
**Spec:** docs/reviews/2026-09-13-component-review-round-1.md (user approved implementation).
**Architecture:** Keep Atoms → Components → catalog composition. Preserve compatibility exports for consolidated presentations. Native calendar and select popups become canonical accessible custom panels. New control behavior is tested before implementation.

## Resolved defaults

- Checkbox +25%; single inset-equivalent 2px focus stroke without layout movement.
- Icon explorer searches the canonical library, copies canonical Icon component usage; expose full Lucide names through Icon while preserving aliases.
- Custom answers in RadioGroup and Select, with separate controlled custom value.
- Alert is the target of circular status icons. Tag owns status variants; StatusBadge becomes compatibility composition. SegmentedControl remains a value-selection compatibility API, Tabs uses the same segmented visual treatment. Catalog groups aliases together.
- Inline confirmation: question/actions in a warm-gray inline row, supporting text below.
- Uploads are explicitly simulated in catalog; real files validated locally, no server destination.

## Execution

- [x] Test custom selection/calendar, internal dismissal, upload states and family compatibility (red).
- [x] Implement shared fields, dropdown family, custom calendar, custom RadioGroup answer.
- [x] Implement compact tags/toast dismissal, segmented Tabs, circular workflows, sortable header treatment and upload states.
- [x] Refine catalog: icon search/size/copy, motion previews, alignment examples, state filters, city search, dialog types, upload lifecycle, skeleton composition; remove redundant narration.
- [x] Run tests, boundaries, typechecks, builds and fresh package consumer. Batched desktop/mobile browser review, one correction pass if needed. Record coverage and any limitations.
