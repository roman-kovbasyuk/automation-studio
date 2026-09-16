import type { ReactNode } from 'react'
import { tokens, typography } from '../../atoms'
import Color, { SemanticColor } from './examples/Color'
import Typography, { SemanticTypography } from './examples/Typography'
import Spacing, { SpacingComposition } from './examples/Spacing'
import Shape, { ControlSizing } from './examples/Shape'
import Elevation, { Layers } from './examples/Elevation'
import Motion, { MotionFeedback } from './examples/Motion'
import Icons, { IconSizes } from './examples/Icons'
import Layout, { ContainedLayout } from './examples/Layout'
import { toPublicSource } from './sourceFormatting'

const sources = import.meta.glob('./examples/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
export function publicSource(filename: string) {
  return toPublicSource(sources[`./examples/${filename}.tsx`])
}
export type ReferenceRow = { name: string; value: string; purpose: string }
export type BasicsPage = {
  id: string; title: string; description: string; sourceFile: string; preview: ReactNode
  example: { title: string; description: string; preview: ReactNode }
  reference: ReferenceRow[]; notes: string[]
}
function tokenRows(...groups: (keyof typeof tokens)[]): ReferenceRow[] {
  const flatten = (value: Record<string, unknown>, namePrefix: string, purposePrefix: string): ReferenceRow[] => Object.entries(value).flatMap(([key, entry]) => {
    if (typeof entry === 'object' && entry !== null) return flatten(entry as Record<string, unknown>, `${namePrefix}-${key}`, `${purposePrefix}.${key}`)
    return [{ name: `${namePrefix}-${key}`, value: String(entry), purpose: `${purposePrefix}.${key}` }]
  })
  return groups.flatMap(group => flatten(tokens[group] as Record<string, unknown>, `--a-${group}`, `tokens.${group}`))
}
const prop = (name: string, value: string, purpose: string): ReferenceRow => ({ name, value, purpose })

export const basicsPages: BasicsPage[] = [
  {
    id:'color', title:'Color', sourceFile:'Color', description:'A small, shared palette for surfaces, text, actions and feedback. Every component reads from these tokens.', preview:<Color />,
    example:{ title:'Semantic color', description:'Use ink on accent for readable actions. Give every status a label so meaning survives without color.', preview:<SemanticColor /> },
    reference:tokenRows('color'), notes:['Wrap the application in AtomsRoot to expose the shared CSS variables.', 'Use secondary for supporting copy; use surface and canvas to distinguish content from its surrounding area.', 'Status colors support the message. They do not replace text or an icon.'],
  },
  {
    id:'typography', title:'Typography', sourceFile:'Typography', description:'One type scale for hierarchy and readable content. Choose semantic heading levels independently of their visual size.', preview:<Typography />,
    example:{title:'Semantics and visual size', description:'A level-two heading can use the h4 visual role while preserving the document outline.', preview:<SemanticTypography />},
    reference:[...Object.entries(typography).map(([name, value]) => prop(name, `${value.size} / ${value.line} · ${value.weight}`, 'Size / line height · font weight')),...tokenRows('font'),prop('Heading.level','1 | 2 | 3 | 4 | 5 | 6','Required semantic heading level.'),prop('Heading.variant','h1 … h7','Defaults to the level; selects the visual role.'),prop('Text.variant','h1 … h7 | leadLarge | leadMedium | body | small','Defaults to body.'),prop('Text.as','p | span | div','Defaults to p.'),prop('Text.tone','ink | secondary | inherit','Defaults to ink.')], notes:['Heading and Text preserve native HTML attributes.', 'The font stack tries Avenir Next and Avenir before the configured fallbacks.', 'Use one page h1 and a logical heading sequence; visual size alone does not set semantics.'],
  },
  {
    id:'spacing', title:'Spacing', sourceFile:'Spacing', description:'A consistent spacing scale for gaps and padding. Compose layouts with token values instead of local spacing rules.', preview:<Spacing />,
    example:{title:'Spacing in composition',description:'Stack separates related groups. Inline spaces items horizontally and wraps when space becomes limited.',preview:<SpacingComposition />},
    reference:[...tokenRows('space'),prop('Stack.gap / Inline.gap / Grid.gap','0 | 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16','Scale keys, not raw pixel values. Stack and Grid default to 4; Inline defaults to 2.')],notes:['The scale key 6 resolves to 24px; it is not a literal six-pixel gap.', 'Prefer gap on layout primitives to per-child margins.'],
  },
  {
    id:'shape', title:'Shape & sizing', sourceFile:'Shape', description:'Shared radii, control dimensions and focus settings keep every surface and interaction consistent.', preview:<Shape />,
    example:{title:'Control sizes and focus',description:'These are the existing Button sizes and disabled state. Keyboard focus uses the shared focus tokens.',preview:<ControlSizing />},
    reference:tokenRows('radius','border','size','focus','state'),notes:['Surface defaults to the large radius. Pass a supported radius name to change it.', 'Default and compact Button heights are 48px and 44px. The 32px small token is not a universal touch target.', 'Do not remove focus outlines or communicate disabled state by color alone.'],
  },
  {
    id:'elevation', title:'Elevation', sourceFile:'Elevation', description:'Hard shadows separate surfaces. Layer tokens control which overlay appears in front.', preview:<Elevation />,
    example:{title:'Stacking layers',description:'Base content, popovers, modal dialogs and toasts each have an explicit layer. Shadow and stacking are independent.',preview:<Layers />},
    reference:[...tokenRows('shadow','layer'),prop('Surface.elevation','none | small | interactive | floating','Defaults to none. Changes shadow only.')],notes:['Use our Panel for framed groups of content and controls.', 'Use Surface when you need a passive surface with no built-in heading.', 'Shared overlays own focus management and stacking; compose those controls instead of rebuilding them.'],
  },
  {
    id:'motion', title:'Motion', sourceFile:'Motion', description:'Short transitions explain interaction and state changes. Shared controls own the motion they use.', preview:<Motion />,
    example:{title:'Interaction feedback',description:'Hover or focus the shared controls to see their existing feedback. System reduced-motion settings are respected.',preview:<MotionFeedback />},
    reference:tokenRows('motion'),notes:['Use fast for immediate feedback and disclosure for opening and closing content.', 'Honor prefers-reduced-motion for custom motion. Our controls already include their own reduced-motion rules.', 'Use busy on Button for an operation in progress; repeated activation is blocked.'],
  },
  {
    id:'icons', title:'Icons', sourceFile:'Icons', description:'Find icons in the shared Lucide registry and render them through Icon for consistent stroke, sizing and accessibility.', preview:<Icons />,
    example:{title:'Sizes and accessible names',description:'Use one of five named sizes. Meaningful standalone icons have a label; decorative icons stay hidden from assistive technology.',preview:<IconSizes />},
    reference:[...tokenRows('icon'),prop('Icon.name','IconName','Required key from the exported icons registry.'),prop('Icon.size','small | medium | large | xlarge | display','Defaults to medium.'),prop('Icon.label','string | undefined','Supply for a meaningful standalone icon. Omit for decoration.'),prop('Icon.className','string | undefined','Optional composition class.')],notes:['Search uses the actual exported icon names, including the system aliases.', 'Use the shared Icon component instead of importing Lucide directly into product screens.'],
  },
  {
    id:'layout', title:'Layout', sourceFile:'Layout', description:'Compose responsive pages from small, shared layout primitives. Each one has a single job and uses the same spacing scale.', preview:<Layout />,
    example:{title:'Contained and scrollable content',description:'Limit reading width with Container, group content on Surface, and give overflow a named keyboard-accessible ScrollArea.',preview:<ContainedLayout />},
    reference:[prop('AtomsRoot','className, style, native div attributes','Provides token variables, font and root styles.'),prop('Stack.gap','Space · default 4','Vertical flow.'),prop('Inline.gap','Space · default 2','Horizontal, wrapping flow.'),prop('Grid.gap / minItemWidth','Space / string · defaults 4 / 16rem','Responsive auto-fit columns.'),prop('Container.maxWidth','string · default 72rem','Centered, constrained width.'),prop('Surface.as','div | section | article | aside','Default div. Semantic wrapper.'),prop('Surface.padding / radius','Space / radius key · defaults 8 / large','Shared spacing and shape.'),prop('Surface.tone / elevation','canvas | surface / shadow key','Defaults surface / none.'),prop('Divider','Native hr attributes','Full-width structural rule.'),prop('ScrollArea.label / maxHeight','string / string · default 16rem','Label is required; region is keyboard focusable.')],notes:['Layout primitives accept native HTML attributes and className/style for composition.', 'Grid collapses when its parent is narrow; Inline wraps by default.', 'Use Panel for content sections with titles; Surface is the underlying passive surface.'],
  },
]
