// Figma's plugin sandbox does not provide the browser TextEncoder global.
if(typeof globalThis.TextEncoder==='undefined')globalThis.TextEncoder=class{
  encode(value=''){
    const bytes=[]
    for(const character of String(value)){
      let point=character.codePointAt(0)
      if(point>=0xd800&&point<=0xdfff)point=0xfffd
      if(point<0x80)bytes.push(point)
      else if(point<0x800)bytes.push(0xc0|(point>>6),0x80|(point&63))
      else if(point<0x10000)bytes.push(0xe0|(point>>12),0x80|((point>>6)&63),0x80|(point&63))
      else bytes.push(0xf0|(point>>18),0x80|((point>>12)&63),0x80|((point>>6)&63),0x80|(point&63))
    }
    return new Uint8Array(bytes)
  }
}
