/**
 * Formato y parseo de montos en pesos argentinos (es-AR).
 * Canonical = string decimal con punto ("1200.50") tal como lo espera el backend.
 * Display = formato es-AR con miles "." y decimal "," ("1.200,50").
 */

/** Formatea un monto (number o string canónico) como moneda ARS: "$ 1.200,50". */
export function formatARS(amount: number | string): string {
  const n = typeof amount === 'string' ? Number.parseFloat(amount) : amount
  if (Number.isNaN(n)) return '$ —'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/**
 * Formatea lo que el usuario va tipeando a estilo es-AR (miles ".", decimal ",", máx 2 dec).
 * Solo acepta dígitos y coma decimal; ignora cualquier otra cosa.
 */
export function formatArsInput(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, '')
  const firstComma = cleaned.indexOf(',')

  if (firstComma === -1) {
    const intDigits = cleaned.replace(/^0+(?=\d)/, '')
    return intDigits ? Number(intDigits).toLocaleString('es-AR') : ''
  }

  const intRaw = cleaned.slice(0, firstComma).replace(/,/g, '').replace(/^0+(?=\d)/, '')
  const decRaw = cleaned.slice(firstComma + 1).replace(/,/g, '').slice(0, 2)
  const intGrouped = intRaw ? Number(intRaw).toLocaleString('es-AR') : '0'
  return `${intGrouped},${decRaw}`
}

/** Convierte un display es-AR ("1.200,50") al canónico backend ("1200.50"). */
export function arsToCanonical(display: string): string {
  return display.replace(/\./g, '').replace(',', '.').trim()
}

/** Convierte un canónico ("1200.5") al display es-AR ("1.200,50") para precargar inputs. */
export function canonicalToArs(canonical: string): string {
  const n = Number.parseFloat(canonical)
  if (Number.isNaN(n)) return ''
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
