---
name: Application visual guide
description: Visual principles for composing and extending the Brutalist UI foundation.
---

# Application visual guide

## Overview

Create a coherent working environment with clear hierarchy, readable state and deliberate emphasis. Useful content and actions receive the space. The interface remains visually consistent across components, surfaces and flows.

This guide explains how to apply the visual foundation. [FRONTEND.md](FRONTEND.md) governs process, behavior, ownership, master/descendant contracts and acceptance. The installed `brutalist-design-system` package owns actual tokens, component appearance and shared interactions. Read its public contracts before implementation; this file does not define a second token source.

**Inherit the foundation.** Descendants use their master’s supported variants and composition rules. Content or domain differences do not justify a new visual language. Record instance-specific choices in the [design brief](docs/design-system/page-brief-template.md).

**Keep design contexts separate.** Operational controls use the application foundation. Generated artifacts and bounded specimens use their published output system. Output styling must not escape into application controls or containers.

## Colors

Use the foundation’s semantic color roles consistently: canvas, surface, text, action, selection and feedback. Select an available role for its meaning, not merely because its hue suits the composition.

- Let neutral surfaces carry most of the interface; reserve emphasis for meaningful actions and state.
- Keep the same meaning for a role across every descendant. Pair status color with readable text or another accessible indicator.
- Keep text, focus and state indicators legible against their actual backgrounds.
- Use supported themes and variants. Do not introduce local palettes, redefine upstream tokens or theme the interface from an output system.

Resolve exact values from the installed package. A specimen’s palette is artifact content, not an application theme.

## Typography

Use the foundation’s public typography roles and font family. Establish a readable hierarchy through their supported size, weight and line-height relationships.

- Make the primary subject clear, then distinguish sections, working content and supporting metadata.
- Choose visual roles for information importance and semantic heading levels for document structure; these are separate decisions.
- Keep labels concise and essential content readable. Allow realistic text to wrap instead of shrinking it to fit a preferred screenshot.
- Preserve the same role for equivalent content across descendants. Do not introduce display fonts, decorative capitals or custom letter spacing locally.

Artifact typography remains inside the output boundary and follows its own versioned contract.

## Layout

Compose from the approved master pattern. Preserve its hierarchy, action placement, reading order and responsive relationships. Arrange public components with supported layout APIs or plain application-owned containers.

**Space expresses relationships.** Use the public spacing scale to distinguish related items from separate groups. Keep alignment and spacing consistent across siblings. Fix unnecessary nesting and poor width allocation before adding padding.

- Give the task’s input, decision or result priority in the available area.
- Keep controls close to the content they govern and feedback close to the operation it describes.
- Use plain regions for ordinary grouping; each additional container must have a structural purpose.
- Adapt columns and controls to the available width while preserving reading order and reachable actions. Contain genuinely two-dimensional content without forcing the entire document to scroll sideways.
- Respect content proportions and long-content behavior. Resizing the interface must not distort embedded artifacts.

Page dimensions and breakpoints belong in the governing pattern or instance brief. They are not universal values invented by this guide.

## Elevation & Depth

Use the foundation’s supported borders, surfaces and depth treatments to express containment, interactivity or layering. Preserve the treatment supplied by each component and variant.

Reserve prominent elevation for a meaningful relationship. Avoid stacking decorated panels, adding shadows to every group or making static regions appear interactive. An overlay’s depth must agree with its actual focus and interaction behavior.

Do not add local shadow, border or backdrop overrides to upstream components.

## Shapes

Inherit corner, outline, icon and control geometry from the component contract. Different component families may intentionally use different shapes; a universal radius or border rule would erase those distinctions.

Use supported size variants for density and interaction needs. Preserve usable targets, focus treatment and text fit. App-owned layout must not stretch or clip a component into an unsupported shape.

## Components

Reuse public components directly and compose through supported props, variants and slots. A local adapter may translate application values or callbacks without changing visual identity or interaction.

- Keep equivalent actions visually equivalent; use emphasis according to consequence and context.
- Preserve meaningful selected, disabled, busy, error and focus states. A descendant must not redefine what those states communicate.
- Keep accessible labels and keyboard behavior intact. Decorative icons must not replace necessary information.
- Use upstream motion for shared interactions. Application-owned motion should explain a state or spatial change, use available motion tokens and respect reduced motion. Routine work must remain immediately accessible.

Never target private component classes, pass local `className`/`style` skins to upstream roots or reproduce the skin through ancestor selectors. When the required interaction is unavailable, follow the native-fallback policy and record it in [component gaps](docs/design-system/missing-components.md).

## Do's and Don'ts

**Do**

- Identify the master, its guarantees and the permitted variation before composing a descendant.
- Read exact tokens and APIs from the installed foundation.
- Use hierarchy, alignment and restrained emphasis to make work understandable.
- Verify realistic content, narrow layouts, keyboard use and difficult states according to [the acceptance contract](FRONTEND.md#11-verification-and-acceptance).

**Don't**

- Copy token values or component skins into a competing local system.
- Treat visual nesting as permission to override a child’s design ownership.
- Add decoration that obscures task priority or implies an unavailable interaction.
- Place named screens, brand examples, fixed flow sequences or implementation inventories in this general guide.

Earlier guidance is retained in [the historical archive](docs/archive/product-v1/DESIGN.history.md). It is not current implementation authority.
