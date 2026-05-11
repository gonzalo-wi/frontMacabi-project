export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocalValue(local: string): string {
  const d = new Date(local)
  return d.toISOString()
}

/** Suma días al instante `iso` (usa calendario local). */
export function addCalendarDaysToIso(iso: string, days: number): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

/**
 * Mantiene el mismo intervalo entre inicio de jornada y cierre de respuestas que en el original,
 * aplicado al nuevo inicio.
 */
export function newDeadlinePreservingOffset(
  originalStartIso: string,
  originalDeadlineIso: string,
  newStartIso: string,
): string {
  const offsetMs =
    new Date(originalDeadlineIso).getTime() - new Date(originalStartIso).getTime()
  return new Date(new Date(newStartIso).getTime() + offsetMs).toISOString()
}
