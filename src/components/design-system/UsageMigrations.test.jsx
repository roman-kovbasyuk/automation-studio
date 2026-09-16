import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { DecisionNotice } from './molecules/DecisionNotice.jsx'
import { FancyButton } from 'brutalist-design-system'
import { EmptyState } from './molecules/EmptyState.jsx'

describe('Brutalist usage migrations', () => {
  test('renders EmptyState with a named title, description, and action', () => {
    render(<EmptyState title="No visuals yet" description="Generate one to continue." action={<button type="button">Generate visual</button>} />)

    expect(screen.getByRole('heading', { name: 'No visuals yet' })).toBeVisible()
    expect(screen.getByText('Generate one to continue.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Generate visual' })).toBeVisible()
  })

  test('renders workflow decisions as an announced Brutalist alert', () => {
    render(<DecisionNotice label="Brief changed" actions={<button type="button">Create new</button>}>Create updated copy?</DecisionNotice>)

    expect(screen.getByRole('alert')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Brief changed' })).toBeVisible()
    expect(screen.getByText('Create updated copy?')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Create new' })).toBeVisible()
  })

  test('can render the published FancyButton export', () => {
    render(<FancyButton subtitle="Details">Generate</FancyButton>)
    expect(screen.getByRole('button', { name: 'GenerateDetails' })).toBeVisible()
  })
})
