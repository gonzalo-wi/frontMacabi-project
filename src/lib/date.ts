/** Formateadores de fecha es-AR compartidos (consolidan copias locales idénticas). */

/** "YYYY-MM-DD" (o ISO) → "dd/mm/yyyy" por split de string (sin desfase de zona horaria). */
export function formatExpenseDate(dateStr: string): string {
  const parts = dateStr.slice(0, 10).split('-')
  if (parts.length !== 3) return dateStr
  const [y, m, d] = parts
  return `${d}/${m}/${y}`
}

/** ISO → "dd/mm/yyyy hh:mm". '—' si es null/undefined. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** ISO → "dd/mm/yyyy" (año completo). '—' si es null/undefined. */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** ISO → "dd/mm/yy" (año corto). */
export function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}
