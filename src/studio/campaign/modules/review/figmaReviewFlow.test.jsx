import {fireEvent,render,screen} from '@testing-library/react'
import {expect,test,vi} from 'vitest'
import {ReviewView} from './ReviewView.jsx'
const version={id:'v1',versionNumber:1,createdAt:'2026-09-09T00:00:00Z',snapshot:{assets:[]}}
const success='Banners added to Figma, design will review shortly'
const assets={getAssetBlob:vi.fn(async()=>new Blob())}
function view(handoff,extra={}){return <ReviewView input={{phase:'in_review',version,figma:{loaded:true,handoff,submission:null},...extra}}
  access={{canEdit:false,canSendToFigma:true}} assets={assets} actions={{sendToFigma:vi.fn(),refreshFigma:vi.fn()}}/>}
test('only reports Figma success after all imported outputs are acknowledged',()=>{
  const {rerender}=render(view({state:'queued',figmaUrl:'https://www.figma.com/design/TestFile'}))
  expect(screen.queryByText(success)).toBeNull()
  expect(screen.getByText(/Open the Figma plugin/)).toBeVisible()
  rerender(view({state:'importing',figmaUrl:'https://www.figma.com/design/TestFile'}))
  expect(screen.queryByText(success)).toBeNull()
  rerender(view({state:'imported',figmaUrl:'https://www.figma.com/design/TestFile'}))
  expect(screen.getByText(success)).toBeVisible()
})
test('previews returned artwork and approves the submission the user saw',()=>{
  const approve=vi.fn()
  const submission={id:'submission-1',submissionHash:'a'.repeat(64),manifest:{frames:[{outputId:'output-1',asset:{id:'returned-1'}}]}}
  render(<ReviewView input={{phase:'ready',version,figma:{loaded:true,handoff:{state:'imported'},submission},history:{events:[{id:'ready-1',eventType:'ready',actorRole:'designer',createdAt:version.createdAt,payload:{}}]}}} access={{canEdit:true}} assets={assets} actions={{approve}} expectedInputKey="review-key"/> )
  expect(screen.getByText('Returned from Figma')).toBeVisible()
  fireEvent.click(screen.getByRole('button',{name:'Approve version 1'}))
  expect(approve).toHaveBeenCalledWith({expectedInputKey:'review-key',submissionId:'submission-1',submissionHash:'a'.repeat(64)})
})

test('keeps request changes available while Figma artwork is being reviewed',()=>{
  const requestChanges=vi.fn()
  render(<ReviewView input={{phase:'in_review',version,figma:{loaded:true,handoff:{state:'imported'},submission:null},history:{events:[]}}}
    access={{canEdit:true}} assets={assets} actions={{requestChanges}} expectedInputKey="review-key"/> )
  fireEvent.change(screen.getByLabelText('Request a change'),{target:{value:'Move the headline above the image.'}})
  fireEvent.click(screen.getByRole('button',{name:'Request changes'}))
  expect(requestChanges).toHaveBeenCalledWith('Move the headline above the image.',{expectedInputKey:'review-key'})
})
