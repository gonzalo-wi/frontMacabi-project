/** Helpers for jornada response deadlines (ISO strings from API). */

export function parseApiDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Strictly before deadline: now < deadline. Missing deadline → still "open" for UX unless event is closed. */
export function isBeforeDeadline(
  responseDeadlineAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const d = parseApiDate(responseDeadlineAt ?? null)
  if (!d) return true
  return now.getTime() < d.getTime()
}

export function formatDeadlineAR(iso: string | null | undefined): string {
  const d = parseApiDate(iso ?? null)
  if (!d) return '—'
  return d.toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function formatStartsAR(iso: string): string {
  const d = parseApiDate(iso)
  if (!d) return iso
  // No mezclar `weekday` con `dateStyle`/`timeStyle`: en runtimes estrictos lanza TypeError (Invalid option).
  return d.toLocaleString('es-AR', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
