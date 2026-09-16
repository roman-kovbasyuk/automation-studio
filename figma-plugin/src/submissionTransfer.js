// One immutable capture per submission. Keep this object after a network error so
// retries reuse the command, bytes and completed uploads (including a lost finalize response).
export function createSubmissionTransfer({begin,capture,upload,finalize,key,onProgress=()=>{}}){
 let staged=null,outputs=null,inFlight=null
 const uploaded=new Set()
 async function attempt(){
  staged??=await begin({idempotencyKey:key})
  outputs??=await capture()
  for(const [index,output] of outputs.entries()){
   if(!uploaded.has(output.outputId)){
    await upload(staged.id,output)
    uploaded.add(output.outputId)
   }
   onProgress(index+1,outputs.length)
  }
  return finalize(staged.id)
 }
 return {run(){
  if(!inFlight)inFlight=attempt().finally(()=>{inFlight=null})
  return inFlight
 }}
}
