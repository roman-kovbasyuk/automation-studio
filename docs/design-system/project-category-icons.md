# Sidebar project category icons

Project links reuse the Lucide icon assigned to their creation type in the template catalog. Icons are 16px, do not shrink, and use the template category accent mixed with 35% ink for legibility at small sizes: cyan for Ads, teal for Web, red for Presentations, and yellow for Other. The existing UpdatedText title retains truncation and update feedback. An 8px token gap separates the icon and title. The link tooltip and accessible description identify its type; icons are decorative. Pinned, recent, and mobile lists share the same markup.

`shared/projectTypes.js` is the common catalog for creation choices, template groups, labels, icons, and validated API IDs. A persisted `projectType` is returned by project list/detail APIs. Migration 046 assigns a random type once to existing projects. New API requests accept an explicit catalog ID; existing banner clients default to banners. Duplicates retain their source type. No render-time randomization is used.

The current campaign brief creates banners. Presentation and other template previews retain their existing behavior; this change does not introduce new generation workflows. Their future creation calls can pass their catalog ID through the same validated API.
