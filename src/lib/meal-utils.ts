/**
 * Utilidades de fecha para la pantalla de comidas y reservas.
 *
 * Qué exporta este archivo (de arriba a abajo):
 * 1. todayMealYmd        → fecha de “hoy” para listar comidas (igual criterio que el backend en Argentina).
 * 2. mealDateYmd         → saca YYYY-MM-DD del texto que manda el API.
 * 3. formatEventDateAR   → “viernes, 25 de abril” para mostrar en la UI.
 * 4. isMealBookingOpen  → ¿todavía se puede reservar?
 * 5. bookingDeadlineIsoForMealYmd → instante límite para el countdown.
 */

// ---------------------------------------------------------------------------
// Constantes (mismo huso que LIST_MEALS_TZ en el backend)
// ---------------------------------------------------------------------------

/** Zona usada para definir “qué día es hoy” al abrir Comidas / Panel. */
const TIMEZONE_ARGENTINA = 'America/Buenos_Aires'

/**
 * Offset fijo para el cierre del plazo (Argentina, sin DST hoy).
 * El negocio: las reservas cierran a las 23:59 del día anterior al evento, hora local AR.
 */
const CIERRE_RESERVAS_OFFSET = '-03:00'

// ---------------------------------------------------------------------------
// Helpers internos (orden: de bajo nivel a más específicos)
// ---------------------------------------------------------------------------

/** Convierte un instante a "YYYY-MM-DD" según una zona IANA (p. ej. Buenos Aires). */
function toYyyyMmDd(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

/**
 * Del string del API (fecha sola o ISO), queda solo la parte YYYY-MM-DD.
 * Ej: "2026-04-25T00:00:00Z" → "2026-04-25"
 */
function extractYyyyMmDdFromApi(apiValue: string): string {
  const trimmed = apiValue.trim()
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]
  return trimmed.slice(0, 10)
}

/** Resta un día calendario a un YYYY-MM-DD (sin ambigüedad de huso). */
function minusOneCalendarDay(yyyyMmDd: string): string {
  const [year, month, day] = yyyyMmDd.split('-').map(Number)
  const anchorUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  anchorUtc.setUTCDate(anchorUtc.getUTCDate() - 1)
  const y = anchorUtc.getUTCFullYear()
  const m = String(anchorUtc.getUTCMonth() + 1).padStart(2, '0')
  const d = String(anchorUtc.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Último instante en que se puede reservar para un evento el día `eventDayYmd`:
 * 23:59:59.999 del día anterior, en hora Argentina.
 */
function reservationDeadlineAsDate(eventDayYmd: string): Date {
  const dayBeforeEvent = minusOneCalendarDay(eventDayYmd)
  return new Date(`${dayBeforeEvent}T23:59:59.999${CIERRE_RESERVAS_OFFSET}`)
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Hoy (calendario Argentina) como YYYY-MM-DD.
 * Debe coincidir con cómo el backend interpreta ?date=.
 *
 * TODO: cuando exista un endpoint “próximo evento de comida”, usar esa fecha en lugar de “hoy”.
 */
export function todayMealYmd(now: Date = new Date()): string {
  return toYyyyMmDd(now, TIMEZONE_ARGENTINA)
}

/** Igual que extractYyyyMmDdFromApi, exportado para el Panel (reservas vs día elegido). */
export function mealDateYmd(apiDate: string): string {
  return extractYyyyMmDdFromApi(apiDate)
}

/**
 * Etiqueta legible en español (Argentina) para un YYYY-MM-DD.
 * Usa mediodía UTC como ancla para que el día de la semana no se corra.
 */
export function formatEventDateAR(isoOrYmd: string): string {
  const yyyyMmDd = mealDateYmd(isoOrYmd)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return isoOrYmd.trim()

  const [y, mo, d] = yyyyMmDd.split('-').map(Number)
  const noonUtc = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0))
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(noonUtc)
}

/** ¿Todavía estamos antes del cierre de reservas para este evento? */
export function isMealBookingOpen(isoMealDate: string): boolean {
  const eventDay = mealDateYmd(isoMealDate)
  const deadline = reservationDeadlineAsDate(eventDay)
  return Date.now() <= deadline.getTime()
}

/** Instante límite en ISO (para getTimeRemaining / countdown). `ymd` = día del evento. */
export function bookingDeadlineIsoForMealYmd(eventDayYmd: string): string {
  return reservationDeadlineAsDate(eventDayYmd).toISOString()
}
