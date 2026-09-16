import type { CSSProperties } from 'react'

/** The only value source for the rewrite. Catalog and primitives consume this object. */
export const tokens = {
  color: {
    earthy: { 0: '#f4f4f0', 50: '#efeee8', 100: '#e5e3da', 200: '#d4d0c3', 300: '#bcb6a5', 400: '#9f9784', 500: '#827966', 600: '#685f50', 700: '#4f493d', 800: '#38342d', 900: '#24221e', 950: '#151411' },
    gray: { 0: '#ffffff', 50: '#f7f7f7', 100: '#eeeeee', 200: '#dddddd', 300: '#c8c8c8', 400: '#adadad', 500: '#919191', 600: '#737373', 700: '#555555', 800: '#3b3b3b', 900: '#252525', 950: '#171717' },
    slate: { 0: '#f8fafc', 50: '#f1f5f9', 100: '#e2e8f0', 200: '#cbd5e1', 300: '#94a3b8', 400: '#64748b', 500: '#475569', 600: '#334155', 700: '#1e293b', 800: '#0f172a', 900: '#020617', 950: '#01030a' },
    red: { 0: '#fff5f5', 50: '#ffe3e3', 100: '#ffc9c9', 200: '#ffa8a8', 300: '#ff8787', 400: '#ff6b6b', 500: '#fa5252', 600: '#f03e3e', 700: '#e03131', 800: '#c92a2a', 900: '#b91c1c', 950: '#7f1d1d' },
    orange: { 0: '#fff4e6', 50: '#ffe8cc', 100: '#ffd8a8', 200: '#ffc078', 300: '#ffa94d', 400: '#ff922b', 500: '#fd7e14', 600: '#f76707', 700: '#e8590c', 800: '#d9480f', 900: '#c2410c', 950: '#7c2d12' },
    amber: { 0: '#fff8e1', 50: '#ffecb3', 100: '#ffe082', 200: '#ffd54f', 300: '#ffca28', 400: '#ffb300', 500: '#f59f00', 600: '#f08c00', 700: '#e67700', 800: '#d97706', 900: '#b45309', 950: '#78350f' },
    yellow: { 0: '#fffde7', 50: '#fff9c4', 100: '#fff59d', 200: '#fff176', 300: '#ffee58', 400: '#ffeb3b', 500: '#fdd835', 600: '#fbc02d', 700: '#f9a825', 800: '#f59e0b', 900: '#ca8a04', 950: '#713f12' },
    green: { 0: '#ebfbee', 50: '#d3f9d8', 100: '#b2f2bb', 200: '#8ce99a', 300: '#69db7c', 400: '#51cf66', 500: '#40c057', 600: '#37b24d', 700: '#2f9e44', 800: '#2b8a3e', 900: '#237b3b', 950: '#14532d' },
    teal: { 0: '#e6fcf5', 50: '#c3fae8', 100: '#96f2d7', 200: '#63e6be', 300: '#38d9a9', 400: '#20c997', 500: '#12b886', 600: '#0ca678', 700: '#099268', 800: '#087f5b', 900: '#067a68', 950: '#064e3b' },
    cyan: { 0: '#e3fafc', 50: '#c5f6fa', 100: '#99e9f2', 200: '#66d9e8', 300: '#3bc9db', 400: '#22b8cf', 500: '#15aabf', 600: '#1098ad', 700: '#0c8599', 800: '#0b7285', 900: '#0e7490', 950: '#164e63' },
    blue: { 0: '#f5faff', 50: '#e8f3ff', 100: '#cfe6ff', 200: '#a6d2ff', 300: '#72b8ff', 400: '#3d98f5', 500: '#1677d2', 600: '#0d5eac', 700: '#0b4a86', 800: '#0b3b69', 900: '#0b3155', 950: '#061d35' },
    indigo: { 0: '#edf2ff', 50: '#dbe4ff', 100: '#bac8ff', 200: '#91a7ff', 300: '#748ffc', 400: '#5c7cfa', 500: '#4c6ef5', 600: '#4263eb', 700: '#3b5bdb', 800: '#364fc7', 900: '#3046a8', 950: '#1e2a78' },
    violet: { 0: '#f3f0ff', 50: '#e5dbff', 100: '#d0bfff', 200: '#b197fc', 300: '#9775fa', 400: '#845ef7', 500: '#7950f2', 600: '#7048e8', 700: '#6741d9', 800: '#5f3dc4', 900: '#5235a6', 950: '#312e81' },
    purple: { 0: '#f8f0fc', 50: '#f3d9fa', 100: '#eebefa', 200: '#e599f7', 300: '#da77f2', 400: '#cc5de8', 500: '#be4bdb', 600: '#ae3ec9', 700: '#9c36b5', 800: '#862e9c', 900: '#70248f', 950: '#581c87' },
    pink: { 0: '#fff0f6', 50: '#ffdeeb', 100: '#fcc2d7', 200: '#faa2c1', 300: '#f783ac', 400: '#f06595', 500: '#e64980', 600: '#d6336c', 700: '#c2255c', 800: '#a61e4d', 900: '#9d174d', 950: '#701a40' },
    rose: { 0: '#fff1f2', 50: '#ffe4e6', 100: '#fecdd3', 200: '#fda4af', 300: '#fb7185', 400: '#f43f5e', 500: '#e11d48', 600: '#be123c', 700: '#9f1239', 800: '#881337', 900: '#701a35', 950: '#4c0519' },
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
