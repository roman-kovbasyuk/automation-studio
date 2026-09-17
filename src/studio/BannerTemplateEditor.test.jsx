import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { TemplateLibrary } from './TemplateLibrary.jsx'
import { studioTemplates } from '../../shared/studioTemplates.js'
const templates = studioTemplates.map(manifest => ({ id: manifest.id, version: manifest.version, name: manifest.name, manifest }))
// The local editor opens from a template link when the library is not choosing a template for a campaign.
const editorUrl = '/mvp/templates?banner=editorial-split'
const openEditor = (props = {}) => {
  window.history.replaceState({}, '', editorUrl)
  return render(<TemplateLibrary templates={templates} {...props} />)
}
beforeEach(() => { window.history.replaceState({}, '', '/mvp/templates') })
afterEach(() => vi.unstubAllGlobals())
describe('template editor v1', () => {
  test.each([[5000, 1000], [1000, 5000]])('rejects uploads beyond renderer dimensions (%i × %i)', async (width, height) => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width, height, close }))
    openEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Upload image' }))
    fireEvent.change(screen.getByRole('dialog', { name: 'Upload image' }).querySelector('input[type="file"]'), { target: { files: [new File(['image'], 'oversize.png', { type: 'image/png' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Use an image no larger than 4096 × 4096 pixels.')
    expect(close).toHaveBeenCalledOnce()
    expect(screen.getByText('Sample image')).toBeInTheDocument()
  })
  test('a template link opens the local editor on its content fields', () => {
    openEditor()
    expect(screen.queryByRole('complementary', { name: 'Banner content' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Content', selected: true })).toBeVisible()
    expect(screen.getByLabelText('Caption')).toBeVisible()
    expect(screen.getByLabelText('Headline')).toBeVisible()
    expect(screen.getByLabelText('Body text')).toBeVisible()
    expect(screen.getByLabelText('CTA')).toBeVisible()
  })
  test('edits update all previews and survive returning to the gallery', () => {
    openEditor()
    fireEvent.change(screen.getByLabelText('Headline'), { target: { value: 'Your next adventure.' } })
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Formats' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select Landscape ad · 1200 × 628' }))
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Content' }))
    expect(screen.getByRole('button', { name: 'Download · 2' })).toBeEnabled()
    expect(within(screen.getByRole('tabpanel', { name: 'Content' })).getAllByRole('textbox')).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: 'All templates' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Templates' })).toBeVisible()
    window.history.pushState({}, '', editorUrl)
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(screen.getByLabelText('Headline')).toHaveValue('Your next adventure.')
    expect(screen.getByRole('button', { name: 'Download · 2' })).toBeEnabled()
  })
  test('zero formats blocks exports and review; blank required content also blocks', () => {
    openEditor()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Formats' }))
    fireEvent.click(screen.getByRole('button', { name: 'Deselect Square post · 1080 × 1080' }))
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send to Figma for review' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Select Square post · 1080 × 1080' }))
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Content' }))
    fireEvent.change(screen.getByLabelText('Headline'), { target: { value: '' } })
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled()
  })
  test('keeps disconnected review unavailable without sending content externally', () => {
    const request = vi.fn()
    openEditor({ api: { requestBannerDraftAction: request } })
    expect(screen.getByRole('button', { name: 'Send to Figma for review' })).toBeDisabled()
    expect(screen.getByText('Create a campaign to generate and review banners.')).toBeVisible()
    expect(request).not.toHaveBeenCalled()
  })
})
