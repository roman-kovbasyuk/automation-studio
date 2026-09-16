import {expect,test,vi} from 'vitest'
import {createSubmissionTransfer} from './submissionTransfer.js'
test('retries a lost begin response with the same command and captures only once',async()=>{
 const begin=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({id:'s1'})
 const capture=vi.fn(async()=>[{outputId:'a',pngBase64:'AQ=='}]),upload=vi.fn(),finalize=vi.fn()
 const transfer=createSubmissionTransfer({begin,capture,upload,finalize,key:'stable'})
 await expect(transfer.run()).rejects.toThrow('offline')
 await transfer.run()
 expect(begin.mock.calls).toEqual([[{idempotencyKey:'stable'}],[{idempotencyKey:'stable'}]])
 expect(capture).toHaveBeenCalledTimes(1)
})
test('retries finalization without recapturing or uploading sealed artwork again',async()=>{
 const capture=vi.fn(async()=>[{outputId:'a',pngBase64:'AQ=='},{outputId:'b',pngBase64:'Ag=='}])
 const upload=vi.fn(),finalize=vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValue({ok:true})
 const transfer=createSubmissionTransfer({begin:async()=>({id:'s1'}),capture,upload,finalize,key:'stable'})
 await expect(transfer.run()).rejects.toThrow('timeout')
 await transfer.run()
 expect(capture).toHaveBeenCalledTimes(1);expect(upload).toHaveBeenCalledTimes(2)
 expect(finalize.mock.calls).toEqual([['s1'],['s1']])
})
