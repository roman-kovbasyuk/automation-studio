# Dropdowns implementation plan

Approved scope: group single-select, multi-select, and icon options under Dropdowns. Menu remains separate. Reuse shared controls and token styling; retain public export names and old anchor destinations. No unrelated review changes or publication.

Architecture: catalog composition owns examples; Select owns optional option icons. MultiSelect remains a distinct control grouped in the same catalog section, not an API alias.

- [x] Add regression coverage for a reachable Dropdowns section containing both controls and working icon selection.
- [x] Add optional IconName to SelectOption; render decorative icons alongside item text.
- [x] Extract DropdownsCatalog, move both specimens into it, add icon example, retain disabled/error filters and empty placeholder.
- [x] Update manifest grouping without treating MultiSelect as an alias. Preserve old section anchors inside the group.
- [x] Run atomic tests, boundaries, typecheck, build, and browser interaction check.

Verification: 70 atomic tests and 6 boundary tests pass; typecheck, source boundaries, catalog and library builds pass. Browser checked desktop and 390px: icon selection, multi-selection, tags, and reachable anchor. Detector reports no findings. Existing catalog bundle-size warning remains. Observatory harness still encounters the pre-existing native Node assertion; no Observatory behavior changed.
