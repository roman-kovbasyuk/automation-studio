// Built-in JavaScript faults (for example "api.listVideoJobs is not a function") are never
// shown to people. Intentional errors in this app are plain Errors or carry a code.
const programmingFaults = new Set(['TypeError', 'ReferenceError', 'SyntaxError', 'RangeError'])

export const UNEXPECTED_ERROR_MESSAGE = 'Something unexpected went wrong. Check the latest state before trying again.'

export function isProgrammingFault(error) {
  return programmingFaults.has(error?.name) && !error.code
}

export function safeErrorMessage(error) {
  if (!error) return UNEXPECTED_ERROR_MESSAGE
  if (isProgrammingFault(error)) return UNEXPECTED_ERROR_MESSAGE
  return typeof error.message === 'string' && error.message ? error.message : typeof error === 'string' ? error : UNEXPECTED_ERROR_MESSAGE
}
