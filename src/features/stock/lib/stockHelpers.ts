/** Fecha corta de stock (dd/mm/aa) con fallback "Sin fecha". */
export function formatStockDate(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

/** Borde izquierdo de la fila según disponibilidad de un recurso. */
export function resourceStockBorderClass(available: number, total: number): string {
  if (available === 0) return 'border-l-destructive'
  const pct = total > 0 ? available / total : 1
  if (pct <= 0.25) return 'border-l-amber-400'
  return 'border-l-emerald-400'
}
