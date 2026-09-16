// Figma Desktop nests plugin UI in multiple sandbox frames; native replies come
// from the Figma host ancestor, not necessarily the immediate iframe parent.
export function isHostMessage(event,frameWindow){
 if(event.source===frameWindow)return false
 if(!['https://www.figma.com','https://figma.com'].includes(event.origin))return false
 let ancestor=frameWindow
 for(let depth=0;depth<4;depth++){
  const next=ancestor.parent
  if(next===ancestor)break
  if(event.source===next)return true
  ancestor=next
 }
 return false
}
