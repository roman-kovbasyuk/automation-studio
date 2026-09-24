import { bannerFormats } from './bannerFormats.js'

// One geometry source for animated previews and immutable PNG exports.
const box = (x, y, width, height) => ({ x, y, width, height })
const placements = (square, portrait, story, landscape) => ({ square, portrait, story, landscape })
export const studioRatios = [
  { id: 'square', width: 1080, height: 1080 },
  { id: 'portrait', width: 1080, height: 1350 },
  { id: 'story', width: 1080, height: 1920 },
  { id: 'landscape', width: 1200, height: 628 },
].map((ratio) => ({ ...ratio, safeArea: { top: 48, right: 48, bottom: 48, left: 48 } }))

const text = (id, fontSize, fontWeight, limits, positions) => ({
  id, type: id === 'cta' ? 'cta' : 'text', required: true,
  fontFamily: 'Inter', fontWeight, fontSize, minFontSize: fontSize,
  maxCharacters: limits[0], maxLines: limits[1], placements: positions,
})
const photo = (positions) => ({
  id: 'image', type: 'image', required: true, minWidth: 800, minHeight: 800,
  acceptedMimeTypes: ['image/jpeg', 'image/png'], placements: positions,
})
const shape = (type, fill, positions) => ({ type, fill, placements: positions })
const ctaBacking = (positions, fill) => shape('rect', fill, Object.fromEntries(
  Object.entries(positions).map(([id, p]) => [id, box(p.x - 24, p.y - 12, p.width + 48, p.height + 24)]),
))
const tag = (positions) => ({ ...text('tag', 18, 600, [40, 2], positions), required: false })
// Minimum sizes a slot may shrink to so realistic copy fits (headline, body and tag; the CTA sits in
// a fixed backing so it keeps its size). Equal minimums keep a template's text at one fixed size.
// Headline floors are per layout: the largest size at which 80-character headlines with long words
// still fit every size of that layout, less a 2px margin. Text only shrinks as far as the copy needs.
const headlineMinimums = Object.freeze({
  'editorial-split': 30, 'product-spotlight': 39, 'bold-announcement': 35, 'side-story': 29, 'caption-band': 35,
  'type-first': 46, 'color-block': 37, 'postcard': 35, 'minimal-strip': 38, 'layered-blocks': 42,
})
const fittingMinimums = Object.freeze({ headline: templateId => headlineMinimums[templateId], body: () => 22, tag: () => 14 })
const withFitting = templateId => slot => fittingMinimums[slot.id] ? { ...slot, minFontSize: fittingMinimums[slot.id](templateId) } : slot

const editorialCta = placements(box(88, 800, 330, 40), box(88, 545, 330, 40), box(88, 680, 330, 40), box(88, 480, 330, 40))
const spotlightCta = placements(box(88, 946, 330, 40), box(88, 1200, 330, 40), box(88, 1720, 330, 40), box(88, 478, 330, 40))
const announcementCta = placements(box(88, 898, 350, 40), box(88, 1180, 350, 40), box(88, 1738, 350, 40), box(88, 490, 350, 40))

