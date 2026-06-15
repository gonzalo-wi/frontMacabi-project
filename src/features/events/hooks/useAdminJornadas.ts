import { useQuery } from '@tanstack/react-query'

import { listEventInstances } from '@/features/events/api/eventsApi'
import { PAGE_SIZE } from '@/lib/pagination'
import { queryKeys } from '@/lib/queryKeys'

/** Lista paginada de jornadas (vista admin). */
export function useAdminJornadas(
  token: string | null | undefined,
  page: number,
  isRestoring: boolean,
) {
  return useQuery({
    queryKey: queryKeys.events.adminList(token, page),
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => listEventInstances(token!, page, PAGE_SIZE),
  })
}
