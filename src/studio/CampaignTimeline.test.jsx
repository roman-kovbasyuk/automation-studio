import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { CampaignTimeline } from './CampaignTimeline.jsx'

const items = [
  { label: 'Brief', href: '#brief', current: true, complete: false, disabled: false },
  { label: 'Copy', href: '#copy', current: false, complete: false, disabled: false },
]

test('shows navigation directly without a step-summary toggle', () => {
  const onChange = vi.fn()
  render(<CampaignTimeline items={items} activeModule="brief" onChange={onChange} />)
  expect(screen.queryByRole('button', { name: /Step 1 of 2/ })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('link', { name: 'Copy' }))
  expect(onChange).toHaveBeenCalledWith(1)
})
