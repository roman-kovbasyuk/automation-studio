// Deterministic placeholder imagery for the offline prototype.
//
// The prototype never calls an image model, but its visuals, banners and brand
// screens still need real, decodable pixels. These scenes are textless on purpose:
// copy belongs to the banner template, not to the image. The same id always
// produces the same scene, so a reload shows the same visual.

const PALETTES = Object.freeze([
  { name: 'daylight', sky: ['#fbe3c4', '#f4b98c'], far: '#d98c62', near: ['#6f8f76', '#48644f'], sun: '#fff4dc' },
  { name: 'harbour', sky: ['#d7e8f2', '#9fc4dc'], far: '#7d9fb8', near: ['#40617c', '#263d52'], sun: '#ffffff' },
  { name: 'dusk', sky: ['#f3cfd6', '#b98bb5'], far: '#8a6a9c', near: ['#4d3f6b', '#2c2545'], sun: '#ffe7c2' },
  { name: 'meadow', sky: ['#e8f1d8', '#bfd9a4'], far: '#93b77a', near: ['#557a44', '#34502b'], sun: '#fffbe6' },
  { name: 'studio', sky: ['#efe9e1', '#d8cfc3'], far: '#b9a996', near: ['#8b7760', '#5d4d3c'], sun: '#fffaf2' },
  { name: 'citrus', sky: ['#fff0c7', '#ffc97a'], far: '#f09a4a', near: ['#c2572b', '#8a3a1c'], sun: '#fffbe8' },
])

/** FNV-1a: a small, stable string hash. Not for security. */
export function hashSeed(value) {
  let hash = 0x811c9dc5
  for (const char of String(value ?? '')) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

function random(seed) {
  let state = seed || 1
  return () => {
    state = Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) >>> 0
    state = Math.imul(state ^ (state >>> 12), 0x297a2d39) >>> 0
    return ((state ^ (state >>> 15)) >>> 0) / 4294967296
  }
}

function ridge(rand, baseline, amplitude, width, height) {
  const points = []
  const steps = 6
  for (let index = 0; index <= steps; index += 1) {
    const x = Math.round((width / steps) * index)
    const y = Math.round(baseline - amplitude * (0.35 + rand() * 0.65))
    points.push([x, y])
  }
  let path = `M0 ${height} L${points[0][0]} ${points[0][1]}`
  for (let index = 1; index < points.length; index += 1) {
    const [px, py] = points[index - 1]
    const [x, y] = points[index]
    const mid = Math.round((px + x) / 2)
    path += ` C${mid} ${py} ${mid} ${y} ${x} ${y}`
  }
  return `${path} L${width} ${height} Z`
}

/**
 * Returns SVG markup for a scene. `width` and `height` set the intrinsic size;
 * templates crop with object-fit, so the default 4:3 frame works for every format.
 */
export function placeholderSceneSvg(id, { width = 1600, height = 1200 } = {}) {
  const seed = hashSeed(id)
  const rand = random(seed)
  const palette = PALETTES[Math.floor(rand() * PALETTES.length)]
  const sunX = Math.round(width * (0.2 + rand() * 0.6))
  const sunY = Math.round(height * (0.18 + rand() * 0.18))
  const sunR = Math.round(Math.min(width, height) * (0.08 + rand() * 0.07))
  const far = ridge(rand, height * 0.62, height * 0.22, width, height)
  const near = ridge(rand, height * 0.82, height * 0.2, width, height)
  const gradientId = `sky-${seed.toString(36)}`
  const groundId = `ground-${seed.toString(36)}`
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<defs>',
    `<linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.sky[0]}"/><stop offset="1" stop-color="${palette.sky[1]}"/></linearGradient>`,
    `<linearGradient id="${groundId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.near[0]}"/><stop offset="1" stop-color="${palette.near[1]}"/></linearGradient>`,
    '</defs>',
    `<rect width="${width}" height="${height}" fill="url(#${gradientId})"/>`,
    `<circle cx="${sunX}" cy="${sunY}" r="${sunR * 1.9}" fill="${palette.sun}" opacity="0.28"/>`,
    `<circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="${palette.sun}"/>`,
    `<path d="${far}" fill="${palette.far}" opacity="0.85"/>`,
    `<path d="${near}" fill="url(#${groundId})"/>`,
    '</svg>',
  ].join('')
}

/** A simple geometric brand mark, used where the prototype needs a logo file. */
export function placeholderLogoSvg(id, { size = 512 } = {}) {
  const seed = hashSeed(id)
  const palette = PALETTES[Math.floor(random(seed)() * PALETTES.length)]
  const inset = Math.round(size * 0.18)
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="${size}" height="${size}" rx="${Math.round(size * 0.12)}" fill="${palette.near[1]}"/>`,
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - inset}" fill="${palette.sun}"/>`,
    `<rect x="${inset}" y="${Math.round(size * 0.6)}" width="${size - inset * 2}" height="${Math.round(size * 0.12)}" fill="${palette.far}"/>`,
    '</svg>',
  ].join('')
}

export const placeholderSceneBlob = (id, options) => new Blob([placeholderSceneSvg(id, options)], { type: 'image/svg+xml' })
export const placeholderLogoBlob = (id, options) => new Blob([placeholderLogoSvg(id, options)], { type: 'image/svg+xml' })
