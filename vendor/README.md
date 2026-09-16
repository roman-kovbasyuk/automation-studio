# Local design-system candidate

The package archive is built from the shared `brutalist-design-system` source
repository and pinned by integrity in package-lock.json. It includes the optional
InlineText autosave mode and DecisionNotice. Keeping the candidate here makes
this checkout installable before the next public design-system release.

Rebuild with `npm run check` and `npm pack` in the design-system repository,
replace the archive here, then run `npm install ./vendor/roman-kovbasyuk-banner-design-system-0.1.0.tgz`.

The 8 September candidate also carries the ActionCard visibility correction from
`src/components/design-system/action-card.css`: highlighted cards do not pin hover
actions open, and keyboard focus uses `:focus-visible`. Carry this CSS correction
forward when rebuilding the upstream candidate. Touch actions remain visible.
