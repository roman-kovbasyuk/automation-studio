import { generationReasonMessage, UNKNOWN_RESOLUTION_WAIT_MS } from '../../../shared/generationErrors.js'

const stepNames = Object.freeze({
  brief_analysis: 'Brief analysis', copy: 'Copy generation', directions: 'Visual prompt generation',
  image: 'Image generation', video: 'Video generation',
})

export function generationStepName(step) {
  return stepNames[step] ?? 'Generation'
}

/** When an unknown outcome may be marked as failed (D33), or null. */
export function generationResolvableAt(job) {
  if (job?.status !== 'unknown') return null
  const timeout = Date.parse(job.timeoutAt ?? '')
  return Number.isFinite(timeout) ? timeout + UNKNOWN_RESOLUTION_WAIT_MS : null
}

/** One sentence for an operation that ended without a result; never a raw code. */
export function generationProblemMessage(job) {
  const reason = generationReasonMessage(job) ?? 'Something unexpected went wrong.'
  if (job?.status === 'unknown') return `We could not confirm the result. ${reason}`
  if (job?.status === 'blocked') return `${generationStepName(job.step)} was blocked. ${reason}`
  return `${generationStepName(job?.step)} failed. ${reason}`
}

/** The unfinished job that blocks editing, with what the interface needs to explain it. */
export function generationBlockFor(job) {
  if (!job || !['pending', 'unknown'].includes(job.status)) return null
  return {
    jobId: job.id, status: job.status, step: job.step, name: generationStepName(job.step),
    reason: job.status === 'unknown' ? generationReasonMessage(job) : null,
    resolvableAt: generationResolvableAt(job),
  }
}
