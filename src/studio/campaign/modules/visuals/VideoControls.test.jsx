import { render,screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect,test,vi } from 'vitest'
import { VideoControls } from './VideoControls.jsx'
const direction={id:'direction',title:'Bottle',prompt:'A slow camera move around a bottle.'}
const plan={id:'plan',model:'veo-3.1-lite-generate-preview',prompt:direction.prompt,aspectRatio:'16:9',durationSeconds:4,resolution:'720p',estimatedCostMicrounits:200000,expiresAt:new Date(Date.now()+60000).toISOString()}
test('prepares a video plan without generation and submits only after exact estimate acceptance',async()=>{
  const onPlan=vi.fn(async()=>plan),onSubmit=vi.fn(async()=>({id:'job',phase:'queued'}))
  const props={direction,onPlan,onSubmit,onRefresh:vi.fn(),assets:{getAssetBlob:vi.fn()}}
  const view=render(<VideoControls {...props}/> )
  expect(onPlan).not.toHaveBeenCalled();expect(onSubmit).not.toHaveBeenCalled()
  expect(screen.getByRole('button',{name:'Prepare video'})).toHaveClass('c-button')
  await userEvent.click(screen.getByRole('button',{name:'Prepare video'}))
  expect(onPlan).toHaveBeenCalledWith({directionId:'direction',aspectRatio:'16:9'})
  expect(onSubmit).not.toHaveBeenCalled()
  expect(screen.getByText(/estimated.*\$0.20/i)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button',{name:'Generate video · $0.20 estimate'}))
  expect(onSubmit).toHaveBeenCalledWith(plan,expect.any(String))
  view.rerender(<VideoControls {...props} job={{id:'job',phase:'running',asset:null}}/> )
  expect(onSubmit).toHaveBeenCalledTimes(1)
  expect(screen.getByText('Generating video…')).toBeInTheDocument()
})
test('unknown video offers status checking and never offers another generation automatically',()=>{
  const onSubmit=vi.fn()
  render(<VideoControls direction={direction} job={{id:'job',phase:'unknown',asset:null}} onSubmit={onSubmit} onRefresh={vi.fn()} assets={{}}/> )
  expect(screen.getByRole('button',{name:'Check video status'})).toBeInTheDocument()
  expect(screen.queryByRole('button',{name:'Prepare video'})).not.toBeInTheDocument()
  expect(onSubmit).not.toHaveBeenCalled()
})

test('source-video download failures show safe guidance and allow a retry without generation',async()=>{
  const asset={id:'video',sha256:'a'.repeat(64),width:1280,height:720,durationSeconds:4,hasAudio:true}
  const getAssetBlob=vi.fn().mockRejectedValue(new Error('private provider response'))
  const onSubmit=vi.fn()
  render(<VideoControls direction={direction} job={{id:'job',phase:'succeeded',asset}} assets={{getAssetBlob}} onSubmit={onSubmit}/> )
  await userEvent.click(screen.getByRole('button',{name:'Download source video'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('Video download failed. Try downloading again.')
  expect(screen.queryByText('private provider response')).not.toBeInTheDocument()
  expect(screen.getByRole('button',{name:'Download source video'})).toBeEnabled()
  expect(onSubmit).not.toHaveBeenCalled()
})
