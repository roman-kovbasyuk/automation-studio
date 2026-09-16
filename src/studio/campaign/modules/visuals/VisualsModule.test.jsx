import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import VisualsModule from './VisualsModule.jsx'

const copy = { id: 'copy-1', headline: 'Find your quiet', visualPrompt: 'Blue headphones in soft daylight.', approved: true }
function port(overrides = {}) {
  return { input: { copies: [copy], analysis: { summary: 'A quieter commute.' }, directions: [], selectedDirectionId: null },
    access: { canEdit: true }, operation: { kind: 'idle' }, assets: { getAssetBlob: vi.fn(async () => new Blob(['image'], { type: 'image/png' })) },
    actions: { generate: vi.fn(async () => ({ ok: true })), generateAll: vi.fn(), image: vi.fn(), select: vi.fn(), upload: vi.fn(async () => ({ ok: true })) },
    reconcile: vi.fn(async () => {}), navigate: vi.fn(), ...overrides }
}

test('uncertain automatic prompts offer a prompt-only retry, never image generation', async () => {
  const value = port({ operation: { kind: 'uncertain', actionId: 'prepare-prompts', error: { message: 'Response lost' } } })
  value.actions.preparePrompts = vi.fn()
  render(<VisualsModule port={value} />)
  await userEvent.click(screen.getByRole('button', { name: 'Retry prompt request' }))
  expect(value.actions.preparePrompts).toHaveBeenCalledWith({ retry: true })
  expect(value.actions.generate).not.toHaveBeenCalled()
  expect(value.actions.image).not.toHaveBeenCalled()
})

test('announces fallback progress while prompt preparation has no detailed progress', () => {
  const value = port({ operation: { kind: 'running', actionId: 'prepare-prompts', error: null } })
  render(<VisualsModule port={value} />)
  expect(screen.getAllByRole('status')).toHaveLength(1)
  expect(screen.getByRole('status')).toHaveTextContent('Working on visuals…')
})

test('uses two-line Brutalist actions for the visual generation choices', () => {
  const value = port()
  render(<VisualsModule port={value} />)
  expect(screen.getByRole('button', { name: 'Generate visuals for selected copy (1)' })).toHaveTextContent('One visual tailored to each copy option')
  expect(screen.getByRole('button', { name: 'Generate campaign-wide visuals' })).toHaveTextContent('Five directions for the whole campaign')
})

test('replaces fallback progress with detailed generation progress', async () => {
  let finish
  const value = port()
  value.actions.generate.mockImplementation(async (_mode, { onProgress }) => {
    onProgress({ stage: 'prompts', total: 3, current: 0 })
    return new Promise(resolve => { finish = resolve })
  })
  const user = userEvent.setup()
  const rendered = render(<VisualsModule port={value} />)
  await user.click(screen.getByRole('button', { name: 'Generate campaign-wide visuals' }))
  rendered.rerender(<VisualsModule port={{ ...value, operation: { kind: 'running', actionId: 'generate:campaign', error: null } }} />)
  expect(screen.getAllByRole('status')).toHaveLength(1)
  expect(screen.getByRole('status')).toHaveTextContent('Creating prompts for 3 visuals…')
  finish({ ok: true })
})

test('locates an image operation error in its owning card', () => {
  const value = port({ operation: { kind: 'failed', actionId: 'image:d1', error: { message: 'The image provider timed out.' } } })
  value.input.directions = [{ id: 'd1', title: 'Timed out idea', prompt: 'Prompt', scope: 'campaign', status: 'failed', generation: {status:'failed'} }]
  render(<VisualsModule port={value} />)
  const card = screen.getByRole('article', { name: 'Timed out idea' })
  expect(card).toHaveClass('a-surface')
  expect(within(card).getByRole('alert')).toHaveTextContent('The image provider timed out.')
  expect(screen.getAllByRole('alert')).toHaveLength(1)
})

test('keeps a persisted campaign upload error visible after remount', () => {
  const value = port({ operation: { kind: 'failed', actionId: 'upload:campaign', error: { message: 'The saved upload failed.' } } })
  render(<VisualsModule port={value} />)
  expect(screen.getByRole('alert')).toHaveTextContent('The saved upload failed.')
  expect(screen.getAllByRole('alert')).toHaveLength(1)
})

test('falls back to a module error when an image operation has no owning card', () => {
  const value = port({ operation: { kind: 'failed', actionId: 'image:missing', error: { message: 'The missing image failed.' } } })
  render(<VisualsModule port={value} />)
  expect(screen.getByRole('alert')).toHaveTextContent('The missing image failed.')
})

