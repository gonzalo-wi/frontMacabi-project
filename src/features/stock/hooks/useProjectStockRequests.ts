import { useQuery } from '@tanstack/react-query'

import { listProjectRequests } from '@/features/stock/api/requestsApi'
import { PAGE_SIZE } from '@/lib/pagination'

/** Pedidos de stock de un proyecto (paginados). */
export function useProjectStockRequests(
  token: string | null | undefined,
  projectId: string | undefined,
  page: number,
  isRestoring: boolean,
) {
  return useQuery({
    queryKey: ['project-stock-requests', projectId, token, page],
    enabled: Boolean(token && projectId) && !isRestoring,
    queryFn: () => listProjectRequests(token!, projectId!, page, PAGE_SIZE),
  })
}
