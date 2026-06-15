import { useMemo, useState } from 'react'

import { useClientPagination } from '@/hooks/useClientPagination'

type UseClientSortableListPageOptions<T, K extends string> = {
  items: T[]
  initialSortKey: K
  defaultSortDir: (key: K) => 'asc' | 'desc'
  compare: (a: T, b: T, key: K, dir: 'asc' | 'desc') => number
  matchSearch: (item: T, term: string) => boolean
}

/** Búsqueda + orden client-side + paginación (Admin usuarios, etc.). */
export function useClientSortableListPage<T, K extends string>({
  items,
  initialSortKey,
  defaultSortDir,
  compare,
  matchSearch,
}: UseClientSortableListPageOptions<T, K>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(initialSortKey)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => defaultSortDir(initialSortKey))

  function handleColumnSort(k: K) {
    if (k === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(k)
      setSortDir(defaultSortDir(k))
    }
  }

  function handleMobileSortValue(v: string) {
    const [k, d] = v.split(':') as [K, 'asc' | 'desc']
    setSortKey(k)
    setSortDir(d)
  }

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = [...items]
    if (q) {
      list = list.filter((item) => matchSearch(item, q))
    }
    list.sort((a, b) => compare(a, b, sortKey, sortDir))
    return list
  }, [items, search, sortKey, sortDir, compare, matchSearch])

  const { page, setPage, totalPages, pageItems } = useClientPagination(filteredSorted, {
    resetKey: `${search}|${sortKey}|${sortDir}`,
  })

  return {
    search,
    setSearch,
    sortKey,
    sortDir,
    handleColumnSort,
    handleMobileSortValue,
    filteredSorted,
    page,
    setPage,
    totalPages,
    pageItems,
  }
}
