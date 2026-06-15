import { useMemo } from 'react'

import { useClientPagination } from '@/hooks/useClientPagination'

type UseFilteredClientListOptions<T> = {
  items: T[]
  query: string
  projectFilter: string
  statusFilter: string
  sort?: (a: T, b: T) => number
  getProjectId: (item: T) => string
  getStatus: (item: T) => string
  matchSearch: (item: T, term: string) => boolean
}

/**
 * Ordena, filtra y pagina client-side (Mis gastos / Mis materiales).
 * Reset de página vía resetKey en useClientPagination.
 */
export function useFilteredClientList<T>({
  items,
  query,
  projectFilter,
  statusFilter,
  sort,
  getProjectId,
  getStatus,
  matchSearch,
}: UseFilteredClientListOptions<T>) {
  const sorted = useMemo(() => {
    const rows = [...items]
    if (sort) rows.sort(sort)
    return rows
  }, [items, sort])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return sorted.filter((item) => {
      if (projectFilter !== 'all' && getProjectId(item) !== projectFilter) return false
      if (statusFilter !== 'all' && getStatus(item) !== statusFilter) return false
      if (!term) return true
      return matchSearch(item, term)
    })
  }, [sorted, query, projectFilter, statusFilter, getProjectId, getStatus, matchSearch])

  const { page, setPage, totalPages, pageItems } = useClientPagination(filtered, {
    resetKey: `${projectFilter}|${statusFilter}|${query}`,
  })

  return { filtered, page, setPage, totalPages, pageItems }
}
