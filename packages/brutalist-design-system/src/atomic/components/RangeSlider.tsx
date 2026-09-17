import { Stack, Text } from '../atoms'
import { Slider, type SliderProps } from './Slider'
import './value-controls.css'

export type RangeSliderProps = Omit<SliderProps, 'value' | 'onChange' | 'id' | 'name'> & { value: [number, number]; onChange: (value: [number, number]) => void; names?: [string, string]; lowerLabel?: string; upperLabel?: string }
/** Two independently labelled native controls preserve accessible keyboard behavior. */
export function RangeSlider({ label, value, onChange, min = 0, max = 100, names, lowerLabel = 'Minimum', upperLabel = 'Maximum', instructions, className = '', ...props }: RangeSliderProps) {
  const upper = Math.max(min, max), low = Math.min(upper, Math.max(min, Number.isFinite(value[0]) ? value[0] : min)), high = Math.min(upper, Math.max(low, Number.isFinite(value[1]) ? value[1] : upper))
  return <fieldset className={`c-range-slider ${className}`.trim()} disabled={props.disabled}>
    <legend><Text as="span" variant="h7">{label}</Text></legend>
    <Stack gap={4}>
      {instructions && <Text variant="small" tone="secondary">{instructions}</Text>}
      <Slider {...props} label={lowerLabel} name={names?.[0]} min={min} max={high} value={low} onChange={next => onChange([Math.min(next, high), high])} />
      <Slider {...props} label={upperLabel} name={names?.[1]} min={low} max={upper} value={high} onChange={next => onChange([low, Math.max(next, low)])} />
    </Stack>
  </fieldset>
}
