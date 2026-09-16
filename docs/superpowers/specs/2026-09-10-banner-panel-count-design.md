# Banner panel count design

## Goal

Show the number of banner panels as the product of the distinct selected copies, distinct selected templates, and selected resize formats.

## Behavior

The Banners selection total and confirmation dialog will calculate:

`copy count × template count × resize count`

Each count is derived from the current selection:

- **Copies** are unique selected `copyId` values.
- **Templates** are unique selected template and version pairs.
- **Resizes** are selected output `ratioIds`.

The total is the multiplication of those three counts. The UI will label the factors explicitly, such as `2 copies × 3 templates × 4 sizes`, and retain the existing numeric total.

## Selection integrity

The saved payload continues to contain the existing individual design identities and selected ratio IDs. The count is a display calculation only: it does not alter server validation, template compatibility checks, saved selections, Figma handoff, or review permissions.

This makes the visible total reflect the requested copy/template/resize formula without broadening the selection model in this focused correction.

## Testing

Add a Banners selection test with more than one copy and more than one template. It will assert the three factor labels and the resulting product in both the selection bar and confirmation dialog. Existing save-payload tests remain unchanged.
