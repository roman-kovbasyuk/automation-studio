import {render,screen,fireEvent,waitFor} from '@testing-library/react'
import {expect,test,vi} from 'vitest'
import {FigmaPairingDialog} from './FigmaPairingDialog.jsx'
test('does not confirm a pairing until the user submits its code',async()=>{
 const api={confirmFigmaPairing:vi.fn(async()=>({ok:true}))}
 render(<FigmaPairingDialog api={api} pairingId="synthetic" onClose={()=>{}}/> )
 expect(api.confirmFigmaPairing).not.toHaveBeenCalled()
 expect(screen.getByLabelText('Plugin pairing code')).toHaveClass('c-text-input')
 expect(screen.getByRole('button',{name:'Connect plugin'})).toHaveClass('c-button')
 fireEvent.change(screen.getByLabelText('Plugin pairing code'),{target:{value:'ABC123'}})
 expect(api.confirmFigmaPairing).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'Connect plugin'}))
 await waitFor(()=>expect(screen.getByText(/Plugin connected/)).toBeVisible())
 expect(api.confirmFigmaPairing).toHaveBeenCalledWith('synthetic','ABC123')
})
