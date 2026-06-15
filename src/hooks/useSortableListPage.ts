import { useCallback, useState } from 'react'

import type { SortDirection } from '@/components/data/SortableTable'

type SortableListPageConfig<Row, SortKey extends string> = {
  defaultSortKey: SortKey
  defaultSortDir?: SortDirection
  sortDirForKey?: (key: SortKey) => SortDirection
  matchSearch?: (row: Row, query: string) => boolean
  matchFilters?: (row: Row) => boolean
  compare: (a: Row, b: Row, sortKey: SortKey) => number
  resetDeps?: unknown[]
}

/**
 * Estado compartido para listados admin paginados en servidor: búsqueda, orden y
 * página con reset sin useEffect (mismo patrón que useClientPagination).
 *
 * Usar `rowsFrom(items)` sobre la página actual del servidor; memoizar en la pantalla
 * con `useMemo(() => rowsFrom(listQ.data?.data ?? []), [rowsFrom, listQ.data])`.
 */
export function useSortableListPage<Row, SortKey extends string>({
  defaultSortKey,
  defaultSortDir = 'asc',
  sortDirForKey,
  matchSearch,
  matchFilters,
  compare,
  resetDeps = [],
}: SortableListPageConfig<Row, SortKey>) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>(defaultSortKey)
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDir)

  const resetKey = [search, sortKey, sortDir, ...resetDeps].join('\0')
  const [prevResetKey, setPrevResetKey] = useState(resetKey)
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    setPage(1)
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(sortDirForKey?.(key) ?? 'asc')
  }

  const rowsFrom = useCallback(
    (items: Row[]) => {
      const query = search.trim().toLowerCase()
      const filtered = items.filter((row) => {
        if (matchFilters && !matchFilters(row)) return false
        if (!query) return true
        return matchSearch ? matchSearch(row, query) : true
      })

      return [...filtered].sort((a, b) => {
        const result = compare(a, b, sortKey)
        return sortDir === 'asc' ? result : -result
      })
    },
    [search, sortKey, sortDir, matchSearch, matchFilters, compare],
  )

  return {
    page,
    setPage,
    search,
    setSearch,
    sortKey,
    sortDir,
    handleSort,
    rowsFrom,
  }
}
