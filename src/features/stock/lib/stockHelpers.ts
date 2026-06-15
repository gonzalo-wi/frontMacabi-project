/** Borde izquierdo de la fila según disponibilidad de un recurso. */
export function resourceStockBorderClass(available: number, total: number): string {
  if (available === 0) return 'border-l-destructive'
  const pct = total > 0 ? available / total : 1
  if (pct <= 0.25) return 'border-l-amber-400'
  return 'border-l-emerald-400'
}
