import { AtomsRoot, Inline, Stack, Text, tokens } from '../../../atoms'
import { Button, Toggle } from '../../../components'
import { useState } from 'react'

export default function Motion() {
  const [playing, setPlaying] = useState(false)
  return <AtomsRoot><Stack gap={4}>
    <Toggle label="Play loading motion" checked={playing} onChange={event => setPlaying(event.target.checked)} />
    <Inline><Button busy={playing}>{playing ? 'Loading' : 'Start a preview above'}</Button></Inline>
    <Text variant="small" tone="secondary">The shared Button owns spinner motion and reduced-motion behavior.</Text>
  </Stack></AtomsRoot>
}

export function MotionFeedback() {
  return <AtomsRoot><Stack gap={4}>
    <Inline><Button variant="primary">Hover or focus</Button><Button>Secondary action</Button></Inline>
    <Text variant="small" tone="secondary">Feedback: {tokens.motion.fast}. Disclosure: {tokens.motion.disclosure}. Shared controls own their transitions.</Text>
  </Stack></AtomsRoot>
}
