export function progressValues(value: number, max: number) {
  const total = Number.isFinite(max) && max > 0 ? max : 100
  const current = Math.min(total, Math.max(0, Number.isFinite(value) ? value : 0))
  return { total, current, percent: Math.round(current / total * 100) }
}
