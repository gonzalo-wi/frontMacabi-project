/** Tamaño de página estándar para listas navegables en toda la app. */
export const PAGE_SIZE = 10

/**
 * Rango de páginas a mostrar con elipsis: siempre primera y última,
 * y la actual ±1. Devuelve números y marcadores 'ellipsis' para los huecos.
 * Ej.: getPageRange(6, 10) => [1, 'ellipsis', 5, 6, 7, 'ellipsis', 10]
 */
export function getPageRange(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)

  if (start > 2) pages.push('ellipsis')
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < totalPages - 1) pages.push('ellipsis')

  pages.push(totalPages)
  return pages
}
