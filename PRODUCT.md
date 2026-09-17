# Product

> Short product context for design tooling. The full, current description is in [docs/product/concept.md](docs/product/concept.md); decisions are in [docs/product/decisions.md](docs/product/decisions.md). Updated 17 September 2026.

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 and Vite; the installed `brutalist-design-system` package for application UI; Fastify API; PostgreSQL; Gemini through Vertex AI in the EU; Google Cloud Storage; Firebase authentication.

## Users

- **Marketers and requesters** who need finished, on-brand content from a brief without writing prompts or assembling layouts.
- **Designers** who maintain brands and templates and elevate work that is escalated to them.
- **Our internal team**, who write recipes and operate the pilot.

## Product Purpose

Automation Studio produces on-brand content automatically. A company's brand is the foundation of every asset; templates are built on that brand; recipes turn a brief into finished assets through four stages: Brief, Copy, Visuals and Assets. When automatic quality is not good enough, the work is escalated to the design team.

Success for the proof of concept means banner sets and decks are accepted without a designer for a meaningful share of real briefs, and escalations work as a clear round trip.

## Positioning

Brand-governed automation rather than free-form generation. AI supplies text and imagery; templates guarantee brand-correct composition; people confirm, choose and accept; designers are involved by exception.

## Operating Context

Pre-pilot, with Folkeuniversitetet as the pilot brand. The current code implements a banner-only campaign flow with mandatory designer review; the target model is specified in the PRD and specifications. Brands, templates and AI generation already work locally with real providers.

## Capabilities and Constraints

- Work happens in projects; each project has one asset type, fixed at creation, and runs the same four-stage flow: Brief → Copy → Visuals → Assets.
- A banner project delivers any number of banners (PNG); a deck project delivers exactly one editable PowerPoint deck.
- Brand versions pinned per project; templates reference brand roles.
- AI analyses materials, writes copy and generates imagery; it never lays out assets or approves them.
- Automatic checks decide acceptability; escalation hands banners to designers through Figma and decks as PowerPoint files.
- No generation starts without an explicit user action.
- Asset types for the proof of concept: banner sets, then decks; deck image slots use template placeholders.
- Not in scope for the proof of concept: recipe editor interface, regulated-brand compliance workflows, newsletters and websites, PDF decks, image generation for decks, ad-platform publishing.

## Brand Commitments

Product name: Automation Studio. The application interface is quiet and operational, using the Brutalist foundation, so that produced content stands out. Produced content follows each client's published brand, never the application's styling. Interface language: English.

## Evidence on Hand

Working brand systems (Folkeuniversitetet, MSD), three banner templates, five MSD slide templates with AI content contracts, Gemini integration with validated contracts and cost limits, a Figma handoff plugin, and the Project-X FigJam flow board.

## Product Principles

1. The brand is the foundation.
2. AI proposes, templates compose, people decide.
3. Automatic by default, designer by exception.
4. Quality is measured, not assumed.
5. Always show what is done, what is running and whose turn it is.
6. Nothing locks work; every failure has a way forward.
7. No surprise AI work.

## Accessibility & Inclusion

Target WCAG 2.2 AA for the application: keyboard operation, visible focus, semantic landmarks, sufficient contrast and reduced-motion support. See [FRONTEND.md](FRONTEND.md).