export const legacyStudioTemplates = [
  {
    id: 'editorial-split', version: '1.0.0', name: 'Editorial split', ratios: studioRatios,
    presentation: {
      backgroundColor: '#F4EFE5', slotColors: { headline: '#183D36', body: '#183D36', cta: '#FFFFFF' },
      shapes: [
        shape('rect', '#C2D8C7', placements(box(550, 0, 530, 1080), box(0, 670, 1080, 680), box(0, 900, 1080, 1020), box(670, 0, 530, 628))),
        shape('ellipse', '#D8A154', placements(box(440, 80, 150, 150), box(862, 530, 140, 140), box(836, 720, 180, 180), box(586, 42, 120, 120))),
        ctaBacking(editorialCta, '#183D36'),
      ],
    },
    slots: [
      text('headline', 64, 700, [80, 4], placements(box(64, 134, 446, 320), box(64, 92, 900, 246), box(64, 152, 900, 310), box(64, 60, 570, 310))),
      text('body', 28, 400, [160, 5], placements(box(64, 508, 420, 190), box(64, 352, 850, 156), box(64, 490, 850, 150), box(64, 350, 570, 112))),
      text('cta', 26, 600, [24, 1], editorialCta),
      photo(placements(box(582, 284, 466, 676), box(64, 720, 952, 566), box(64, 960, 952, 832), box(704, 156, 464, 440))),
    ],
  },
  {
    id: 'product-spotlight', version: '1.0.0', name: 'Product spotlight', ratios: studioRatios,
    presentation: {
      backgroundColor: '#DDEAFF', slotColors: { headline: '#172F6E', body: '#172F6E', cta: '#FFFFFF' },
      shapes: [
        shape('ellipse', '#AAC8F8', placements(box(510, 30, 510, 510), box(450, 70, 580, 580), box(380, 180, 650, 650), box(760, 20, 420, 420))),
        shape('rect', '#172F6E', placements(box(64, 576, 88, 8), box(64, 775, 88, 8), box(64, 1160, 88, 8), box(64, 55, 88, 8))),
        ctaBacking(spotlightCta, '#172F6E'),
      ],
    },
    slots: [
      photo(placements(box(64, 48, 816, 486), box(64, 64, 816, 662), box(64, 140, 860, 920), box(674, 72, 478, 484))),
      text('headline', 64, 700, [80, 4], placements(box(64, 614, 936, 164), box(64, 818, 936, 232), box(64, 1210, 936, 310), box(64, 104, 566, 310))),
      text('body', 28, 400, [160, 5], placements(box(64, 794, 936, 120), box(64, 1055, 936, 120), box(64, 1530, 936, 150), box(64, 365, 560, 100))),
      text('cta', 26, 600, [24, 1], spotlightCta),
    ],
  },
  {
    id: 'bold-announcement', version: '1.0.0', name: 'Bold announcement', ratios: studioRatios,
    presentation: {
      backgroundColor: '#ED644B', slotColors: { headline: '#251E1C', body: '#251E1C', cta: '#FFFFFF' },
      shapes: [
        shape('rect', '#FBEFD6', placements(box(590, 220, 442, 600), box(64, 620, 952, 490), box(64, 855, 952, 780), box(752, 48, 400, 532))),
        shape('ellipse', '#FFD17D', placements(box(738, 50, 244, 244), box(822, 458, 192, 192), box(796, 635, 220, 220), box(617, 64, 176, 176))),
        ctaBacking(announcementCta, '#251E1C'),
      ],
    },
    slots: [
      text('headline', 72, 700, [80, 4], placements(box(64, 100, 505, 350), box(64, 92, 928, 265), box(64, 164, 930, 350), box(64, 76, 654, 300))),
      text('body', 28, 400, [160, 5], placements(box(64, 545, 440, 210), box(64, 380, 865, 170), box(64, 565, 855, 190), box(64, 372, 645, 100))),
      text('cta', 26, 600, [24, 1], announcementCta),
      photo(placements(box(622, 252, 378, 536), box(96, 652, 888, 426), box(96, 887, 888, 716), box(784, 80, 336, 468))),
    ],
  },
]

const tagPlacements = {
  'editorial-split': placements(box(64, 724, 440, 54), box(490, 546, 510, 54), box(490, 680, 510, 54), box(64, 532, 570, 48)),
  'product-spotlight': placements(box(550, 946, 466, 54), box(550, 1200, 466, 54), box(550, 1720, 466, 54), box(64, 530, 570, 48)),
  'bold-announcement': placements(box(64, 962, 505, 54), box(550, 1180, 466, 54), box(550, 1738, 466, 54), box(64, 536, 654, 44)),
}

// Published versions are immutable. Old compositions keep their original manifest.
export const taggedStudioTemplates = legacyStudioTemplates.map(template => ({
  ...structuredClone(template), version: '1.1.0',
  presentation: { ...structuredClone(template.presentation), slotColors: { ...template.presentation.slotColors, tag: template.presentation.slotColors.body } },
  slots: [...structuredClone(template.slots), { ...text('tag', 18, 600, [40, 2], tagPlacements[template.id]), required: false }],
}))

