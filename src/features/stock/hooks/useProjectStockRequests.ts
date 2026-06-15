import { useQuery } from '@tanstack/react-query'

import { listProjectRequests } from '@/features/stock/api/requestsApi'
import { PAGE_SIZE } from '@/lib/pagination'
import { queryKeys } from '@/lib/queryKeys'

/** Pedidos de stock de un proyecto (paginados). */
export function useProjectStockRequests(
  token: string | null | undefined,
  projectId: string | undefined,
  page: number,
  isRestoring: boolean,
) {
  return useQuery({
    queryKey: queryKeys.stock.projectRequests(projectId, token, page),
    enabled: Boolean(token && projectId) && !isRestoring,
    queryFn: () => listProjectRequests(token!, projectId!, page, PAGE_SIZE),
  })
}
