import {expect,test} from 'vitest'
import {isHostMessage} from './hostMessages.js'
test('accepts Figma native replies through nested sandbox ancestors only',()=>{
 const host={};host.parent=host
 const middle={parent:host},parent={parent:middle},frame={parent}
 expect(isHostMessage({source:host,origin:'https://www.figma.com'},frame)).toBe(true)
 expect(isHostMessage({source:{},origin:'https://www.figma.com'},frame)).toBe(false)
 expect(isHostMessage({source:parent,origin:'https://evil.example'},frame)).toBe(false)
 expect(isHostMessage({source:frame,origin:'https://www.figma.com'},frame)).toBe(false)
})
