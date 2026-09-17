# Template creation

[Product recipes](/workflow) · **Status:** Persisted recipe authoring and simulation; live runtime and renderer planned.

Create a reusable template that other product recipes can consume. A template defines layout and content constraints; a recipe defines the process that creates or uses it.

[Open Product recipes →](http://127.0.0.1:5181/mvp/admin/recipes?demoRole=admin#admin-product-recipes) — select **Template creation**. Save, validate, simulate and publish its definition. The initial policy asks for brief, format, editable fields and constraints when absent. Simulation does not create a production template artifact.

## Inputs and outcome

**Inputs:** supported product family, required and optional content slots, published application-managed design system, allowed variants and intended output formats.

**Proposed steps:** define blueprint → bind design context → create controlled variants → validate sample-content fit → approve and publish contract.

**Intended outcome:** a versioned template with editable slots, explicit constraints, supported variants and validated examples. Existing projects must retain access to the template version they used.

## Clarification points

Ask which products consume the template, which dimensions may vary, which brand version applies and who can approve publication when these choices are missing.

Check schema validity and sample-content fit before publication. Runtime support for each product type is separate from creating a template preview.

See [Product logic designer](/decisions/asset-workflows) for the shared publishing model.
