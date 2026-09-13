import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { SidebarPanel } from './SidebarPanel'
import { PromptInput } from './PromptInput'

test('sidebar search filters projects and Escape restores search trigger', async()=>{
 render(<SidebarPanel brand={{label:'Studio'}} primaryAction={{label:'New campaign',onClick:()=>{}}} navigation={[{id:'home',label:'Home',href:'#home',current:true}]} projects={[{id:'oslo',title:'Oslo',href:'#oslo'},{id:'paris',title:'Paris',href:'#paris'}]}/>)
 const user=userEvent.setup()
 expect(screen.getByRole('link',{name:'Home'})).toHaveAttribute('aria-current','page')
 await user.click(screen.getByRole('button',{name:'Search projects'}))
 await user.type(screen.getByRole('searchbox',{name:'Search projects'}),'os')
 expect(screen.queryByRole('link',{name:'Paris'})).not.toBeInTheDocument()
 await user.keyboard('{Escape}')
 expect(screen.getByRole('button',{name:'Search projects'})).toHaveFocus()
 expect(screen.getByRole('link',{name:'Paris'})).toBeInTheDocument()
})
test('prompt preserves line breaks, sends shortcut once and blocks blank or busy requests',async()=>{
 function Example(){const [value,setValue]=useState(''),[sent,setSent]=useState(0),[busy,setBusy]=useState(false);return <><PromptInput value={value} onChange={setValue} busy={busy} onSubmit={()=>{setSent(sent+1);setBusy(true)}}/><output>{sent}</output></>}
 render(<Example/>);const user=userEvent.setup()
 expect(screen.getByRole('button',{name:'Send prompt'})).toBeDisabled()
 const input=screen.getByRole('textbox',{name:'Prompt'})
 await user.type(input,'Hello{Enter}world')
 expect(input).toHaveValue('Hello\nworld')
 await user.keyboard('{Control>}{Enter}{/Control}')
 expect(screen.getByRole('status')).toHaveTextContent('1')
 expect(input).toBeDisabled()
})
test('prompt rejects unsupported dropped files and allows attachment removal',async()=>{
 function Example(){const [files,setFiles]=useState([{id:'brief',name:'brief.pdf'}]);return <PromptInput value="Hello" onChange={()=>{}} onSubmit={()=>{}} files={files} onAttach={items=>setFiles(items.map(f=>({id:f.name,name:f.name})))} onRemove={id=>setFiles(files.filter(f=>f.id!==id))}/>}
 render(<Example/>);const user=userEvent.setup()
 fireEvent.drop(screen.getByRole('group',{name:'Prompt attachments'}),{dataTransfer:{files:[new File(['x'],'bad.exe',{type:'application/octet-stream'})]}})
 expect(screen.getByRole('alert')).toHaveTextContent('unsupported')
 await user.click(screen.getByRole('button',{name:'Remove brief.pdf'}))
 expect(screen.queryByText('brief.pdf')).not.toBeInTheDocument()
})
