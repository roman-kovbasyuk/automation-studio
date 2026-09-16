import guidanceDocument from '../../../../docs/guides/2026-09-16-component-usage-guidance.md?raw'

export type GuidanceParagraph = { label: string; text: string }

const labels = 'Use when|In context|Choose and compose|Behavior and content'

function parseGuidance(document: string) {
  const guidance = new Map<string, GuidanceParagraph[]>()
  const paragraphPattern = new RegExp(`\\*\\*(${labels}):\\*\\*\\s*([\\s\\S]*?)(?=\n\n\\*\\*(?:${labels}):\\*\\*|$)`, 'g')
  for (const section of document.split(/^### /m).slice(1)) {
    const key = section.match(/^.+\n\n\*\*(?:Page key|Block key):\*\* `([^`]+)`/)?.[1]
    if (!key) continue
    const paragraphs = [...section.matchAll(paragraphPattern)].map(match => ({
      label: match[1],
      text: match[2].replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/\s+/g, ' ').trim(),
    }))
    if (paragraphs.length) guidance.set(key, paragraphs)
  }
  return guidance
}

const guidance = parseGuidance(guidanceDocument)

export function getUsageGuidance(id: string, fallback: readonly string[] = []) {
  return guidance.get(id) ?? fallback.map(text => ({ label: 'Guidance', text }))
}
