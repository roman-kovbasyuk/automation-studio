# Brand system reference page

## Identity and authority

- Surface: published brand system reference at `/mvp/system/:id`.
- Product task: let a designer or marketer understand a brand system and find the reusable output templates built from it.
- Application shell and controls inherit from Brutalist; the selected published brand snapshot owns the creative specimen values.
- The supplied Bento sketch is structural guidance. It does not replace the active system's tokens, logo, typography, or approved assets.

## Page hierarchy

1. Existing back link, system title, version actions, and shell navigation.
2. Bento inspiration board showing the active system's logo, type, palette, shape language, and component cue. Its large typography cell uses the active heading family as a repeated specimen with descending weights, rendered in the system's primary color on its canvas color. A compact metric cell demonstrates label, value, and change typography with illustrative content and active brand tokens. Folkeuniversitetet's shape-language cell uses the supplied owl as a decorative specimen, with a large wordform and soft ink shadow behind it.
3. Two top-level tabs: `Foundation` and `Templates`, with a search field in the same control row.
4. Foundation index and specimen panels for typography, logo, colors, spacing, imagery, and components.
5. Template catalog using one shared card anatomy for banners, slides, landing pages, and business cards.
6. Existing anchored reference sections for logos, colors, typography, and approved assets.

## Behavior and states

- The board and catalog are read-only references. Existing edit, history, restore, and AI proposal actions remain in their current flow.
- Search filters the active tab's items and exposes a no-results state.
- Template cards derive from `campaignKit.templates` when present and use a small fallback catalog for systems without a campaign kit.
- The same card structure is used for every brand system. Banner detail continues to own square, horizontal, and vertical variants.

## Responsive and accessibility contract

- Desktop uses the sketch's asymmetric board and a two-column Foundation catalog.
- Narrow layouts reflow the board, wrap the tab/search row, stack the Foundation index, and use one-column cards without page-level horizontal scrolling.
- Keep one page heading, semantic panel headings, labeled tabs/search, keyboard focus, visible empty states, and reduced-motion-safe CSS.

## Acceptance evidence

- `/mvp/system/:id` renders the shared Bento and exactly two showcase tabs for FOK University, MSD, and future published systems.
- Foundation and Templates switch without changing the active brand context.
- Search filters visible showcase content and announces no matches.
- Existing section hash links, download actions, editing controls, and published/read-only behavior remain available.
