import { selectOption } from "../../test/selectOption.js"
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { createEmptyBrandDraft } from '../../../shared/brandDesignSystem.js'
import { TypographyEditor } from './TypographyEditor.jsx'
import { ColorTokenEditor } from './ColorTokenEditor.jsx'
import { LogoAssetEditor } from './LogoAssetEditor.jsx'
import { ReviewStep } from './ReviewStep.jsx'

test('upstream font selection saves a numeric weight and marks the choice unconfirmed', async () => {
  const onChange = vi.fn(), draft = createEmptyBrandDraft('Example')
  render(<TypographyEditor draft={draft} onChange={onChange} />)
  await selectOption(screen.getByRole('combobox', { name: 'Heading weight' }), '700')
  expect(onChange.mock.lastCall[0].typography.heading).toMatchObject({ weight: 700, confirmed: false })
})
test('upstream palette role selection saves the token identifier', async () => {
  const onChange = vi.fn(), draft = createEmptyBrandDraft('Example')
  draft.colors.palette = [{ id: 'ink', name: 'Ink', value: '#000000', confirmed: true, evidence: { method: 'manual' } }]
  render(<ColorTokenEditor draft={draft} onChange={onChange} />)
  await selectOption(screen.getByRole('combobox', { name: 'Primary' }), 'ink')
  expect(onChange.mock.lastCall[0].colors.roles.primary).toBe('ink')
})
test('upstream logo selectors save identifiers and optional not-applicable values', async () => {
  const onChange = vi.fn(), draft = createEmptyBrandDraft('Example'), user = userEvent.setup()
  draft.assets = [{ id: 'logo', name: 'Logo', kind: 'logo', mimeType: 'image/png', approved: false }]
  render(<LogoAssetEditor draft={draft} onChange={onChange} />)
  await selectOption(screen.getByRole('combobox', { name: 'Primary logo' }), 'logo')
  expect(onChange.mock.lastCall[0].logoRoles.primary).toBe('logo')
  await selectOption(screen.getByRole('combobox', { name: 'Secondary logo' }), 'not_applicable')
  expect(onChange.mock.lastCall[0].logoRoles.secondary).toBe('not_applicable')
})
test('upstream asset type selection keeps a serializable draft', async () => {
  const onChange = vi.fn(), draft = createEmptyBrandDraft('Example')
  draft.assets = [{ id: 'asset', name: 'Reference', kind: 'reference', mimeType: 'image/png', approved: false }]
  render(<ReviewStep draft={draft} onChange={onChange} />)
  await selectOption(screen.getByRole('combobox', { name: 'Reference type' }), 'illustration')
  expect(onChange.mock.lastCall[0].assets[0].kind).toBe('illustration')
  expect(() => JSON.stringify(onChange.mock.lastCall[0])).not.toThrow()
})
