import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { NewAssetScreen } from './NewAssetScreen.jsx'

describe('new asset template groups', () => {
  test('presents every requested asset family as a template group', async () => {
    const onChoose = vi.fn()
    const user = userEvent.setup()
    render(<NewAssetScreen onChoose={onChoose} />)

    expect(screen.getByRole('region', { name: 'What are you making?' })).toHaveAttribute('id', 'asset-template-groups')
    expect(screen.queryByRole('heading', { level: 2, name: 'Ads' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Ads')).toHaveLength(2)
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
    for (const asset of ['Campaign banners', 'Reels', 'Landing page', 'Website page', 'Slidedeck', 'Business cards', 'Email signature', 'Icon Badge set']) {
      expect(screen.getByRole('heading', { level: 3, name: asset })).toBeVisible()
    }
    expect(screen.getAllByText('2 templates')).toHaveLength(2)
    expect(screen.getAllByText('1 template')).toHaveLength(6)
    expect(screen.getAllByRole('button', { name: 'Create with AI' })).toHaveLength(6)
    const unavailableCard = screen.getByRole('heading', { name: 'Business cards' }).closest('article')
    expect(unavailableCard).toHaveClass('a-surface')
    expect(within(unavailableCard).queryByText('Coming soon')).not.toBeInTheDocument()
    expect(within(unavailableCard).queryByRole('button')).not.toBeInTheDocument()
    const iconBadgeCard = screen.getByRole('heading', { name: 'Icon Badge set' }).closest('article')
    expect(iconBadgeCard).toHaveClass('a-surface')
    expect(within(iconBadgeCard).queryByText('Coming soon')).not.toBeInTheDocument()
    expect(within(iconBadgeCard).queryByRole('button')).not.toBeInTheDocument()
    const bannersButton = screen.getAllByRole('button', { name: 'Create with AI' })[0]
    expect(bannersButton).toHaveAttribute('data-variant', 'primary')
    expect(bannersButton).not.toHaveAttribute('style')
    await user.hover(bannersButton)

    const bannerCard = screen.getByRole('heading', { name: 'Campaign banners' }).closest('article')
    expect(bannerCard).toHaveAttribute('data-template-section', 'ads')
    await user.click(bannersButton)
    expect(onChoose).toHaveBeenCalledWith('banners')
  })

  test('uses one keyboard-accessible action per available card and none for unavailable cards', async () => {
    const onChoose = vi.fn()
    const user = userEvent.setup()
    render(<NewAssetScreen onChoose={onChoose} />)

    const bannersCard = screen.getByRole('heading', { name: 'Campaign banners' }).closest('article')
    expect(bannersCard).not.toHaveAttribute('tabindex')
    const action = within(bannersCard).getByRole('button', { name: 'Create with AI' })
    action.focus()
    await user.keyboard('{Enter}')
    expect(onChoose).toHaveBeenCalledWith('banners')

    const businessCard = screen.getByRole('heading', { name: 'Business cards' }).closest('article')
    expect(within(businessCard).queryByRole('button')).toBeNull()
    expect(onChoose).toHaveBeenCalledOnce()
  })
})