// Seven more layouts, authored once with the optional tag slot. They follow the rules every
// layout shares: text sits on the background or the first (surface) shape, the last shape backs
// the call to action, the top-left pixel stays background, and the image's lower right corner is
// left clear for the brand logo. The renderer and previews need no layout-specific code.
const sideStoryCta = placements(box(592, 944, 330, 40), box(592, 1214, 330, 40), box(120, 1776, 330, 40), box(660, 530, 300, 40))
const captionBandCta = placements(box(704, 944, 290, 40), box(704, 1250, 290, 40), box(120, 1796, 330, 40), box(672, 530, 290, 40))
const typeFirstCta = placements(box(88, 946, 330, 40), box(88, 1238, 330, 40), box(88, 1770, 330, 40), box(784, 540, 300, 40))
const colorBlockCta = placements(box(88, 565, 300, 40), box(88, 607, 300, 40), box(88, 700, 300, 40), box(88, 530, 260, 40))
const postcardCta = placements(box(700, 900, 252, 40), box(700, 1198, 252, 40), box(128, 1740, 330, 40), box(600, 498, 260, 40))
const minimalStripCta = placements(box(88, 946, 300, 40), box(88, 1238, 300, 40), box(88, 1120, 300, 40), box(88, 540, 280, 40))
const layeredBlocksCta = placements(box(88, 946, 300, 40), box(600, 566, 300, 40), box(600, 648, 300, 40), box(88, 510, 280, 40))

