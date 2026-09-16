import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Accordion, Avatar, AvatarGroup, AvatarGroupCompact, Badge, ButtonGroup, ColorPicker, CommandMenu, DigitInput, DotStepper, FancyButton, Label, Notification, TabMenuVertical, VerticalStepper } from './index'

test('reference action and identity primitives expose useful semantics', () => {
  render(<><ButtonGroup aria-label="Actions"><button type="button">Save</button><button type="button">Share</button></ButtonGroup><Avatar name="Mira Chen" status="online" /><Badge tone="success">Approved</Badge><Label required>Project name</Label></>)
  expect(screen.getByRole('group', { name: 'Actions' })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Mira Chen' })).toBeInTheDocument()
  expect(screen.getByText('Approved')).toBeInTheDocument()
  expect(screen.getByText(/Project name/)).toBeInTheDocument()
})

test('attached button groups keep only the outer corners rounded and preserve button hover elevation', () => {
  const css = readFileSync(resolve(__dirname, 'reference-components.css'), 'utf8')
  expect(css).toContain('.c-button-group--attached > *, .c-button-group--attached > * button { border-radius: 0; }')
  expect(css).toContain('.c-button-group--attached > *:first-child, .c-button-group--attached > *:first-child button { border-radius: var(--a-radius-small) 0 0 var(--a-radius-small); }')
  expect(css).toContain('.c-button-group--attached > *:last-child, .c-button-group--attached > *:last-child button { border-radius: 0 var(--a-radius-small) var(--a-radius-small) 0; }')
  expect(css).toContain('.c-button-group--attached > *:hover, .c-button-group--attached > *:focus-within, .c-button-group--attached > *:hover button, .c-button-group--attached > *:focus-within button { position: relative; z-index: 1; }')
})

test('fancy button keeps its compact two-line action treatment', () => {
  render(<FancyButton size="compact" subtitle="Open workspace">Continue</FancyButton>)
  const button = screen.getByRole('button', { name: /ContinueOpen workspace/ })
  expect(button).toHaveAttribute('data-size', 'compact')
  expect(screen.getByText('Open workspace')).toBeInTheDocument()
})

test('fancy button spacing keeps the compact action readable', () => {
  const css = readFileSync(resolve(__dirname, 'reference-components.css'), 'utf8')
  expect(css).toContain('.c-fancy-button { min-height: unset; gap: var(--a-space-6); }')
  expect(css).toContain(".c-fancy-button[data-size='compact'] { padding-block: var(--a-space-4); }")
})

test('avatar groups keep one shared size and readable initials', () => {
  render(<AvatarGroup label="Project members" items={[{ name: 'Mira Chen' }, { name: 'Jonas Weber' }, { name: 'Alex Kim' }]} />)
  const group = screen.getByRole('group', { name: 'Project members' })
  expect(group).toHaveAttribute('data-size', 'medium')
  expect(group.querySelectorAll('[data-size="medium"]')).toHaveLength(3)
  expect(screen.getByRole('img', { name: 'Mira Chen' })).toHaveTextContent('MC')
})

test('compact avatar groups use smaller initials', () => {
  render(<AvatarGroupCompact label="Compact members" items={[{ name: 'Mira Chen' }, { name: 'Jonas Weber' }]} />)
  const group = screen.getByRole('group', { name: 'Compact members' })
  expect(group).toHaveAttribute('data-size', 'small')
  expect(screen.getByRole('img', { name: 'Jonas Weber' }).querySelector('.a-type')).toHaveStyle({ fontSize: '12px' })
})

test('color picker and digit input report controlled changes', async () => {
  const user = userEvent.setup(), colorChange = vi.fn(), digitChange = vi.fn()
  render(<><ColorPicker label="Accent color" value="#000000" onChange={colorChange} /><DigitInput label="Code" value="12" length={4} onChange={digitChange} /></>)
  await user.click(screen.getByRole('button', { name: 'Use #72b8ff' }))
  expect(colorChange).toHaveBeenCalledWith('#72b8ff')
  await user.type(screen.getByRole('textbox', { name: 'Code 3' }), '3')
  expect(digitChange).toHaveBeenCalledWith('123')
})

test('digit input cells use a fixed 60px width', () => {
  const css = readFileSync(resolve(__dirname, 'reference-components.css'), 'utf8')
  expect(css).toContain('.c-digit-input input { box-sizing: border-box; flex: 0 0 60px; width: 60px;')
})

test('digit input keeps 36px vertical spacing between label and digit row', () => {
  const css = readFileSync(resolve(__dirname, 'reference-components.css'), 'utf8')
  expect(css).toContain('.c-digit-input legend { padding: 0; margin-bottom: 36px; }')
})

test('color picker exposes an editable hex value and selected preset state', async () => {
  const user = userEvent.setup(), colorChange = vi.fn()
  render(<ColorPicker label="Accent color" value="#000000" onChange={colorChange} />)
  const hex = screen.getByRole('textbox', { name: 'Accent color hex value' })
  expect(hex).toHaveValue('#000000')
  const preset = screen.getByRole('button', { name: 'Use #72b8ff' })
  expect(preset).toHaveAttribute('aria-pressed', 'false')
  await user.click(preset)
  expect(preset).toHaveAttribute('aria-pressed', 'true')
  await user.clear(hex)
  await user.type(hex, '#123456')
  await user.tab()
  expect(colorChange).toHaveBeenLastCalledWith('#123456')
})

test('accordion and tab menu reveal the selected content', async () => {
  const user = userEvent.setup()
  render(<><Accordion label="FAQ" items={[{ id: 'one', title: 'One', content: 'First answer', defaultOpen: true }, { id: 'two', title: 'Two', content: 'Second answer' }]} /><TabMenuVertical label="Sections" items={[{ id: 'a', label: 'A', content: 'A content' }, { id: 'b', label: 'B', content: 'B content' }]} /></>)
  expect(screen.getByText('First answer')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'B' }))
  expect(screen.getByText('B content')).toBeVisible()
})

