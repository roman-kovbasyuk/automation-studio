import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { Text } from '../atoms'
import { CodeExample } from './CodeExample'

test('code view exposes the same source that Copy writes', async () => {
  const user = userEvent.setup()
  render(<CodeExample title="Usage" filename="example.tsx" source="const answer = 42" preview={<Text>Live preview</Text>} />)
  expect(screen.getByText('Live preview')).toBeVisible()
  await user.click(screen.getByRole('tab', { name: 'Code' }))
  expect(screen.queryByText('Live preview')).not.toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Usage source' })).toHaveTextContent('const answer = 42')
  await user.click(screen.getByRole('button', { name: 'Copy Usage code' }))
  expect(await navigator.clipboard.readText()).toBe('const answer = 42')
  expect(screen.getByRole('status')).toHaveTextContent('Copied')
})

test('source wraps long lines and marks common syntax tokens', () => {
  render(<CodeExample title="Syntax" filename="example.tsx" source="const label = 'A long example'" />)
  expect(screen.getByText('const')).toHaveClass('b-code-example__token--keyword')
  expect(screen.getByText("'A long example'")).toHaveClass('b-code-example__token--string')
})

test('CodeExample groups tabs and the transparent copy action in one header control row', () => {
  render(<CodeExample title="Usage" filename="example.tsx" source="const answer = 42" preview={<Text>Live preview</Text>} />)
  const controls = screen.getByRole('tablist').closest('.b-code-example__header-controls')
  const copy = screen.getByRole('button', { name: 'Copy Usage code' })
  expect(controls).toContainElement(copy)
  expect(copy).toHaveClass('b-code-example__copy')
})

test('CodeExample can omit Copy for non-copyable foundation previews', () => {
  render(<CodeExample title="Typography" filename="typography.tsx" source="const typeScale = {}" copyable={false} preview={<Text>Type scale</Text>} />)
  expect(screen.getByRole('tab', { name: 'Preview' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Copy Typography code' })).not.toBeInTheDocument()
})

test('clipboard rejection exposes selectable source without claiming success', async () => {
  const user = userEvent.setup()
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('Denied'))
  render(<CodeExample title="Setup" filename="terminal" source="npm run build:atomic-library" preview={<Text>Preview</Text>} />)
  await user.click(screen.getByRole('button', { name: 'Copy Setup code' }))
  expect(screen.getByRole('status')).toHaveTextContent('Select the code')
  expect(screen.getByText('npm run build:atomic-library')).toBeVisible()
  expect(screen.getByRole('status')).not.toHaveTextContent('Copied')
})

test('copy feedback identifies the copied source, including completion after source changes', async () => {
  const user = userEvent.setup()
  let finishCopy!: () => void
  vi.spyOn(navigator.clipboard, 'writeText').mockImplementationOnce(() => new Promise<void>(resolve => { finishCopy = resolve }))
  const example = render(<CodeExample title="Install" filename="terminal" source="npm install ./package.tgz" />)
  await user.click(screen.getByRole('button', { name:'Copy Install code' }))
  example.rerender(<CodeExample title="Install" filename="terminal" source="pnpm add ./package.tgz" />)
  finishCopy()
  await user.tab()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name:'Copy Install code' }))
  expect(await navigator.clipboard.readText()).toBe('pnpm add ./package.tgz')
  expect(screen.getByRole('status')).toHaveTextContent('Copied')
  example.rerender(<CodeExample title="Install" filename="terminal" source="yarn add ./package.tgz" />)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