export const additionalStudioLayouts = [
  {
    id: 'side-story', version: '1.0.0', name: 'Side story', ratios: studioRatios,
    presentation: {
      backgroundColor: '#E8E1F3', slotColors: { headline: '#2B2141', body: '#2B2141', cta: '#FFFFFF', tag: '#2B2141' },
      shapes: [
        shape('rect', '#FFFFFF', placements(box(532, 48, 500, 984), box(532, 48, 500, 1254), box(48, 1080, 984, 792), box(600, 48, 552, 532))),
        shape('ellipse', '#F2B8A2', placements(box(944, 64, 48, 48), box(944, 64, 48, 48), box(944, 1096, 48, 48), box(1080, 500, 56, 56))),
        ctaBacking(sideStoryCta, '#2B2141'),
      ],
    },
    slots: [
      photo(placements(box(48, 48, 452, 984), box(48, 48, 452, 1254), box(48, 48, 984, 1000), box(48, 48, 520, 532))),
      text('headline', 56, 700, [80, 4], placements(box(568, 120, 428, 272), box(568, 140, 428, 272), box(96, 1152, 888, 272), box(636, 72, 480, 228))),
      text('body', 28, 400, [160, 5], placements(box(568, 420, 428, 176), box(568, 440, 428, 176), box(96, 1440, 888, 176), box(636, 308, 480, 146))),
      text('cta', 26, 600, [24, 1], sideStoryCta),
      tag(placements(box(568, 624, 428, 48), box(568, 644, 428, 48), box(96, 1632, 888, 48), box(636, 462, 420, 44))),
    ],
  },
  {
    id: 'caption-band', version: '1.0.0', name: 'Caption band', ratios: studioRatios,
    presentation: {
      backgroundColor: '#10263F', slotColors: { headline: '#10263F', body: '#10263F', cta: '#FFFFFF', tag: '#10263F' },
      shapes: [
        shape('rect', '#F6F1E7', placements(box(0, 528, 1080, 552), box(0, 720, 1080, 630), box(0, 1128, 1080, 792), box(600, 0, 600, 628))),
        shape('rect', '#E8A33D', placements(box(96, 564, 80, 8), box(96, 760, 80, 8), box(96, 1176, 80, 8), box(648, 52, 80, 8))),
        ctaBacking(captionBandCta, '#10263F'),
      ],
    },
    slots: [
      photo(placements(box(48, 48, 984, 456), box(48, 48, 984, 640), box(48, 48, 984, 1040), box(48, 48, 520, 532))),
      text('headline', 56, 700, [80, 4], placements(box(96, 592, 888, 272), box(96, 792, 888, 272), box(96, 1208, 888, 272), box(648, 72, 504, 228))),
      text('body', 28, 400, [160, 5], placements(box(96, 880, 560, 102), box(96, 1080, 888, 136), box(96, 1500, 888, 170), box(648, 308, 504, 146))),
      text('cta', 26, 600, [24, 1], captionBandCta),
      tag(placements(box(704, 880, 312, 44), box(96, 1236, 520, 44), box(96, 1690, 520, 44), box(648, 462, 504, 44))),
    ],
  },
  {
    id: 'type-first', version: '1.0.0', name: 'Type first', ratios: studioRatios,
    presentation: {
      backgroundColor: '#F7F3EC', slotColors: { headline: '#161616', body: '#161616', cta: '#FFFFFF', tag: '#161616' },
      shapes: [
        shape('rect', '#E4DCCF', placements(box(632, 592, 448, 488), box(632, 832, 448, 518), box(96, 892, 984, 800), box(792, 80, 408, 380))),
        shape('rect', '#FF5A36', placements(box(64, 464, 120, 12), box(64, 472, 120, 12), box(64, 524, 120, 12), box(64, 424, 96, 10))),
        ctaBacking(typeFirstCta, '#161616'),
      ],
    },
    slots: [
      text('headline', 72, 700, [80, 4], placements(box(64, 88, 952, 348), box(64, 96, 952, 348), box(64, 140, 952, 348), box(64, 56, 660, 348))),
      text('body', 28, 400, [160, 5], placements(box(64, 504, 480, 170), box(64, 512, 520, 170), box(64, 564, 952, 170), box(64, 452, 660, 102))),
      text('cta', 26, 600, [24, 1], typeFirstCta),
      photo(placements(box(600, 560, 432, 472), box(600, 800, 432, 502), box(64, 860, 968, 800), box(760, 48, 392, 380))),
      tag(placements(box(64, 692, 480, 44), box(64, 700, 520, 44), box(64, 752, 600, 44), box(760, 476, 392, 44))),
    ],
  },
  {
    id: 'color-block', version: '1.0.0', name: 'Color block', ratios: studioRatios,
    presentation: {
      backgroundColor: '#FFD84D', slotColors: { headline: '#1B1B1B', body: '#1B1B1B', cta: '#FFFFFF', tag: '#1B1B1B' },
      shapes: [
        shape('rect', '#FFF6D6', placements(box(0, 530, 1080, 110), box(0, 572, 1080, 110), box(0, 660, 1080, 120), box(0, 492, 640, 136))),
        shape('ellipse', '#FF7A59', placements(box(956, 48, 76, 76), box(956, 56, 76, 76), box(956, 96, 76, 76), box(604, 40, 72, 72))),
        ctaBacking(colorBlockCta, '#1B1B1B'),
      ],
    },
    slots: [
      text('headline', 64, 700, [80, 4], placements(box(64, 72, 860, 308), box(64, 80, 860, 308), box(64, 120, 860, 308), box(64, 56, 540, 264))),
      text('body', 28, 400, [160, 5], placements(box(64, 396, 952, 102), box(64, 404, 952, 136), box(64, 452, 952, 170), box(64, 328, 540, 146))),
      text('cta', 26, 600, [24, 1], colorBlockCta),
      photo(placements(box(0, 640, 1080, 440), box(0, 682, 1080, 668), box(0, 780, 1080, 1140), box(640, 0, 560, 628))),
      tag(placements(box(440, 562, 576, 44), box(440, 604, 576, 44), box(440, 698, 576, 44), box(388, 526, 228, 44))),
    ],
  },
  {
    id: 'postcard', version: '1.0.0', name: 'Postcard', ratios: studioRatios,
    presentation: {
      backgroundColor: '#2F5D50', slotColors: { headline: '#1F2B26', body: '#1F2B26', cta: '#FFFFFF', tag: '#1F2B26' },
      shapes: [
        shape('rect', '#FBF8F1', placements(box(64, 64, 952, 952), box(64, 64, 952, 1222), box(64, 64, 952, 1792), box(48, 48, 1104, 532))),
        shape('ellipse', '#F2A65A', placements(box(952, 32, 88, 88), box(952, 32, 88, 88), box(952, 32, 88, 88), box(1100, 24, 80, 80))),
        ctaBacking(postcardCta, '#1F2B26'),
      ],
    },
    slots: [
      photo(placements(box(104, 104, 872, 400), box(104, 104, 872, 560), box(104, 104, 872, 900), box(80, 80, 460, 468))),
      text('headline', 56, 700, [80, 4], placements(box(104, 528, 872, 272), box(104, 688, 872, 272), box(104, 1036, 872, 272), box(576, 88, 510, 232))),
      text('body', 28, 400, [160, 5], placements(box(104, 812, 540, 136), box(104, 972, 872, 136), box(104, 1324, 872, 170), box(576, 328, 540, 142))),
      text('cta', 26, 600, [24, 1], postcardCta),
      tag(placements(box(700, 830, 276, 44), box(104, 1124, 560, 44), box(104, 1512, 872, 44), box(904, 494, 216, 44))),
    ],
  },
  {
    id: 'minimal-strip', version: '1.0.0', name: 'Minimal strip', ratios: studioRatios,
    presentation: {
      backgroundColor: '#FAFAF7', slotColors: { headline: '#222222', body: '#222222', cta: '#FFFFFF', tag: '#222222' },
      shapes: [
        shape('rect', '#EDEBE4', placements(box(680, 0, 400, 1080), box(680, 0, 400, 1350), box(0, 1240, 1080, 680), box(760, 0, 440, 628))),
        shape('ellipse', '#4F6BED', placements(box(64, 96, 40, 40), box(64, 96, 40, 40), box(64, 140, 40, 40), box(64, 56, 28, 28))),
        ctaBacking(minimalStripCta, '#222222'),
      ],
    },
    slots: [
      text('headline', 64, 700, [80, 4], placements(box(64, 176, 552, 308), box(64, 196, 552, 308), box(64, 240, 952, 308), box(64, 100, 640, 308))),
      text('body', 28, 400, [160, 5], placements(box(64, 508, 520, 170), box(64, 528, 520, 170), box(64, 580, 800, 170), box(64, 416, 640, 102))),
      text('cta', 26, 600, [24, 1], minimalStripCta),
      photo(placements(box(728, 48, 304, 984), box(728, 48, 304, 1254), box(48, 1288, 984, 584), box(808, 48, 344, 532))),
      tag(placements(box(64, 700, 520, 44), box(64, 720, 520, 44), box(64, 776, 800, 44), box(420, 536, 300, 44))),
    ],
  },
  {
    id: 'layered-blocks', version: '1.0.0', name: 'Layered blocks', ratios: studioRatios,
    presentation: {
      backgroundColor: '#EAF2EC', slotColors: { headline: '#0F3B2E', body: '#0F3B2E', cta: '#FFFFFF', tag: '#0F3B2E' },
      shapes: [
        shape('rect', '#FFFFFF', placements(box(624, 504, 420, 520), box(144, 740, 820, 560), box(144, 840, 860, 900), box(780, 136, 380, 440))),
        shape('rect', '#9ED8B4', placements(box(592, 472, 420, 520), box(104, 700, 820, 560), box(104, 800, 860, 900), box(740, 96, 380, 440))),
        ctaBacking(layeredBlocksCta, '#0F3B2E'),
      ],
    },
    slots: [
      text('headline', 64, 700, [80, 4], placements(box(64, 72, 952, 308), box(64, 80, 952, 308), box(64, 120, 952, 308), box(64, 56, 600, 308))),
      text('body', 28, 400, [160, 5], placements(box(64, 404, 460, 170), box(64, 412, 952, 136), box(64, 452, 952, 170), box(64, 376, 600, 102))),
      text('cta', 26, 600, [24, 1], layeredBlocksCta),
      photo(placements(box(560, 440, 420, 520), box(64, 660, 820, 560), box(64, 760, 860, 900), box(700, 56, 380, 440))),
      tag(placements(box(64, 600, 460, 44), box(64, 564, 460, 44), box(64, 646, 460, 44), box(420, 506, 244, 44))),
    ],
  },
]

