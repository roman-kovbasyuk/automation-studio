import { hashCanonical } from '../../shared/canonicalJson.js'
import { AGE_GROUPS } from '../../shared/briefingContracts.js'
import { deflateSync } from 'node:zlib'
import {
  analyseBriefInputSchema,
  analyseBriefResultSchema,
  generateCopyInputSchema,
  generateCopyResultSchema,
  generateDirectionsInputSchema,
  generateDirectionsResultSchema,
  generateImageInputSchema,
  generateImageResultSchema,
} from '../../shared/contracts.js'

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBytes = Buffer.from(type, 'ascii')
  const output = Buffer.alloc(12 + data.length)
  output.writeUInt32BE(data.length, 0)
  typeBytes.copy(output, 4)
  data.copy(output, 8)
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length)
  return output
}

function deterministicPng({ width, height, seed }) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 0, 0, 0, 0], 8)
  const seedBytes = Buffer.from(seed, 'hex')
  const scanlines = Buffer.alloc(height * (width + 1))
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width + 1)
    scanlines[rowOffset] = 0
    scanlines.fill((seedBytes[y % seedBytes.length] + y * 17) & 255, rowOffset + 1, rowOffset + width + 1)
  }
  return new Uint8Array(Buffer.concat([
    pngSignature,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND'),
  ]))
}

function abortIfNeeded(signal) {
  if (!(signal instanceof AbortSignal)) throw new TypeError('Mock provider requires an AbortSignal')
  if (signal.aborted) throw new DOMException('The generation request was aborted', 'AbortError')
}

function metadata({ model, region, input, outputUnits, actualCostMicrounits, blocked = false }) {
  return {
    provider: 'mock', model, region,
    usage: { inputUnits: JSON.stringify(input).length, outputUnits },
    actualCostMicrounits,
    safety: { verdict: blocked ? 'blocked' : 'safe', categories: blocked ? ['mock_policy'] : [] },
  }
}

function isBlocked(value) {
  return JSON.stringify(value).toLowerCase().includes('[blocked]')
}

function blockedResult(options, input) {
  return {
    ...metadata({ ...options, input, outputUnits: 0, actualCostMicrounits: 0, blocked: true }),
    error: { code: 'provider_blocked', message: 'The provider blocked this request for safety reasons.', retryable: false },
  }
}

