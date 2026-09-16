const TAU = Math.PI * 2

function seededRandom(seed) {
  let state = (Number(seed) || 0) >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

function format(value) {
  return Number(value.toFixed(2))
}

/**
 * Generate a smooth, deterministic blob contour for Novartis campaign art.
 * The output is an SVG path in a 160×160 viewBox so templates can resize it
 * without raster assets. Keep the seed stable when a template is re-rendered.
 */
export function generateBlobPath({
  seed = 12,
  lobes = 4,
  irregularity = 0.22,
  pointsPerLobe = 8,
  radius = 64,
  center = 80,
} = {}) {
  const count = Math.max(8, Math.round(Math.abs(lobes) * Math.max(2, pointsPerLobe)))
  const random = seededRandom(seed)
  const safeLobes = Math.max(1, Math.abs(Number(lobes) || 1))
  const safeIrregularity = Math.max(0, Math.min(0.8, Number(irregularity) || 0))
  const points = Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * TAU - Math.PI / 2
    const harmonic = Math.sin(angle * safeLobes + Number(seed) * 0.37) * 0.1
      + Math.cos(angle * (safeLobes + 1) - Number(seed) * 0.19) * 0.06
    const noise = (random() - 0.5) * 2 * safeIrregularity
    const pointRadius = Math.max(8, Number(radius) || 64) * (1 + harmonic + noise)
    return {
      x: center + Math.cos(angle) * pointRadius,
      y: center + Math.sin(angle) * pointRadius,
    }
  })

  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const start = midpoint(points[points.length - 1], points[0])
  let path = `M ${format(start.x)} ${format(start.y)}`
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    const next = points[(index + 1) % points.length]
    const target = midpoint(point, next)
    path += ` Q ${format(point.x)} ${format(point.y)} ${format(target.x)} ${format(target.y)}`
  }
  return `${path} Z`
}

export const NOVARTIS_BLOB_PRESETS = Object.freeze({
  hero: Object.freeze({ seed: 12, lobes: 4, irregularity: 0.22, pointsPerLobe: 8 }),
  feature: Object.freeze({ seed: 7, lobes: 5, irregularity: 0.16, pointsPerLobe: 7 }),
  accent: Object.freeze({ seed: 23, lobes: 3, irregularity: 0.26, pointsPerLobe: 9 }),
})
