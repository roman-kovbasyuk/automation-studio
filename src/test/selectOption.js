import { fireEvent, screen } from '@testing-library/react'

// Exercise the public popup UI, using the form option only to resolve its label.
// No hidden-select change events or mocked component implementations.
export function selectOption(control, value) {
  if (control.tagName === 'SELECT') return fireEvent.change(control, { target: { value } })
  if (control.disabled) throw new Error('Cannot choose an option on a disabled control')
  const native = control.parentElement.querySelector('select')
  const option = [...(native?.options ?? [])].find(option => option.value === value)
  const label = option?.textContent ?? value
  fireEvent.keyDown(control, { key: 'Enter' })
  fireEvent.click(screen.getByRole('option', { name: label, exact: true }))
}

export function changeControl(control, event) {
  if (control.tagName === 'BUTTON' && control.getAttribute('role') === 'combobox') return selectOption(control, event.target.value)
  return fireEvent.change(control, event)
}
