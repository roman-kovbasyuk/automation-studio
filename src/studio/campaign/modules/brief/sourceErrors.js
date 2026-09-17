// Plain-language reasons for a campaign source that could not be used; codes are never shown.
const messages = Object.freeze({
  brief_file_too_large: 'This file is larger than 25 MB.',
  brief_text_too_large: 'This file has more text than a brief can use (20,000 characters).',
  brief_collection_text_too_large: 'Together, the attached files have more text than a brief can use. Remove a file or attach shorter documents.',
  brief_collection_too_large: 'Use at most 10 files and 25 MB in total.',
  invalid_brief_file: 'This file type or its contents are not supported.',
  unreadable_brief_file: 'No readable campaign text was found in this file.',
  source_processing_failed: 'This file could not be read.',
  source_storage_failed: 'The upload could not be saved.',
  source_bytes_unavailable: 'The saved file could not be read. Upload it again.',
  source_identity_conflict: 'The saved file does not match the upload. Upload it again.',
})

export function sourceErrorMessage(code) {
  if (!code) return null
  return Object.hasOwn(messages, code) ? messages[code] : 'This file could not be read.'
}
