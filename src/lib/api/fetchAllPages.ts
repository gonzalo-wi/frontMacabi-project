/**
 * Recolecta todas las páginas de un endpoint paginado.
 * `fetchPage(page)` debe devolver `{ data, total_pages }`. Corta al llegar a
 * `total_pages` o a `maxPages` (tope de seguridad).
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<{ data: T[]; total_pages: number }>,
  maxPages = 30,
): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page <= maxPages; page++) {
    const r = await fetchPage(page)
    out.push(...r.data)
    if (page >= r.total_pages) break
  }
  return out
}