// Adds every advertised size a layout was not authored with, scaling the nearest authored layout
// to the exact canvas. Scaling only ever enlarges, so text keeps fitting and keeps its safe area.
function withEveryFormat(original, version) {
  const template = structuredClone(original)
  template.version = version
  for (const format of bannerFormats.filter(format => !template.ratios.some(ratio => ratio.id === format.id))) {
    const baseId = format.width === format.height ? 'square' : format.width > format.height ? 'landscape' : 'portrait'
    const base = original.ratios.find(ratio => ratio.id === baseId)
    const scaleBox = position => ({
      x: Math.round(position.x * format.width / base.width),
      y: Math.round(position.y * format.height / base.height),
      width: Math.floor(position.width * format.width / base.width),
      height: Math.floor(position.height * format.height / base.height),
    })
    template.ratios.push({ id: format.id, width: format.width, height: format.height, safeArea: { top: 48, right: 48, bottom: 48, left: 48 } })
    for (const slot of template.slots) slot.placements[format.id] = scaleBox(slot.placements[baseId])
    for (const shape of template.presentation.shapes) shape.placements[format.id] = scaleBox(shape.placements[baseId])
  }
  return template
}

// Published versions are immutable. 1.0, 1.1 and 1.2 of the first three layouts remain available for
// saved compositions and snapshots: 1.2.0 added every size, 1.3.0 lets headline, body and tag shrink to
// fit. The later layouts start at 1.0.0 with every size and fitting text.
export const sizedStudioTemplates = taggedStudioTemplates.map(template => withEveryFormat(template, '1.2.0'))
const withFittingText = (template, version) => ({ ...structuredClone(template), version, slots: template.slots.map(withFitting(template.id)) })

