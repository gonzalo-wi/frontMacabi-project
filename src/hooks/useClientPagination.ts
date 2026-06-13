import { useMemo, useState } from 'react'

import { PAGE_SIZE } from '@/lib/pagination'

/**
 * Paginación client-side: corta `items` en páginas y deriva totalPages / página segura.
 * Único lugar con la lógica de cortar/contar páginas — las pantallas solo pasan los items
 * (ya filtrados/ordenados) y reciben `pageItems` + lo que necesita `<PaginationControls>`.
 *
 * `resetKey`: cuando cambia (p. ej. al cambiar filtros/búsqueda) vuelve a la página 1,
 * sin `useEffect` (patrón "ajustar estado en render", evita el warning set-state-in-effect).
 */
export function useClientPagination<T>(
  items: T[],
  opts?: { pageSize?: number; resetKey?: string },
) {
  const pageSize = opts?.pageSize ?? PAGE_SIZE
  const [page, setPage] = useState(1)

  const [prevKey, setPrevKey] = useState(opts?.resetKey)
  if (opts?.resetKey !== prevKey) {
    setPrevKey(opts?.resetKey)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  )

  return { page: safePage, setPage, totalPages, pageItems }
}