test('reconciles and clears a transient upload error from the module boundary', async () => {
  const value = port()
  value.actions.upload.mockResolvedValue({ ok: false, message: 'Upload needs checking.' })
  const user = userEvent.setup()
  render(<VisualsModule port={value} />)
  await user.click(screen.getByRole('button', { name: 'Upload visual' }))
  await user.upload(screen.getByLabelText('Upload image file'), new File(['image'], 'image.png', { type: 'image/png' }))
  await user.click(screen.getByRole('button', { name: 'Check latest state' }))
  expect(value.reconcile).toHaveBeenCalledOnce()
  expect(screen.queryByText('Upload needs checking.')).not.toBeInTheDocument()
})

test('an older upload completion cannot replace feedback from a newer attempt', async () => {
  const completions = []
  const value = port()
  value.actions.upload.mockImplementation(() => new Promise(resolve => completions.push(resolve)))
  const user = userEvent.setup()
  render(<VisualsModule port={value} />)
  const upload = async name => {
    await user.click(screen.getByRole('button', { name: 'Upload visual' }))
    await user.upload(screen.getByLabelText('Upload image file'), new File(['image'], name, { type: 'image/png' }))
  }
  await upload('first.png')
  await upload('second.png')
  await act(async () => completions[1]({ ok: false, message: 'Second upload failed.' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Second upload failed.')
  await act(async () => completions[0]({ ok: false, message: 'First upload failed late.' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Second upload failed.')
})

test('empty visuals shows prerequisite guidance and sends no generation on mount', () => {
  const value = port({ input: { copies: [], analysis: null, directions: [] } })
  render(<VisualsModule port={value} />)
  expect(screen.getByText('Analyze your brief to prepare visual prompts.')).toBeInTheDocument()
  expect(value.actions.generate).not.toHaveBeenCalled()
})

test('ready methods expose selected count; campaign method works without selection', async () => {
  const value = port({ input: { copies: [{ ...copy, approved: false }], directions: [] } })
  const user = userEvent.setup()
  render(<VisualsModule port={value} />)
  expect(screen.getByText('Select copy options above to get started')).toBeInTheDocument()
  expect(screen.getByRole('group', {name:'Generate visuals'})).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Generate campaign-wide visuals' })).toHaveClass('c-button')
  expect(screen.getByRole('button', { name: 'Generate visuals for selected copy (0)' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Generate campaign-wide visuals' }))
  expect(value.actions.generate).toHaveBeenCalledWith('campaign', expect.objectContaining({ onProgress: expect.any(Function) }))
})

test('selected method immediately forwards a generation action and offers upload alternatives', async () => {
  const value = port()
  const user = userEvent.setup()
  render(<VisualsModule port={value} />)
  expect(screen.getByRole('button', { name: 'Generate visuals for selected copy (1)' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Generate visuals for selected copy (1)' }))
  expect(value.actions.generate).toHaveBeenCalledWith('selected_copy', expect.anything())
  expect(screen.getAllByRole('button', { name: 'Upload visual' })).toHaveLength(1)
})

test('adds visual context tags and notes to the next generation request', async () => {
  const value = port()
  const user = userEvent.setup()
  render(<VisualsModule port={value} />)

  expect(screen.getByRole('button', { name: 'Add context' })).toHaveClass('c-text-action')
  await user.click(screen.getByRole('button', { name: 'Add context' }))
  const dialog = screen.getByRole('dialog', { name: 'Add visual context' })
  await user.click(within(dialog).getByRole('checkbox', { name: 'Norwegian' }))
  await user.click(within(dialog).getByRole('checkbox', { name: 'mountains' }))
  await user.type(within(dialog).getByRole('textbox', { name: 'Visual notes' }), 'Keep the mood warm and optimistic.')
  await user.click(within(dialog).getByRole('button', { name: 'Apply context' }))

  expect(screen.getByText('Norwegian')).toBeInTheDocument()
  expect(screen.getByText('mountains')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Generate campaign-wide visuals' }))
  expect(value.actions.generate).toHaveBeenCalledWith('campaign', expect.objectContaining({
    context: { tags: ['Norwegian', 'mountains'], note: 'Keep the mood warm and optimistic.' },
  }))
})

test('media tiles retain copy context and expose prompts only through a compact action', async () => {
  const user = userEvent.setup()
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
  const value = port()
  value.input.directions = [{ id: 'd1', title: 'Soft daylight', prompt: 'Exact prompt.\nNo text.', scope: 'selected_copy', copy, status: 'failed', generation: {status:'failed'} }]
  render(<VisualsModule port={value} />)
  const result = screen.getByRole('article', { name: 'Soft daylight' })
  expect(within(result).getByText('Find your quiet')).toBeInTheDocument()
  for (const name of ['Prompt', 'Static visual', 'Video']) expect(within(result).queryByRole('heading', { name })).not.toBeInTheDocument()
  await user.click(within(result).getByRole('button', { name: 'Copy prompt' }))
  expect(write).toHaveBeenCalledWith('Exact prompt.\nNo text.')
  expect(within(result).getByText('Copied')).toBeInTheDocument()
  expect(within(result).getByRole('button', { name: 'Video options' })).toBeInTheDocument()
})

test('uploads to the explicit direction and does not generate an image', async () => {
  const user = userEvent.setup()
  const value = port()
  value.input.directions = [{ id: 'd1', title: 'Soft daylight', prompt: 'Prompt', scope: 'campaign', status: 'failed', generation: {status:'failed'} }]
  render(<VisualsModule port={value} />)
  const file = new File(['test'], 'visual.png', { type: 'image/png' })
  const result = screen.getByRole('article', { name: 'Soft daylight' })
  await user.click(within(result).getByRole('button', { name: 'Upload visual' }))
  await user.upload(screen.getByLabelText('Upload image file'), file)
  expect(value.actions.upload).toHaveBeenCalledWith({ directionId: 'd1' }, file)
  expect(value.actions.image).not.toHaveBeenCalled()
})

test('failed grid cards offer retry while unresolved cards prevent duplicate generation', async () => {
  const user = userEvent.setup()
  const value = port()
  value.input.directions = [
    { id: 'failed', title: 'Failed idea', prompt: 'One', status: 'pending', generation: { status: 'failed' } },
    { id: 'unknown', title: 'Unresolved idea', prompt: 'Two', status: 'pending', generation: { status: 'unknown' } },
  ]
  render(<VisualsModule port={value} />)
  expect(screen.queryByRole('button', { name: 'Generate All Static Visuals' })).not.toBeInTheDocument()
  await user.click(within(screen.getByRole('article', { name: 'Failed idea' })).getByRole('button', { name: 'Retry image' }))
  expect(value.actions.image).toHaveBeenCalledWith('failed')
  expect(within(screen.getByRole('article', { name: 'Unresolved idea' })).queryByRole('button', { name: 'Retry image' })).not.toBeInTheDocument()
})

test('source-changed visuals remain visible but cannot generate or be selected', () => {
  const value = port()
  value.input.directions = [{ id: 'old', title: 'Earlier visual', prompt: 'Original prompt', status: 'ready',
    stale: true, previewAssetId: 'image-old', scope: 'selected_copy', copy }]
  render(<VisualsModule port={value} />)
  const result = screen.getByRole('article', { name: 'Earlier visual' })
  expect(within(result).getByText('Source changed')).toBeInTheDocument()
  expect(within(result).getByRole('button', { name: 'Use this image' })).toBeDisabled()
  expect(within(result).getByRole('button', {name:'Copy prompt'})).toBeInTheDocument()
})

test('uploaded-only cards do not invent a prompt or a copy-prompt action', () => {
  const value = port()
  value.input.directions = [{ id: 'upload', title: 'My image', prompt: '', status: 'ready', previewAssetId: 'image', source: 'upload', scope: 'campaign' }]
  render(<VisualsModule port={value} />)
  const result = screen.getByRole('article', { name: 'My image' })
  expect(within(result).queryByText('No generated prompt available.')).not.toBeInTheDocument()
  expect(within(result).queryByRole('button', { name: 'Copy prompt' })).not.toBeInTheDocument()
  expect(within(result).getByRole('button', { name: 'Upload visual' })).toBeEnabled()
})

test('upload choices and linked cards use Copy’s original option numbers', async () => {
  const user = userEvent.setup()
  const value = port()
  value.input.copies = Array.from({ length: 5 }, (_, i) => ({ ...copy, id: `copy-${i + 1}`, headline: `Headline ${i + 1}`, approved: [1, 4].includes(i) }))
  value.input.directions = [{ id: 'd1', title: 'Linked idea', prompt: 'Prompt', scope: 'selected_copy', copy: value.input.copies[4], status: 'failed', generation: {status:'failed'} }]
  render(<VisualsModule port={value} />)
  const card = screen.getByRole('article', { name: 'Linked idea' })
  expect(within(card).getByText('Linked copy · Option 5')).toBeInTheDocument()
  await user.click(screen.getAllByRole('button', { name: 'Upload visual' })[0])
  expect(screen.getByRole('combobox', { name: 'Upload destination: Campaign-wide' })).toHaveClass('c-text-input')
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Upload destination: Campaign-wide' }), { key: 'Enter' })
  expect(screen.getByRole('option', { name: 'Option 2 — Headline 2' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Option 5 — Headline 5' })).toBeInTheDocument()
})

test('upload failure appears beneath the affected static visual', async () => {
  const user = userEvent.setup()
  const value = port()
  value.actions.upload.mockResolvedValue({ ok: false, message: 'The image could not be saved.' })
  value.input.directions = [{ id: 'd1', title: 'Upload target', prompt: 'Prompt', scope: 'campaign', status: 'failed', generation: {status:'failed'} }]
  render(<VisualsModule port={value} />)
  const card = screen.getByRole('article', { name: 'Upload target' })
  await user.click(within(card).getByRole('button', { name: 'Upload visual' }))
  await user.upload(screen.getByLabelText('Upload image file'), new File(['image'], 'image.png', { type: 'image/png' }))
  expect(within(card).getByText('The image could not be saved.')).toHaveAttribute('role','alert')
})


test('explains an exhausted image quota after reload without suggesting an immediate retry', () => {
  const value = port()
  value.input.directions = [{ id: 'd1', title: 'Quota limited idea', prompt: 'Prompt', scope: 'campaign', status: 'failed', generation: { id: 'j1', status: 'failed', errorCode: 'quota_exhausted' } }]
  render(<VisualsModule port={value} />)
  const card = screen.getByRole('article', { name: 'Quota limited idea' })
  expect(within(card).getByRole('alert')).toHaveTextContent(/quota.*check.*limits/i)
  expect(within(card).getByRole('alert')).not.toHaveTextContent('Retry this image')
  expect(value.actions.image).not.toHaveBeenCalled()
})

test('default state presents the two generation paths as equal-width columns beneath an H3',()=>{
 const value=port()
 value.input.directions=[{id:'prompt-only',title:'Old prompt',prompt:'Private prompt text',status:'pending',scope:'campaign'}]
 render(<VisualsModule port={value}/>)
 const group=screen.getByRole('group',{name:'Generate visuals'})
 expect(screen.getByRole('heading',{name:'Generate visuals',level:3})).toBeInTheDocument()
 expect(screen.getByText('Create visuals for each selected copy or universal campaign visuals.')).toBeInTheDocument()
 expect(group).toHaveClass('bs-visual-create__buttons')
 expect(group).toHaveClass('bs-visual-create__buttons--two-columns')
 expect(within(group).getByRole('button',{name:'Generate visuals for selected copy (1)'})).toBeInTheDocument()
 expect(within(group).getByRole('button',{name:'Generate campaign-wide visuals'})).toBeInTheDocument()
 expect(screen.queryByRole('article',{name:'Old prompt'})).not.toBeInTheDocument()
 expect(screen.queryByText(/Generation starts immediately/)).not.toBeInTheDocument()
 expect(value.actions.generate).not.toHaveBeenCalled()
})

test('generation shows the intended batch as grid placeholders and disables another click',async()=>{
 const value=port()
 value.actions.generate.mockImplementation(async(_mode,{onProgress})=>{onProgress({stage:'prompts',total:5,current:0});return new Promise(()=>{})})
 render(<VisualsModule port={value}/>)
 await userEvent.click(screen.getByRole('button',{name:'Generate campaign-wide visuals'}))
 expect(within(screen.getByRole('region',{name:'Visual results'})).getAllByRole('article')).toHaveLength(5)
 expect(screen.getByRole('button',{name:'Generate campaign-wide visuals'})).toBeDisabled()
})


test.each([
  ['running', 'Generating video…', 'status'],
  ['unknown', 'Submission is unconfirmed. Check this job before trying again.', 'status'],
  ['failed', 'Video generation failed. Check the saved job before trying again.', 'alert'],
])('shows %s video jobs in the results grid without submitting again', async (phase, message, role) => {
  const value = port()
  value.input.directions = [{id:'d1', title:'Daylight', prompt:'Soft light', status:'ready', previewAssetId:'image-1'}]
  value.actions.videoList = vi.fn(async () => ({jobs:[{id:'video-1', directionId:'d1', phase, createdAt:'2026-09-08T10:00:00Z'}]}))
  value.actions.videoSubmit = vi.fn()
  render(<VisualsModule port={value}/>)
  const tile = await screen.findByRole('article', {name:'Daylight video'})
  expect(within(tile).getByRole(role)).toHaveTextContent(message)
  await userEvent.click(within(tile).getByRole('button', {name:'Video options'}))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(value.actions.videoSubmit).not.toHaveBeenCalled()
})
