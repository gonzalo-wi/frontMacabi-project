import { useQuery } from '@tanstack/react-query'

import { listRequests } from '@/features/stock/api/requestsApi'
import { listResources } from '@/features/stock/api/stockApi'
import { PAGE_SIZE } from '@/lib/pagination'
import { queryKeys } from '@/lib/queryKeys'

/** Inventario paginado (vista admin). */
export function useAdminStockResources(
  token: string | null | undefined,
  page: number,
  q: string,
  isRestoring: boolean,
) {
  return useQuery({
    queryKey: queryKeys.stock.adminResources(token, page, q),
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => listResources(token!, { page, pageSize: PAGE_SIZE, q }),
  })
}

/** Pedidos globales paginados (vista admin). */
export function useAdminStockRequests(
  token: string | null | undefined,
  page: number,
  q: string,
  status: string,
  isRestoring: boolean,
) {
  return useQuery({
    queryKey: queryKeys.stock.adminRequestsGlobal(token, page, q, status),
    enabled: Boolean(token) && !isRestoring,
    queryFn: () =>
      listRequests(token!, {
        page,
        pageSize: PAGE_SIZE,
        q,
        status: status === 'all' ? undefined : status,
      }),
  })
}
