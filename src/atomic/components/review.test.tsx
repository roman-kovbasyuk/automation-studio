import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { test, expect } from 'vitest'
import { RadioGroup, Select, DatePicker, Tag, Toast, FileDropzone } from './index'

test('custom radio answer is editable only when selected and preserves its value', async () => {
  function Example() { const [value,setValue]=useState('square'),[custom,setCustom]=useState(''); return <RadioGroup label="Format" value={value} onChange={setValue} options={[{value:'square',label:'Square'}]} customOption={{value:'other',label:'Other',text:custom,onTextChange:setCustom}} /> }
  render(<Example />); const user=userEvent.setup()
  await user.click(screen.getByRole('radio',{name:'Other'})); await user.type(screen.getByRole('textbox',{name:'Other answer'}),'Wide')
  await user.click(screen.getByRole('radio',{name:'Square'})); expect(screen.getByRole('textbox',{name:'Other answer'})).toBeDisabled()
  await user.click(screen.getByRole('radio',{name:'Other'})); expect(screen.getByRole('textbox',{name:'Other answer'})).toHaveValue('Wide')
})
test('custom Select opens a styled list, skips disabled and submits chosen value', async () => {
  render(<form aria-label="Settings"><Select label="Channel" name="channel" options={[{value:'social',label:'Social'},{value:'email',label:'Email',disabled:true},{value:'display',label:'Display'}]} /></form>);
  const user=userEvent.setup(); await user.click(screen.getByRole('combobox',{name:'Channel'})); expect(screen.getByRole('listbox')).toBeInTheDocument()
  await user.click(screen.getByRole('option',{name:'Display'})); expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('channel')).toBe('display')
})
test('DatePicker opens a custom calendar and enforces date limits', async () => {
  render(<DatePicker label="Start" defaultValue="2026-09-14" min="2026-09-10" max="2026-09-20" />); const user=userEvent.setup()
  await user.click(screen.getByRole('button',{name:'Open Start calendar'}));
  expect(screen.getByRole('dialog',{name:'Start calendar'})).toBeInTheDocument()
  expect(screen.getByRole('button',{name:'2026-09-09'})).toBeDisabled()
  await user.click(screen.getByRole('button',{name:'2026-09-18'})); expect(screen.getByRole('textbox',{name:'Start'})).toHaveValue('2026-09-18')
})
test('tag and toast dismissal belong inside their visual containers', async () => {
  function Example(){const [tag,setTag]=useState(true),[toast,setToast]=useState(true);return <>{tag&&<Tag onRemove={()=>setTag(false)} removeLabel="Remove tag">Ready</Tag>}{toast&&<Toast title="Saved" onDismiss={()=>setToast(false)} />}</>}
  const {container}=render(<Example />); const user=userEvent.setup()
  expect(container.querySelector('.c-tag')?.contains(screen.getByRole('button',{name:'Remove tag'}))).toBe(true)
  expect(within(screen.getByRole('status')).getByRole('button',{name:'Dismiss notification'})).toBeInTheDocument()
  await user.click(screen.getByRole('button',{name:'Remove tag'})); expect(screen.queryByText('Ready')).not.toBeInTheDocument()
})
test('upload failure exposes retry and upload progress blocks picking', async () => {
  const view=render(<FileDropzone label="Assets" onFiles={()=>{}} state="uploading" progress={40} />)
  expect(screen.getByRole('button',{name:'Choose files'})).toBeDisabled(); expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow','40')
  view.rerender(<FileDropzone label="Assets" onFiles={()=>{}} state="error" error="Upload failed" onRetry={()=>{}} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Upload failed'); expect(screen.getByRole('button',{name:'Retry upload'})).toBeEnabled()
})
test('calendar keyboard navigation clamps to the first available date in a month', async () => {
 render(<DatePicker label="Start" defaultValue="2026-10-10" min="2026-09-10" max="2026-11-20" />)
 const user=userEvent.setup()
 await user.click(screen.getByRole('button',{name:'Open Start calendar'}))
 await user.keyboard('{PageUp}')
 expect(screen.getByRole('button',{name:'2026-09-10'})).toHaveFocus()
 await user.keyboard('{ArrowRight}{Enter}')
 expect(screen.getByRole('textbox',{name:'Start'})).toHaveValue('2026-09-11')
})
