import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { emptyBriefAnswers } from '../../../../../shared/briefingContracts.js'
import { FoundCopyStep } from './FoundCopyStep.jsx'
import { SettingsStep } from './SettingsStep.jsx'
import { VisualContextStep } from './VisualContextStep.jsx'

const draft = { ...emptyBriefAnswers(), summary: 'Courses', audience: 'Adults' }
const candidate = (id, fields, extra = {}) => ({ id, fields: { headline: '', body: '', offer: '', cta: '', ...fields }, verification: 'text_verified',
  sourceRefs: [{ sourceId: 'brochure', label: 'brochure.pdf', blockId: 'page-1' }], ...extra })

test('found copy previews up to three options with their sources and asks about new copy', async () => {
  const user = userEvent.setup(), onChange = vi.fn(), onOpenSource = vi.fn()
  const foundCopy = [
    candidate('c1', { headline: 'Spring sale: 20% off', cta: 'Book now' }, { sourceRefs: [{ sourceId: 'brochure', label: 'brochure.pdf', blockId: 'p1' }, { sourceId: 'flyer', label: 'flyer.png', blockId: 'attachment' }] }),
    candidate('c2', { body: 'Evening courses in Oslo' }, { verification: 'needs_review' }),
    candidate('c3', { headline: 'Third' }), candidate('c4', { headline: 'Fourth' }),
  ]
  render(<FoundCopyStep draft={draft} foundCopy={foundCopy} errors={{ copyMode: 'Choose whether to also write new copy.' }} suggested={new Set()} onChange={onChange} onOpenSource={onOpenSource} />)
  const list = screen.getByRole('list', { name: 'Found copy' })
  expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  expect(within(list).getByText('Call to action: Book now')).toBeVisible()
  expect(within(list).getByText('Check this wording')).toBeVisible()
  await user.click(within(list).getByRole('button', { name: 'From brochure.pdf and 1 more' }))
  expect(onOpenSource).toHaveBeenCalledWith('brochure')
  await user.click(screen.getByRole('button', { name: 'Show all (4)' }))
  expect(await screen.findByRole('dialog', { name: 'Found copy' })).toHaveTextContent('Fourth')
})

test('the copy question reports its choice, shows its error and marks a suggestion', async () => {
  const user = userEvent.setup(), onChange = vi.fn()
  const { rerender } = render(<FoundCopyStep draft={draft} foundCopy={[candidate('c1', { headline: 'Hi' })]} errors={{ copyMode: 'Choose whether to also write new copy.' }} suggested={new Set()} onChange={onChange} onOpenSource={vi.fn()} />)
  const question = screen.getByRole('group', { name: 'Also write new copy options?' })
  expect(question).toHaveAccessibleDescription('Choose whether to also write new copy.')
  await user.click(within(question).getByRole('radio', { name: 'Yes, also write new options' }))
  expect(onChange).toHaveBeenCalledWith({ copyMode: 'keep_and_create' }, 'copyMode')
  rerender(<FoundCopyStep draft={{ ...draft, copyMode: 'keep_original' }} foundCopy={[candidate('c1', { headline: 'Hi' })]} errors={{}} suggested={new Set(['copyMode'])} onChange={onChange} onOpenSource={vi.fn()} />)
  expect(screen.getByRole('radio', { name: 'No, use this copy' })).toBeChecked()
  expect(screen.getByRole('group', { name: 'Also write new copy options?' })).toHaveAccessibleDescription('Suggested')
})

