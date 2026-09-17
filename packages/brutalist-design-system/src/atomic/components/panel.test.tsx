import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { test, expect } from 'vitest'
import { Panel, Checkbox, Button } from './index'

test('split panel keeps interactive filters with the heading and content separate', async () => {
  function Example() {
    const [show, setShow] = useState(true)
    return <Panel variant="split" title="Project" description="Choose a format" filters={<Checkbox label="Show preview" checked={show} onChange={e => setShow(e.target.checked)} />}>
      {show && <p>Project preview</p>}
    </Panel>
  }
  render(<Example />)
  const panel = screen.getByRole('region', { name: 'Project' })
  const header = panel.querySelector('header')!
  expect(header).not.toBeNull()
  expect(within(header).getByRole('heading', { name: 'Project' })).toBeInTheDocument()
  expect(within(header).getByText('Choose a format')).toBeInTheDocument()
  expect(header.contains(screen.getByText('Project preview'))).toBe(false)
  await userEvent.click(within(header).getByRole('checkbox', { name: 'Show preview' }))
  expect(screen.queryByText('Project preview')).not.toBeInTheDocument()
})

test('default panel retains unified content without a split body', () => {
  render(<Panel title="Default"><p>Content</p></Panel>)
  const panel = screen.getByRole('region', { name: 'Default' })
  expect(panel).not.toHaveClass('c-panel--split')
  expect(within(panel).getByText('Content')).toBeInTheDocument()
})

test('header actions remain outside the heading and can act on compact panel content', async () => {
  function Example() {
    const [value, setValue] = useState('Draft')
    return <Panel title="Document" variant="split" density="compact" actions={<Button onClick={() => setValue('Saved')}>Save</Button>}><p>{value}</p></Panel>
  }
  render(<Example />)
  const panel = screen.getByRole('region', { name: 'Document' })
  const action = within(panel.querySelector('header')!).getByRole('button', { name:'Save' })
  expect(screen.getByRole('heading', { name:'Document' })).not.toContainElement(action)
  await userEvent.click(action)
  expect(within(panel).getByText('Saved')).toBeVisible()
})
