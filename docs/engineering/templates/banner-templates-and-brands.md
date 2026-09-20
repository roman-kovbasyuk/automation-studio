# Banner templates and brands

**Status:** Current implementation · **Updated:** 17 September 2026

Brand systems are separate from the application UI design system. `shared/resolveTemplateBrand.js` maps a published brand's palette and typography roles, and its approved primary logo, into a template's geometry and saves an immutable resolved manifest. The browser preview (`AnimatedBanner`) and the PNG renderer consume the same resolved manifest.

- Assigning a brand (`POST /api/v1/brand-design-systems/:brandId/templates`, admins only) creates **new versions of the shared templates**. Publishing or restoring a brand refreshes assigned templates. Existing template and campaign snapshots stay unchanged.
- Supported fonts: Inter and OFL-licensed Arimo at weights 400, 600 and 700. Arimo is the Arial-compatible substitute used for the MSD reference.
- Local fixtures: `node scripts/setup-msd-templates.mjs` (blocked in production).

The target model changes this: templates reference brand roles and each asset creation flow pins its brand ([D2](../../product/decisions.md)). See [known issues](../known-issues.md#product-model-gaps).

The in-app banner template editor was removed in M0 ([D38](../../product/decisions.md)); its earlier implementation is available in Git history.
