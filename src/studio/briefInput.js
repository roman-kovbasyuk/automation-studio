import { MAX_BRIEF_UPLOAD_BYTES } from '../../shared/briefUploadLimits.js'

export const MAX_BRIEF_CHARACTERS = 20000
export const MAX_BRIEF_FILE_BYTES = MAX_BRIEF_UPLOAD_BYTES

export function briefToText(brief) {
  if (!brief) return ''
  const context = [
    ['Product', brief.product],
    ['Audience', brief.audience],
    ['Goal', brief.objective],
    ['Offer', brief.offer],
    ['Language', brief.locale === 'auto' ? '' : brief.locale],
  ]
    .filter(([, value]) => value?.trim())
    .map(([label, value]) => `${label}: ${value}`)
  return [brief.notes, ...context].filter(Boolean).join('\n\n')
}

export function combineBrief(message, files) {
  return [
    message.trim(),
    ...files.filter((file) => !file.error).map((file) => `Attached brief: ${file.name}\n${file.text.trim()}`),
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function briefTitle(text) {
  return (
    text
      .trim()
      .split(/[\n.!?]/)[0]
      .slice(0, 80)
      .trim() || 'New campaign'
  )
}

export function readBriefFile(file) {
  if (!file.size || file.size > MAX_BRIEF_FILE_BYTES)
    return Promise.reject(
      new Error('Choose a non-empty file. Campaign materials can total up to 25 MB.'),
    )
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () =>
      reject(new Error('The file could not be read. Try attaching it again.'))
    reader.onload = () =>
      resolve({
        name: file.name,
        mimeType:
          !file.type || file.type.toLowerCase() === 'application/octet-stream'
            ? 'application/octet-stream'
            : file.type,
        data: String(reader.result).split(',')[1],
      })
    reader.readAsDataURL(file)
  })
}
