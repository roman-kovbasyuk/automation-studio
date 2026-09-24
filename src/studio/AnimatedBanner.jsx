import { useEffect, useId, useMemo, useState } from 'react'
import { Grid, TextArea } from 'brutalist-design-system'
import { studioTemplates, studioTemplateSamples } from '../../shared/studioTemplates.js'
import { fitTextToBox, textLineHeight } from '../../shared/textFit.js'
import sampleImage from './assets/headphones.png'
import './banner-templates.css'
import '../../shared/fonts/arimo.css'

const bannerFamily = slot => slot.fontFamily === 'Arimo' ? 'Arimo' : 'Studio Banner Inter'
let bannerFontsReady = null
function loadBannerFonts() {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve(false)
  bannerFontsReady ??= Promise.all([400, 600, 700].flatMap(weight => ['Studio Banner Inter', 'Arimo']
    .map(family => document.fonts.load(`${weight} 32px "${family}"`)))).then(() => true, () => false)
  return bannerFontsReady
}
let measuringContext
function textMeasurer() {
  if (measuringContext === undefined) {
    try { measuringContext = document.createElement('canvas').getContext('2d') ?? null } catch { measuringContext = null }
  }
  return measuringContext
}

// Fits text with the renderer's shared rule, measured with the same Inter Display files, so the preview
// shrinks and breaks lines where the exported PNG does. Without fonts or canvas it keeps the design size.
function useFittedText(template, ratio, values) {
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    let active = true
    loadBannerFonts().then(ready => { if (active) setFontsReady(ready) })
    return () => { active = false }
  }, [])
  const textKey = template.slots.filter(slot => slot.type !== 'image').map(slot => values[slot.id] ?? '').join('\u0000')
  return useMemo(() => {
    const context = fontsReady ? textMeasurer() : null
    if (!context) return {}
    const fitted = {}
    for (const slot of template.slots) {
      if (slot.type === 'image' || !values[slot.id]?.trim()) continue
      const family = bannerFamily(slot)
      const result = fitTextToBox({ value: values[slot.id], slot, placement: slot.placements[ratio.id], measure: (text, fontSize) => {
        context.font = `${slot.fontWeight} ${fontSize}px "${family}"`
        return context.measureText(text).width
      } })
      fitted[slot.id] = result.ok ? result : { fontSize: slot.minFontSize ?? slot.fontSize, lines: null }
    }
    return fitted
  // textKey stands in for the text values the fit depends on.
  }, [fontsReady, template, ratio.id, textKey])
}

// The canvas is also the export coordinate space: responsive scaling never changes composition.
// Expressive artwork is isolated from the application's operational motion and type tokens.
export function AnimatedBanner({
  templateId = 'editorial-split', manifest, headline, body, cta, tag = '', imageUrl = sampleImage,
  ratioId = 'square', playing = true, className = '', title, slotValues = {}, imageUrls = {}, onTextChange, readOnly = false, ...rest
}) {
  const template = manifest ?? studioTemplates.find((item) => item.id === templateId) ?? studioTemplates[0]
  const ratio = template.ratios.find((item) => item.id === ratioId) ?? template.ratios[0]
  const defaults = studioTemplateSamples[template.id] ?? { headline: '', body: '', cta: '' }
  const values = { headline: headline ?? defaults.headline, body: body ?? defaults.body, cta: cta ?? defaults.cta, tag, ...slotValues }
  const titleId = useId()
  const fitted = useFittedText(template, ratio, values)
  const [hasPlayed, setHasPlayed] = useState(playing)
  useEffect(() => { if (playing) setHasPlayed(true) }, [playing])
  return (
    <><svg {...rest} className={`studio-banner studio-banner--${template.id} ${className}`}
      viewBox={`0 0 ${ratio.width} ${ratio.height}`} role="img" aria-labelledby={titleId}
      data-playing={playing} data-animated={hasPlayed} data-ratio={ratio.id}
      style={{ backgroundColor: template.presentation.backgroundColor, ...rest.style }}>
      <title id={titleId}>{title ?? `${template.name}: ${values.headline}. ${values.body} ${values.cta}${tag ? `. ${tag}` : ''}`}</title>
      <g aria-hidden="true">
        {template.presentation.shapes.map((shape, index) => {
          const p = shape.placements[ratio.id]
          const props = { fill: shape.fill, className: index === 1 ? 'studio-banner__geometry' : undefined }
          return shape.type === 'ellipse'
            ? <ellipse key={index} {...props} cx={p.x + p.width / 2} cy={p.y + p.height / 2} rx={p.width / 2} ry={p.height / 2} />
            : <rect key={index} {...props} {...p} />
        })}
        {template.slots.map((slot) => {
          const p = slot.placements[ratio.id]
          if (slot.type === 'image') {
            const source = imageUrls[slot.id] ?? imageUrl
            return source ? <image key={slot.id} className="studio-banner__image" {...p} href={source} preserveAspectRatio="xMidYMid slice" /> : null
          }
          if (!slot.required && !values[slot.id]?.trim()) return null
          const fit = fitted[slot.id]
          const fontSize = fit?.fontSize ?? slot.fontSize
          return <foreignObject key={slot.id} {...p} className={`studio-banner__copy studio-banner__copy--${slot.id}`}>
            <div xmlns="http://www.w3.org/1999/xhtml" className="studio-banner__text" data-font-size={fontSize}
              style={{ color: template.presentation.slotColors[slot.id], fontFamily: bannerFamily(slot), fontSize, fontWeight: slot.fontWeight, lineHeight: `${textLineHeight(fontSize)}px` }}>
              {fit?.lines ? fit.lines.map((line, index) => <span key={index} className="studio-banner__line">{line || '\u00a0'}</span>) : values[slot.id]}
            </div>
          </foreignObject>
        })}
        {(template.presentation.graphics ?? []).map(graphic => {
          const p = graphic.placements[ratio.id]
          return <g key={graphic.id} className="studio-banner__brand">
            <rect {...p} fill={graphic.backgroundColor} />
            <image x={p.x + 10} y={p.y + 10} width={p.width - 20} height={p.height - 20} href={graphic.dataUrl} preserveAspectRatio="xMidYMid meet" />
          </g>
        })}
      </g>
    </svg>{onTextChange && <BannerTextFields manifest={template} values={values} readOnly={readOnly} onChange={onTextChange} />}</>
  )
}

// CanvasText is no longer exported upstream. Keep editing outside the art so
// browser controls cannot alter exported typography or image-action geometry.
function BannerTextFields({ manifest, values, readOnly, onChange }) {
  return <Grid minItemWidth="12rem">{manifest.slots.filter(slot => slot.type !== 'image').map(slot => <TextArea key={slot.id}
    label={{ tag: 'Caption', headline: 'Headline', body: 'Body text', cta: 'CTA' }[slot.id] ?? slot.id}
    value={values[slot.id] ?? ''} rows={2} required={slot.required} readOnly={readOnly}
    aria-invalid={((values[slot.id]?.length ?? 0) > slot.maxCharacters || (slot.required && !values[slot.id]?.trim())) || undefined}
    onChange={event => onChange(slot.id, event.target.value)} />)}</Grid>
}

export default AnimatedBanner
