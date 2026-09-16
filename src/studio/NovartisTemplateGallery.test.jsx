import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { NovartisTemplateGallery } from './NovartisTemplateGallery.jsx'

describe('Novartis template gallery', () => {
  test('shows exactly one starter template for each V1 format', () => {
    render(<NovartisTemplateGallery />)
    expect(screen.getByRole('region', { name: /Novartis V1 templates/i })).toBeVisible()
    expect(screen.getByText('Campaign banner')).toBeVisible()
    expect(screen.getByText('Playbook cover slide')).toBeVisible()
    expect(screen.getByText('Cardiovascular landing page')).toBeVisible()
    expect(screen.getByText('Business card')).toBeVisible()
    expect(screen.getAllByText(/Novartis concept template/i)).toHaveLength(4)
    const images = [...document.querySelectorAll('.nv-template-gallery img')]
    expect(images[0]).toHaveAttribute('src', '/assets/novartis/banner-vertical.webp')
    expect(images.length).toBe(5)
  })

  test('filters to the requested category', () => {
    render(<NovartisTemplateGallery kind="landing-page" />)
    expect(screen.getByText('Cardiovascular landing page')).toBeVisible()
    expect(screen.queryByText('Business card')).not.toBeInTheDocument()
  })
})