// 1.3.0 also corrects the first three layouts' geometry where text met decoration or other text:
// decorative ellipses moved clear of copy, landscape headlines no longer overlap the body, and the
// landscape tag in Bold announcement no longer runs into the call-to-action backing.
const revisedGeometry = {
  'editorial-split': {
    shapes: { 1: { square: box(568, 72, 150, 150), portrait: box(900, 604, 110, 110), story: box(836, 756, 160, 160), landscape: box(700, 40, 100, 100) } },
    slots: { headline: { landscape: box(64, 60, 570, 280) } },
  },
  'product-spotlight': { slots: { headline: { landscape: box(64, 104, 566, 252) } } },
  'bold-announcement': {
    shapes: { 1: { portrait: box(848, 556, 168, 168), story: box(820, 770, 196, 196), landscape: box(726, 24, 140, 140) } },
    slots: { headline: { landscape: box(64, 76, 654, 288) }, tag: { landscape: box(480, 490, 238, 44) } },
  },
}
function withRevisedGeometry(original) {
  const template = structuredClone(original)
  const revision = revisedGeometry[template.id] ?? {}
  for (const [index, byRatio] of Object.entries(revision.shapes ?? {})) Object.assign(template.presentation.shapes[index].placements, byRatio)
  for (const [slotId, byRatio] of Object.entries(revision.slots ?? {})) Object.assign(template.slots.find(slot => slot.id === slotId).placements, byRatio)
  return template
}

export const studioTemplates = [
  ...taggedStudioTemplates.map(template => withFittingText(withEveryFormat(withRevisedGeometry(template), '1.3.0'), '1.3.0')),
  ...additionalStudioLayouts.map(template => withFittingText(withEveryFormat(template, template.version), template.version)),
]

export const studioTemplateSamples = {
  'editorial-split': { headline: 'A little more quiet.', body: 'Make room for the sounds you love. Thoughtfully made for your everyday.', cta: 'Find your focus' },
  'product-spotlight': { headline: 'Your world. In full sound.', body: 'Immersive listening. All-day comfort. A new rhythm for every day.', cta: 'Meet your headphones' },
  'bold-announcement': { headline: 'Turn up your everyday.', body: 'Fresh color. Serious sound. Discover your next favorite pair.', cta: 'Explore the collection' },
  'side-story': { headline: 'Stories worth the detour.', body: 'Slow mornings, long walks and the sound that goes with you.', cta: 'Read the story' },
  'caption-band': { headline: 'Built for the long way home.', body: 'All-day comfort and quiet that lasts from the first stop to the last.', cta: 'Shop the range' },
  'type-first': { headline: 'Less noise. More you.', body: 'Fewer distractions, deeper focus and sound tuned for every day.', cta: 'Hear the difference' },
  'color-block': { headline: 'Bright days, better sound.', body: 'Fresh colours, a lighter fit and the battery to last all weekend.', cta: 'Pick your colour' },
  'postcard': { headline: 'Greetings from somewhere quiet.', body: 'Pack light and bring the sound that makes any trip feel like home.', cta: 'Plan your escape' },
  'minimal-strip': { headline: 'Quiet, by design.', body: 'Considered materials, clean lines and nothing you do not need.', cta: 'See the details' },
  'layered-blocks': { headline: 'Every layer, perfectly tuned.', body: 'Adaptive sound that shifts with your day, from morning calls to evening playlists.', cta: 'Explore the sound' },
}
