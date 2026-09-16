export function createPrototypeScenarios() {
  const failures = new Map()
  let actor = 'marketer'
  let latencyMs = 450
  return {
    failNext({ operation, code = 'prototype_failure' }) {
      if (!operation) throw new TypeError('An operation is required.')
      failures.set(operation, code)
    },
    consume(operation) {
      const code = failures.get(operation)
      failures.delete(operation)
      return code
    },
    setLatency(ms) { latencyMs = Math.max(0, Number(ms) || 0) },
    getLatency() { return latencyMs },
    async setActor(role) { if (!['marketer', 'designer'].includes(role)) throw new TypeError('Unsupported prototype actor.'); actor = role },
    getActor() { return actor },
  }
}