test('settings change the age range, gender, goal and reach, and compose an icon with each tag label', async () => {
  const user = userEvent.setup(), onChange = vi.fn()
  const { rerender } = render(<SettingsStep draft={draft} errors={{ reach: 'Choose a reach.' }} suggested={new Set(['gender'])} onChange={onChange} />)
  expect(screen.getByText('All ages')).toBeVisible()
  expect(screen.getByRole('slider', { name: 'From' })).toHaveAttribute('aria-valuetext', '18–24')
  expect(screen.getByRole('slider', { name: 'To' })).toHaveAttribute('aria-valuetext', '65+')
  fireEvent.change(screen.getByRole('slider', { name: 'From' }), { target: { value: '2' } })
  expect(onChange).toHaveBeenLastCalledWith({ ageGroups: ['35_44', '45_54', '55_64', '65_plus'] }, 'ageGroups')
  const genderGroup = screen.getByRole('group', { name: 'Gender' })
  expect(genderGroup).toHaveAccessibleDescription('Suggested')
  expect(within(genderGroup).getByRole('radio', { name: 'Women' }).closest('label').querySelector('svg[data-icon="Venus"]')).toBeTruthy()
  await user.click(within(genderGroup).getByRole('radio', { name: 'Women' }))
  expect(onChange).toHaveBeenLastCalledWith({ gender: 'women' }, 'gender')
  await user.click(screen.getByRole('radio', { name: 'Other' }))
  expect(onChange).toHaveBeenLastCalledWith({ goal: 'other', goalCustom: '' }, 'goal')
  const reachGroup = screen.getByRole('group', { name: 'Reach' })
  expect(reachGroup).toHaveAccessibleDescription('Choose a reach.')
  expect(within(reachGroup).getByRole('radio', { name: 'National' }).closest('label').querySelector('svg[data-icon="Flag"]')).toBeTruthy()
  await user.click(within(reachGroup).getByRole('radio', { name: 'National' }))
  expect(onChange).toHaveBeenLastCalledWith({ reach: 'national' }, 'reach')
  rerender(<SettingsStep draft={{ ...draft, ageGroups: ['25_34', '35_44'], goal: 'other', goalCustom: '' }} errors={{ goalCustom: 'Describe the goal.' }} suggested={new Set()} onChange={onChange} />)
  expect(screen.getByText('25–44')).toBeVisible()
  expect(screen.getByRole('group', { name: 'Goal' })).toHaveAccessibleDescription('Describe the goal.')
  fireEvent.change(screen.getByRole('textbox', { name: 'Other answer' }), { target: { value: 'Open day visits' } })
  expect(onChange).toHaveBeenLastCalledWith({ goalCustom: 'Open day visits' }, 'goal')
})

test('settings expose a historical under-18 selection and replace it only after an adult range choice', () => {
  const onChange = vi.fn()
  render(<SettingsStep draft={{ ...draft, ageGroups: ['under_18'] }} errors={{}} suggested={new Set()} onChange={onChange} />)
  expect(screen.getByText(/Under 18 \(previous selection\).*Choose an age range from 18/)).toBeVisible()
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('slider', { name: 'From' }), { target: { value: '1' } })
  expect(onChange).toHaveBeenCalledWith({ ageGroups: ['25_34', '35_44', '45_54', '55_64', '65_plus'] }, 'ageGroups')
})

test('visual context wires keywords, the moved-in hint as placeholder, the limit and the suggested mark to TagInput', () => {
  const onChange = vi.fn()
  const { rerender } = render(<VisualContextStep draft={{ ...draft, visualTags: ['winter light'] }} suggested={new Set(['visualTags'])} onChange={onChange} />)
  const field = screen.getByRole('textbox', { name: 'Keywords' })
  expect(screen.getByText('Suggested')).toBeVisible()
  expect(field).toHaveAttribute('placeholder', 'Images are based on these keywords, your brief and your copy.')
  fireEvent.change(field, { target: { value: 'tram stop' } })
  fireEvent.keyDown(field, { key: 'Enter' })
  expect(onChange).toHaveBeenLastCalledWith({ visualTags: ['winter light', 'tram stop'] }, 'visualTags')
  rerender(<VisualContextStep draft={{ ...draft, visualTags: Array.from({ length: 12 }, (_, index) => `Keyword ${index}`) }} suggested={new Set()} onChange={onChange} />)
  expect(screen.queryByRole('textbox', { name: 'Keywords' })).not.toBeInTheDocument()
  expect(screen.getByText('Up to 12 keywords. Remove one to add another.')).toBeVisible()
  expect(screen.queryByText('Suggested')).not.toBeInTheDocument()
})
