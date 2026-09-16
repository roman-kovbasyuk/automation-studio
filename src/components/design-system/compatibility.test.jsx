import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { SelectField } from './compatibility.jsx'
import { selectOption } from '../../test/selectOption.js'
import { InlineText } from './molecules/InlineText.jsx'

test('optional selectors can clear a previously selected filter', () => {
  function Filter() {
    const [value, setValue] = useState('designer')
    return <><SelectField label="Role" value={value} onChange={event => setValue(event.target.value)} options={[{ value: '', label: 'All roles' }, { value: 'designer', label: 'Designer' }]} /><output aria-label="Filter value">{value || 'all'}</output></>
  }
  render(<Filter />)
  selectOption(screen.getByRole('combobox', { name: 'Role' }), 'All roles')
  expect(screen.getByLabelText('Filter value')).toHaveTextContent('all')
})

test('inline editing keeps the navigation dirty guard through a failed save and clears it on cancel', async () => {
  const onDirty = vi.fn(), onSave = vi.fn(async () => ({ ok: false, message: 'Conflict' }))
  render(<InlineText label="Audience" value="Commuters" sourceKey="original" onDirty={onDirty} onSave={onSave} />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Audience' }))
  expect(onDirty).toHaveBeenLastCalledWith(true)
  const field = screen.getByRole('textbox', { name: 'Audience' })
  fireEvent.change(field, { target: { value: 'Designers' } })
  fireEvent.keyDown(field, { key: 'Enter' })
  await screen.findByRole('alert')
  expect(onSave).toHaveBeenCalledWith('Designers', 'original')
  expect(onDirty).toHaveBeenLastCalledWith(true)
  fireEvent.keyDown(field, { key: 'Escape' })
  await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(false))
  expect(screen.getByRole('button', { name: 'Edit Audience' })).toHaveTextContent('Commuters')
})