function short(value, limit) {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`
}

const ageBounds = [[0, 17], [18, 24], [25, 34], [35, 44], [45, 54], [55, 64], [65, Infinity]]
const mockGoals = { awareness: 'awareness', traffic: 'traffic', leads: 'leads', signups: 'signups', 'sign-ups': 'signups', sales: 'sales' }

/** Deterministic stand-in for AI inference: explicit `Name: value` lines first, then a few everyday words. */
function mockBriefSettings(text) {
  const line = name => new RegExp(`^${name}:[ \\t]*(.+)$`, 'im').exec(text)?.[1].trim().toLowerCase()
  const words = text.toLowerCase(), settings = {}
  const age = /^(\d+)\s*(?:[-–]\s*(\d+)|(\+))$/.exec(line('Age') ?? '')
  if (age) {
    const low = Number(age[1]), high = age[3] ? Infinity : Number(age[2])
    settings.ageGroups = AGE_GROUPS.filter((_, index) => ageBounds[index][0] <= high && ageBounds[index][1] >= low)
  } else if (/\bstudents\b/.test(words)) settings.ageGroups = ['18_24']
  else if (/\bpensioners\b/.test(words)) settings.ageGroups = ['65_plus']
  const gender = { women: 'women', men: 'men', both: 'all' }[line('Gender')]
  if (gender) settings.gender = gender
  const goal = mockGoals[line('Goal')] ?? (/\bsign up\b/.test(words) ? 'signups' : undefined)
  if (goal) settings.goal = goal
  if (['local', 'national', 'global'].includes(line('Reach'))) settings.reach = line('Reach')
  const keywords = new RegExp('^Keywords:[ \\t]*(.+)$', 'im').exec(text)?.[1].split(',').map(item => item.trim().slice(0, 60)).filter(Boolean) ?? []
  const seen = new Set(), unique = keywords.filter(item => !seen.has(item.toLowerCase()) && seen.add(item.toLowerCase())).slice(0, 7)
  if (unique.length) settings.visualTags = unique
  const copyMode = { keep: 'keep_original', 'keep and write': 'keep_and_create' }[line('Copy')]
  if (copyMode) settings.copyMode = copyMode
  return settings
}

export function createMockProvider({ model = 'mock-v1', region = 'europe-west6' } = {}) {
  const options = { model, region }
  return Object.freeze({
    sourceDestination:'local-mock',
    async analyseBrief(input, signal) {
      abortIfNeeded(signal)
      const command = analyseBriefInputSchema.parse(input)
      if (isBlocked(command)) return analyseBriefResultSchema.parse(blockedResult(options, command))
      const subject = command.brief.product || command.brief.notes
      const audience = command.brief.audience || 'the audience described in the campaign notes'
      const intent = command.brief.objective || 'the campaign intent described in the notes'
      const analysis = {
        title: command.brief.analysis?.title || short(command.brief.product || command.brief.notes.split(/[.!?\n]/)[0], 80),
        audience: command.brief.analysis?.audience ?? command.brief.audience,
        objective: command.brief.analysis?.objective ?? command.brief.objective,
        channels: command.brief.analysis?.channels ?? ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube'].filter(channel => command.brief.notes.toLowerCase().includes(channel.toLowerCase())),
        formats: command.brief.analysis?.formats ?? [...new Set(command.brief.notes.match(/\b\d{2,4}\s*[x×]\s*\d{2,4}\b/g) ?? [])],
        summary: short(`${command.brief.analysis?.summary || `${subject} for ${audience}, focused on ${intent}.`}${command.instruction ? ` ${command.instruction}` : ''}`, 1_000),
        themes: [intent, command.brief.offer || 'clear value', 'confident simplicity'],
        warnings: command.brief.notes.toLowerCase().includes('personal data') ? ['Review the brief for personal data before publishing.'] : [],
      }
      if(command.sources) {
        const foundCopy=[]
        for(const source of command.sources) for(const block of source.blocks) for(const match of block.text.matchAll(/Headline: (.+)/g)) {
          const start=match.index+'Headline: '.length
          foundCopy.push({id:`found-${foundCopy.length+1}`,fields:{headline:match[1],body:'',offer:'',cta:''},verification:'text_verified',
            sourceRefs:[{sourceId:source.id,label:source.name,blockId:block.id,start,end:start+match[1].length,...(block.page?{page:block.page}:{})}]})
        }
        const settings=mockBriefSettings(command.sources.flatMap(source=>source.blocks.map(block=>block.text)).join('\n'))
        analysis.briefingProposal={sourceKey:command.brief.briefing.sourceKey,foundCopy,answers:{summary:analysis.summary,audience:audience,
          copyMode:foundCopy.length?settings.copyMode??null:'create_new',ageGroups:settings.ageGroups??[],gender:settings.gender??'all',
          reach:settings.reach??null,goal:settings.goal??null,goalCustom:'',visualTags:settings.visualTags??[]},suggestedVisualTags:settings.visualTags??[]}
      }
      return analyseBriefResultSchema.parse({ ...metadata({ ...options, input: command, outputUnits: 36, actualCostMicrounits: 80 }), analysis })
    },

    async generateCopy(input, signal) {
      abortIfNeeded(signal)
      const command = generateCopyInputSchema.parse(input)
      if (isBlocked(command)) return generateCopyResultSchema.parse(blockedResult(options, command))
      const seed = hashCanonical(command)
      const angles = [
        ['Make progress with', 'Build momentum through short, focused sessions designed for', 'Start learning'],
        ['A clearer way to choose', 'A practical path for', 'Explore the offer'],
        ['Your next step:', 'Turn intention into action with a focused experience for', 'Get started'],
        ['A fresh approach to', 'Discover an approachable experience created for', 'Discover more'],
        ['Ready for', 'Move forward with a clear next step shaped for', 'Try it today'],
      ]
      const subject = command.analysis.title || command.brief.product || 'your next goal'
      const audience = command.analysis.audience ?? (command.brief.audience || 'the audience in your brief')
      const extraLeads = ['Discover', 'Make time for', 'Meet', 'Step into', 'A little more',
        'Find your way with', 'Make it yours:', 'Everyday possibilities with', 'A new chapter with', 'Look closer at',
        'Bring home', 'Start something with', 'The next move is', 'Open the door to', 'Life with',
        'Your moment for', 'Fresh possibilities with', 'Try a new perspective on', 'Room to grow with', 'Put a spotlight on',
        'Move ahead with', 'A better day with', 'Simple starts with', 'Choose your path with', 'The everyday power of']
      const availableLeads = [...angles.map(angle => angle[0]), ...extraLeads]
        .filter(lead => !(command.previousHeadlines ?? []).includes(short(`${lead} ${subject}`, 80))).slice(0, 5)
      // Deleted cards free slots, so even repeated local-demo requests have five candidates.
      const copies = angles.map(([fallbackLead, bodyLead, cta], index) => ({
        id: `copy-${seed.slice(index * 8, index * 8 + 8)}`,
        headline: short(`${availableLeads[index] ?? fallbackLead} ${subject}`, 80),
        body: short(`${bodyLead} ${audience}. ${command.brief.offer}`.trim(), 160),
        offer: short(command.brief.offer, 40),
        cta,
        visualPrompt: short(`Editorial campaign visual for ${subject}; ${command.analysis.themes.join(', ')}; locale ${command.brief.locale}.`, 2_000),
      }))
      return generateCopyResultSchema.parse({ ...metadata({ ...options, input: command, outputUnits: 180, actualCostMicrounits: 240 }), copies })
    },

    async generateDirections(input, signal) {
      abortIfNeeded(signal)
      const command = generateDirectionsInputSchema.parse(input)
      if (isBlocked(command)) return generateDirectionsResultSchema.parse(blockedResult(options, command))
      const seed = hashCanonical(command)
      const concepts = [
        ['Nordic focus', 'Soft daylight, natural texture, quiet confidence'],
        ['Bold momentum', 'Graphic diagonal movement, crisp contrast, energetic crop'],
        ['Human progress', 'Authentic candid moment, warm light, generous negative space'],
        ['Product clarity', 'Clean studio still life, exact details, restrained palette'],
        ['Editorial story', 'Magazine composition, tactile layers, premium art direction'],
      ]
      const count = command.mode === 'campaign' ? 5 : command.mode === 'selected_copy' ? command.copies.length : 5
      const directions = Array.from({ length: count }, (_, index) => {
        const [title, style] = concepts[index % concepts.length]
        const message = command.mode === 'selected_copy' ? command.copies[index].headline
          : command.mode === 'campaign' ? command.copies.map(copy => copy.headline).join('; ') : command.copy.headline
        return {
        id: `direction-${seed.slice(0, 12)}-${index + 1}`,
        title,
        prompt: short(`${style}. Communicate “${message}” for ${command.brief.audience}. No embedded text or logos.`, 2_000),
        status: 'pending',
        previewAssetId: null,
        ...(command.mode === 'selected_copy' ? { copyId: command.copies[index].id } : {}),
      } })
      return generateDirectionsResultSchema.parse({ ...metadata({ ...options, input: command, outputUnits: 260, actualCostMicrounits: 320 }), directions })
    },

    async generateImage(input, signal) {
      abortIfNeeded(signal)
      const command = generateImageInputSchema.parse(input)
      if (isBlocked(command)) return generateImageResultSchema.parse(blockedResult(options, command))
      const seed = hashCanonical(command)
      return generateImageResultSchema.parse({
        ...metadata({ ...options, input: command, outputUnits: command.width * command.height, actualCostMicrounits: 1_000 }),
        image: { bytes: deterministicPng({ width: command.width, height: command.height, seed }), mimeType: 'image/png', width: command.width, height: command.height },
      })
    },
  })
}
