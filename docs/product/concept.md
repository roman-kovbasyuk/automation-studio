# Product concept

**Status:** Target · **Updated:** 16 September 2026 · **Owner:** Roman Kovbasyuk

## What Automation Studio is

Automation Studio produces on-brand content automatically. It is built on four layers:

1. **Brand.** A company's design system: colors, typography, logos, voice, wording rules, image style and mandatory lines. Every asset starts here.
2. **Templates.** Layouts for each asset type, built on the brand. A template refers to brand roles, never to copied values.
3. **Recipes.** AI workflows that turn a brief into a finished asset using the brand and its templates.
4. **Escalation.** When automatic quality is not good enough, the work goes to the design team, who elevate it and return it.

The aim is content that is acceptable without a designer most of the time, and a clear path to a designer when it is not.

Banners are the first asset type and decks the second. Every asset type uses the same flow.

## The asset creation flow

A user starts an **asset creation flow** for one asset type. Every flow has four stages:

```text
Brief → Copy → Visuals → Assets
```

| Stage | What happens |
| --- | --- |
| **Brief** | The user supplies text and materials. AI extracts the facts, finds existing copy and asks only for missing inputs. The user confirms the brief. |
| **Copy** | The user's own copy, AI-written options, or both. The user edits and selects. |
| **Visuals** | AI-generated imagery and, optionally, the user's own images. |
| **Assets** | Templates are filled, rendered and checked automatically. The user accepts and downloads, or requests design help. Escalated work returns here from the design team. |

The recipe for an asset type decides what happens inside each stage. For example, Copy is five headline options for a banner set, and an outline plus slide text for a deck.

## Principles

1. **The brand is the foundation.** Every flow pins a brand version. Brand guidance reaches both the AI and the templates.
2. **AI proposes, templates compose, people decide.** AI creates text and imagery. Layout comes from deterministic templates. People confirm, select and accept.
3. **Automatic by default, designer by exception.** Designer review is an escalation path, not a mandatory step.
4. **Quality is measured, not assumed.** Automatic checks decide whether an asset is acceptable and when to escalate.
5. **Always show the state.** At every moment the user can see what is done, what is running, whose turn it is and the next action.
6. **Nothing locks work.** Every failure offers a way forward: retry, edit, continue manually or escalate.
7. **No surprise AI work.** Opening, refreshing or navigating never starts generation. Only explicit actions do.

## Who uses it

| Role | Needs |
| --- | --- |
| **Marketer / requester** | Turn a brief into finished, on-brand assets quickly; understand the state of the work; ask for design help when needed. |
| **Designer** | Maintain brands and templates; receive escalations with clear reasons; return elevated work. |
| **Our team (pilot)** | Write and maintain recipes; operate the system; measure quality. |

## What the pilot must prove

- Brand, templates and recipes produce acceptable banners and decks without a designer for a meaningful share of briefs.
- Escalation works as a round trip and its reasons are visible.
- The same recipe works across brands.

See the [roadmap](roadmap.md) for scope, milestones and measures, the [glossary](glossary.md) for terms, and the [decision log](decisions.md) for the decisions behind this page.
