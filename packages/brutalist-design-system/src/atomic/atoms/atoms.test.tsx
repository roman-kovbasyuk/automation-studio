import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { AtomsRoot, Heading, Text, Icon, Stack, Grid, ScrollArea } from './index'

test('visual heading roles do not change document hierarchy', () => {
  render(<AtomsRoot><Heading level={2} variant="h4">Workspace</Heading><Text>Settings description</Text></AtomsRoot>)
  expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('data-type', 'h4')
  expect(screen.getByText('Settings description').tagName).toBe('P')
})

test('icons distinguish meaningful information from decoration', () => {
  render(<><Icon name="check" label="Saved" /><Icon name="search" /></>)
  expect(screen.getByRole('img', { name: 'Saved' })).not.toHaveAttribute('aria-hidden')
  expect(document.querySelector('[data-icon="search"]')).toHaveAttribute('aria-hidden', 'true')
  expect(document.querySelector('[data-icon="search"]')).toHaveAttribute('focusable', 'false')
})

test('layout maps scale values to owned variables, and grid can collapse', () => {
  render(<Stack gap={8} data-testid="stack"><Grid minItemWidth="16rem" data-testid="grid">Content</Grid></Stack>)
  expect(screen.getByTestId('stack').style.getPropertyValue('--layout-gap')).toBe('var(--a-space-8)')
  expect(screen.getByTestId('grid').style.getPropertyValue('--grid-min')).toBe('16rem')
})

test('scrollable content has a keyboard target and accessible name', () => {
  render(<ScrollArea label="Example content">Long content</ScrollArea>)
  expect(screen.getByRole('region', { name: 'Example content' })).toHaveAttribute('tabindex', '0')
})
