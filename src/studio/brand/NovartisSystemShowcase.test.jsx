import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { NovartisSystemShowcase } from './NovartisSystemShowcase.jsx'

const snapshot = {
  name: 'Novartis',
  colors: {
    palette: [
      { id: 'blue', name: 'Novartis blue', value: '#003DA6' },
      { id: 'coral', name: 'Heartbeat coral', value: '#FF4564' },
      { id: 'canvas', name: 'Paper canvas', value: '#F7F9FE' },
    ],
    roles: { primary: 'blue', accent: 'coral', canvas: 'canvas', surface: 'canvas', primaryText: 'blue', inverseText: 'canvas' },
  },
  typography: {
    heading: { family: 'Inter', weight: 800, fallbacks: ['Arial'] },
    body: { family: 'Inter', weight: 400, fallbacks: ['Arial'] },
  },
}

describe('Novartis system showcase', () => {
  test('presents the shared Bento board and the two-section switch', () => {
    render(<NovartisSystemShowcase snapshot={snapshot} />)
    expect(screen.getByRole('region', { name: 'Novartis design system' })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'Foundation' })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'Templates' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Typography' })).toBeVisible()
  })

  test('uses the supplied Folkeuniversitetet owl as the shape-language specimen', () => {
    render(<NovartisSystemShowcase snapshot={{ ...snapshot, name: 'Folkeuniversitetet' }} />)
    expect(document.querySelector('.bs-system-bento__owl')).toBeTruthy()
    expect(screen.getByText('FOLKE', { selector: '.bs-system-bento__owl-word' })).toBeVisible()
  })

  test('switches tab content without losing the system context', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<NovartisSystemShowcase snapshot={snapshot} />)
    await user.click(screen.getByRole('radio', { name: 'Templates' }))
    expect(screen.getByText('Campaign banner')).toBeVisible()
    expect(screen.getByRole('region', { name: 'Novartis design system' })).toBeVisible()
  })

  test('filters the shared template catalog', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<NovartisSystemShowcase snapshot={snapshot} />)
    await user.click(screen.getByRole('radio', { name: 'Templates' }))
    await user.type(screen.getByRole('textbox', { name: 'Search foundations and templates' }), 'business')
    expect(screen.getByText('Business card')).toBeVisible()
    expect(screen.queryByText('Campaign banner')).not.toBeInTheDocument()
  })
})
