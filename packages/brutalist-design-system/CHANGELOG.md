# Changelog

Before 1.0, patch versions add capabilities and minor versions contain breaking changes (Automation Studio decision D25). Breaking changes record the owner's approval.

## 0.1.2 — 17 September 2026

- Added `TagInput`: free-text tags added with Enter, styled as a dashed, tag-shaped entry control inline with the existing tags that grows into the rest of its row, so its placeholder can carry a full sentence (closes gap R7). Typed text is trimmed, deduplicated case-insensitively and length-limited; Backspace on an empty entry removes the last tag; blur commits a pending entry.
- Removable `Tag`s and `RadioGroup` tags-variant choices now lift on hover and focus, matching `Button` and `Panel`. Plain, non-removable tags are unaffected — they are not interactive.

## 0.1.1 — 17 September 2026

- `RadioGroup` gains `variant: 'default' | 'tags'`. The tags variant draws the options as wrapping, tag-shaped choices that remain native radios; its custom answer field appears only while the custom option is selected.
- `RangeSlider` handles share one scale: both span the full range and are clamped so they never cross. Previously each handle's range stopped at the other, so the handles were drawn on different scales and the upper handle locked when both sat at the maximum.

## 0.1.0

- The version imported into Automation Studio as a workspace package (commit `50c322c`).
