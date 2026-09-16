// Only already-accepted durable jobs are processed. Startup never creates jobs.
export function startVideoWorker(service,{intervalMs=2000}={}) {
  let stopped=false,timer,active
  async function tick() {
    if(stopped)return
    active=service.runNext().catch(()=>false)
    await active
    if(!stopped){timer=setTimeout(tick,intervalMs);timer.unref?.()}
  }
  timer=setTimeout(tick,intervalMs);timer.unref?.()
  return async()=>{stopped=true;clearTimeout(timer);await active}
}
