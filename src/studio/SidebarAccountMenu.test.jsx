import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SidebarAccountMenu } from './SidebarAccountMenu.jsx'

describe('SidebarAccountMenu', () => {
  test('uses a profile block trigger and opens its menu above it', () => {
    const onAction = vi.fn()
    render(<SidebarAccountMenu label="Roman Kovbasyuk" actions={[{ id: 'settings', label: 'Settings' }]} onAction={onAction} />)

    const trigger = screen.getByRole('button', { name: /Roman Kovbasyuk/i })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger.querySelector('[data-profile-avatar]')).not.toBeNull()
    expect(trigger.querySelector('[data-profile-chevron]')).not.toBeNull()

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }))
    expect(onAction).toHaveBeenCalledWith('settings')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