test('accordion uses a full-width layout with a dedicated control column and disclosure motion', () => {
  render(<Accordion label="FAQ" items={[{ id: 'one', title: 'One', content: 'First answer', defaultOpen: true }, { id: 'two', title: 'Two', content: 'Second answer' }]} />)
  const accordion = screen.getByRole('region', { name: 'FAQ' })
  expect(accordion).toHaveClass('c-accordion')
  expect(accordion.querySelector('summary')).toBeInTheDocument()
  expect(accordion.querySelector('.c-accordion__content-inner')).toBeInTheDocument()
  const css = readFileSync(resolve(process.cwd(), 'src/atomic/components/reference-components.css'), 'utf8')
  expect(css).toMatch(/\.c-accordion\s*\{[^}]*width:\s*100%/)
  expect(css).toMatch(/\.c-accordion summary\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) var\(--a-size-compact\)/)
  expect(css).toMatch(/\.c-accordion__content\s*\{[^}]*transition:/)
})

test('steppers and command menu support selection', async () => {
  const user = userEvent.setup(), select = vi.fn()
  render(<><DotStepper label="Progress" steps={['One', 'Two']} current={0} onChange={select} /><VerticalStepper label="Steps" steps={[{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }]} current="one" onChange={select} /><CommandMenu label="Commands" items={[{ id: 'new', label: 'New project' }]} onSelect={select} /></>)
  await user.click(screen.getByRole('button', { name: 'Two' }))
  expect(select).toHaveBeenCalledWith(1)
  await user.click(screen.getByRole('button', { name: 'Commands' }))
  await user.click(screen.getByRole('button', { name: /New project/ }))
  expect(select).toHaveBeenCalledWith('new')
})

test('notification keeps a white surface and readable ink treatment', () => {
  render(<Notification title="Export complete" description="Your files are ready." tone="success" />)
  const notification = screen.getByRole('status')
  expect(notification).toHaveClass('c-banner', 'c-notification')
  expect(notification).toHaveAttribute('data-tone', 'success')
})
