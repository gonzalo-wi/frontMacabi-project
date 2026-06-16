import { useQuery } from '@tanstack/react-query'

import { listEventInstances } from '@/features/events/api/eventsApi'
import { PAGE_SIZE } from '@/lib/pagination'
import { queryKeys } from '@/lib/queryKeys'

/** Lista paginada de jornadas (vista admin). */
export function useAdminJornadas(
  token: string | null | undefined,
  page: number,
  q: string,
  status: string,
  isRestoring: boolean,
) {
  return useQuery({
    queryKey: queryKeys.events.adminList(token, page, q, status),
    enabled: Boolean(token) && !isRestoring,
    queryFn: () =>
      listEventInstances(token!, {
        page,
        pageSize: PAGE_SIZE,
        q,
        status: status === 'all' ? undefined : status,
      }),
  })
}
