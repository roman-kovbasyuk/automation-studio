import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { ReviewedBriefView } from './ReviewedBriefView.jsx'

const baseDraft = {
  summary: 'A clear campaign idea.', audience: 'Commuters', copyMode: null,
  ageGroups: [], gender: 'all', reach: null, goal: null, goalCustom: '', visualTags: [],
}
const foundCopy = [{ id: 'copy-1', fields: { headline: 'Travel lighter.', body: '', offer: '', cta: '' }, sourceRefs: [{ sourceId: 'source-1', label: 'campaign.pdf', blockId: 'page-2', page: 2 }], verification: 'text_verified' }]
const confirmedDraft = {
  ...baseDraft,
  copyMode: 'create_new',
  reach: 'national',
  goal: 'signups',
}

function StatefulFixture({ initialDraft, onChange, ...props }) {
  const [draft, setDraft] = useState(initialDraft)
  return <ReviewedBriefView draft={draft} onChange={nextDraft => { onChange(nextDraft); setDraft(nextDraft) }} {...props} />
}

function renderReviewed({ draft = confirmedDraft, onChange = vi.fn(), onConfirm = vi.fn(), ...overrides } = {}) {
  return {
    onChange,
    onConfirm,
    ...render(<StatefulFixture
      initialDraft={draft}
      foundCopy={foundCopy}
      sources={[]}
      disabled={false}
      error=""
      confirmed={false}
      onChange={onChange}
      onConfirm={onConfirm}
      onOpenSource={vi.fn()}
      {...overrides}
    />),
  }
}

test('emits complete controlled changes for the editable summary and audience', async () => {
  const user = userEvent.setup()
  const { onChange } = renderReviewed()
  expect(screen.getByRole('textbox', { name: 'Summary' }).tagName).toBe('TEXTAREA')
  expect(screen.getByRole('textbox', { name: 'Audience' }).tagName).toBe('INPUT')

  await user.clear(screen.getByRole('textbox', { name: 'Summary' }))
  await user.type(screen.getByRole('textbox', { name: 'Summary' }), 'A focused spring launch.')
  expect(onChange).toHaveBeenLastCalledWith({ ...confirmedDraft, summary: 'A focused spring launch.' })

  await user.clear(screen.getByRole('textbox', { name: 'Audience' }))
  await user.type(screen.getByRole('textbox', { name: 'Audience' }), 'Urban cyclists')
  expect(onChange).toHaveBeenLastCalledWith({ ...confirmedDraft, summary: 'A focused spring launch.', audience: 'Urban cyclists' })
})

test('confirms only after an explicit click and changes its label once confirmed', async () => {
  const user = userEvent.setup()
  const { onConfirm, rerender } = renderReviewed()

  expect(onConfirm).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Confirm brief' }))
  expect(onConfirm).toHaveBeenCalledTimes(1)
  expect(onConfirm).toHaveBeenCalledWith()

  rerender(<ReviewedBriefView draft={confirmedDraft} foundCopy={foundCopy} sources={[]} disabled={false} error="" confirmed
    onChange={vi.fn()} onConfirm={vi.fn()} onOpenSource={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeVisible()
})

test('blocks an invalid confirmation and gives concise missing-field guidance after the attempt', async () => {
  const user = userEvent.setup()
  const { onConfirm } = renderReviewed({ draft: { ...confirmedDraft, summary: '', audience: '', copyMode: null, reach: null, goal: null } })

  await user.click(screen.getByRole('button', { name: 'Confirm brief' }))
  expect(onConfirm).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('Complete Summary, Audience, Copy mode, Campaign reach, and Campaign goal before confirming.')
})

test('disables all briefing controls while busy or read-only', () => {
  const { rerender } = renderReviewed({ disabled: true })
  const controls = ['textbox', 'button', 'radio', 'checkbox', 'combobox'].flatMap(role => screen.getAllByRole(role))
  for (const control of controls) expect(control).toBeDisabled()

  rerender(<ReviewedBriefView draft={confirmedDraft} foundCopy={foundCopy} sources={[]} disabled={false} error="" confirmed
    onChange={vi.fn()} onConfirm={vi.fn()} onOpenSource={vi.fn()} />)
  expect(screen.getByRole('textbox', { name: 'Summary' })).toBeEnabled()
})

test('shows the three briefing groups without claiming found wording when no copy was found', () => {
  renderReviewed({ foundCopy: [] })
  expect(screen.getByRole('group', { name: 'Banner copy' })).toBeVisible()
  expect(screen.getByRole('group', { name: 'Campaign' })).toBeVisible()
  expect(screen.getByRole('group', { name: 'Visual context' })).toBeVisible()
  expect(screen.queryByText('We found wording in your documents that could work on your banners.')).not.toBeInTheDocument()
  expect(screen.getByText('No banner copy found in your materials.')).toBeVisible()
})
