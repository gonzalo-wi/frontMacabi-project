import { useProjectScope } from '@/features/projects/hooks/useProjectScope'
import { useFilteredClientList } from '@/hooks/useFilteredClientList'
import { useSearchParamState } from '@/hooks/useSearchParamState'

type UseScopedParticipantListPageArgs<T> = {
  token: string | null | undefined
  userId: string | undefined | null
  isRestoring: boolean
  items: T[]
  sort: (a: T, b: T) => number
  getProjectId: (item: T) => string
  getStatus: (item: T) => string
  matchSearch: (item: T, term: string) => boolean
}

/**
 * Estado compartido de páginas participante con pestañas "Mis X" / "Del proyecto":
 * scope de proyecto, filtros en URL y lista filtrada/paginada client-side.
 */
export function useScopedParticipantListPage<T>({
  token,
  userId,
  isRestoring,
  items,
  sort,
  getProjectId,
  getStatus,
  matchSearch,
}: UseScopedParticipantListPageArgs<T>) {
  const scope = useProjectScope(token, userId, isRestoring)
  const [projectFilter, setProjectFilter] = useSearchParamState('project', 'all')
  const [statusFilter, setStatusFilter] = useSearchParamState('estado', 'all')
  const [query, setQuery] = useSearchParamState('q', '')

  const { page, setPage, totalPages, pageItems } = useFilteredClientList({
    items,
    query,
    projectFilter,
    statusFilter,
    sort,
    getProjectId,
    getStatus,
    matchSearch,
  })

  return {
    scope,
    projectFilter,
    setProjectFilter,
    statusFilter,
    setStatusFilter,
    query,
    setQuery,
    page,
    setPage,
    totalPages,
    pageItems,
  }
}
