import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { FoundCopyDialog } from './FoundCopyDialog.jsx'

const foundCopy = [{
  id: 'copy-1',
  fields: { headline: 'Travel lighter.', body: '', offer: '', cta: '' },
  sourceRefs: [{ sourceId: 'source-1', label: 'campaign.pdf', blockId: 'page-2', page: 2 }],
  verification: 'text_verified',
}]

test('shows read-only candidate evidence and delegates opening its source', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  const onOpenSource = vi.fn()
  render(<FoundCopyDialog open foundCopy={foundCopy} onClose={onClose} onOpenSource={onOpenSource} />)

  expect(screen.getByRole('dialog', { name: 'Found copy' })).toHaveTextContent('Travel lighter.')
  expect(screen.getByText('campaign.pdf · page 2')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Open source campaign.pdf · page 2' }))
  expect(onOpenSource).toHaveBeenCalledWith('source-1')
})

test('returns focus to the trigger after Escape closes the controlled dialog', async () => {
  const user = userEvent.setup()
  function Fixture() {
    const [open, setOpen] = useState(false)
    return <FoundCopyDialog open={open} foundCopy={foundCopy} onClose={() => setOpen(false)} onOpenSource={() => {}}
      trigger={<button type="button" onClick={() => setOpen(true)}>View found copy</button>} />
  }
  render(<Fixture />)
  const trigger = screen.getByRole('button', { name: 'View found copy' })
  await user.click(trigger)
  expect(screen.getByRole('dialog', { name: 'Found copy' })).toBeVisible()
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
})
