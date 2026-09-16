import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { ReviewStep } from './ReviewStep.jsx'

const draft = {
  name: 'Northstar', context: '', currentStep: 'review', sources: [],
  assets: [{ id: 'logo-1', name: 'Primary mark', kind: 'logo', mimeType: 'image/svg+xml', approved: true }],
  logoRoles: { primary: 'logo-1', secondary: 'not_applicable', symbol: 'not_applicable', light: 'not_applicable', dark: 'not_applicable' },
  colors: { palette: [{ id: 'ink', name: 'Ink', value: '#101820', confirmed: true, evidence: { method: 'manual' } }],
    roles: { primary: 'ink', accent: 'ink', canvas: 'ink', surface: 'ink', primaryText: 'ink', inverseText: 'ink' } },
  typography: { heading: { family: 'Avenir Next', weight: 600, fallbacks: ['Arial'], confirmed: true }, body: { family: 'Avenir Next', weight: 400, fallbacks: ['Arial'], confirmed: true }, licenseConfirmed: true,
    scale: { h1: { size: 48, lineHeight: 1.1 }, h2: { size: 36, lineHeight: 1.15 }, h3: { size: 24, lineHeight: 1.2 }, body: { size: 16, lineHeight: 1.5 }, caption: { size: 13, lineHeight: 1.4 } } }, conflicts: [],
}

function Harness() {
  const [value, setValue] = useState(draft)
  return <ReviewStep draft={value} onChange={setValue} onBack={vi.fn()} onContinue={vi.fn()} />
}

test('review keeps logos, assets, colors and typography as distinct editable sections', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  for (const name of ['Logos', 'Assets', 'Colors', 'Typography']) expect(screen.getByRole('heading', { name })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Delete Ink' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Add color' }))
  expect(screen.getByDisplayValue('New color')).toBeVisible()
  await user.clear(screen.getByRole('textbox', { name: 'Heading family' }))
  await user.type(screen.getByRole('textbox', { name: 'Heading family' }), 'Suisse Intl')
  expect(screen.getByText('Suisse Intl', { selector: '.bs-type-specimen-heading' })).toBeVisible()
})
