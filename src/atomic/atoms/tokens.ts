import type { CSSProperties } from 'react'

/** The only value source for the rewrite. Catalog and primitives consume this object. */
export const tokens = {
  color: {
    earthy: { 0: '#f4f4f0', 50: '#efeee8', 100: '#e5e3da', 200: '#d4d0c3', 300: '#bcb6a5', 400: '#9f9784', 500: '#827966', 600: '#685f50', 700: '#4f493d', 800: '#38342d', 900: '#24221e', 950: '#151411' },
    gray: { 0: '#ffffff', 50: '#f7f7f7', 100: '#eeeeee', 200: '#dddddd', 300: '#c8c8c8', 400: '#adadad', 500: '#919191', 600: '#737373', 700: '#555555', 800: '#3b3b3b', 900: '#252525', 950: '#171717' },
    blue: { 0: '#f5faff', 50: '#e8f3ff', 100: '#cfe6ff', 200: '#a6d2ff', 300: '#72b8ff', 400: '#3d98f5', 500: '#1677d2', 600: '#0d5eac', 700: '#0b4a86', 800: '#0b3b69', 900: '#0b3155', 950: '#061d35' },
    static: { black: '#000000', white: '#ffffff' },
    canvas: '#f4f4f0', surface: '#ffffff', ink: '#000000', secondary: '#595959', accent: '#79d9ff', success: '#23a094', danger: '#dc341e', editHighlight: 'rgb(0 0 0 / 3%)', backdrop: 'rgb(0 0 0 / 35%)'
  },
  space: { 0: '0px', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px', 12: '48px', 16: '64px' },
  radius: { none: '0px', small: '4px', large: '20px', pill: '999px' },
  border: { width: '1px' },
  size: { control: '48px', compact: '44px', small: '32px', choice: '20px', marker: '10px', switchHeight: '28px' },
  icon: { small: '16px', medium: '20px', large: '24px', xlarge: '32px', display: '48px' },
  shadow: { none: 'none', small: '2px 2px 0 var(--a-color-ink)', interactive: '4px 4px 0 var(--a-color-ink)', floating: '8px 8px 0 var(--a-color-ink)' },
  motion: { fast: '150ms', disclosure: '200ms', ease: 'cubic-bezier(0.4, 0, 0.2, 1)', out: 'cubic-bezier(0.22, 1, 0.36, 1)', lift: '-2px', liftStrong: '-4px', spin: '1s' },
  state: { disabled: '0.45' },
  focus: { width: '2px', offset: '4px' },
  layer: { base: '0', popover: '20', modal: '40', toast: '60' },
  font: { family: '"Avenir Next", Avenir, Montserrat, Corbel, "URW Gothic", sans-serif' },
} as const

export const typography = {
  h1: { size: '48px', line: '52px', weight: 500 },
  h2: { size: '32px', line: '36px', weight: 500 },
  h3: { size: '24px', line: '28px', weight: 500 },
  h4: { size: '20px', line: '24px', weight: 500 },
  h5: { size: '18px', line: '24px', weight: 600 },
  h6: { size: '16px', line: '22px', weight: 600 },
  h7: { size: '14px', line: '20px', weight: 600 },
  leadLarge: { size: '24px', line: '36px', weight: 500 },
  leadMedium: { size: '20px', line: '28px', weight: 500 },
  body: { size: '16px', line: '22px', weight: 400 },
  small: { size: '14px', line: '20px', weight: 400 },
} as const

export type Space = keyof typeof tokens.space
export type TypeRole = keyof typeof typography
export type HeadingRole = Extract<TypeRole, `h${number}`>
export type TextRole = Exclude<TypeRole, HeadingRole>

export const tokenVariables = Object.fromEntries([
  ...Object.entries(tokens).flatMap(([group, values]) => { const flatten = (obj: Record<string, unknown>, prefix: string): [string, string][] => Object.entries(obj).flatMap(([name, value]) => typeof value === 'object' ? flatten(value as Record<string, unknown>, `${prefix}-${name}`) : [[`--a-${prefix}-${name}`, String(value)]]); return flatten(values as Record<string, unknown>, group) }),
  ...Object.entries(typography).flatMap(([role, values]) => Object.entries(values).map(([name, value]) => [`--a-type-${role}-${name}`, String(value)])),
]) as CSSProperties

export const typeVariables = (role: TypeRole): CSSProperties => ({
  fontSize: `var(--a-type-${role}-size)`, lineHeight: `var(--a-type-${role}-line)`, fontWeight: `var(--a-type-${role}-weight)`,
})
