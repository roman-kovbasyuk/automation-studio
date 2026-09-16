# Brand library and overview

The brand library uses ActionCard and AppButton from the application design system. Each card contains the same BrandIdentityPreview used on its detail page: an approved primary logo, a heading specimen, and the brand palette. Application controls and headings retain app tokens; brand fonts and colors appear only inside specimens.

Every existing brand opens at `/mvp/system/:id` with the same overview, whether draft or published. The status is truthful and font availability is called out beside typography. Edit system opens the existing review wizard. Source provenance is retained in a collapsed Source notes disclosure. Color copying uses TokenCopyTarget. AI proposals remain reviewable and sit inline after Assets.

Library cards use two columns above 1000px; overviews stack their header actions below that width. At 600px, palette tiles use two columns and type scale rows wrap. These are content-fit breakpoints; no viewport from a browser annotation is hardcoded.

Known demo QA brands can be archived reversibly using `node scripts/cleanup-demo-brand-library.mjs`. The script only targets named fixture records in the local demo database. An explicitly selected demo role persists after the development server confirms a demo session; production authentication does not read that stored role.
