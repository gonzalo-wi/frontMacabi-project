import { useQuery } from '@tanstack/react-query'

import { listRequests } from '@/features/stock/api/requestsApi'
import { listResources } from '@/features/stock/api/stockApi'
import { PAGE_SIZE } from '@/lib/pagination'
import { queryKeys } from '@/lib/queryKeys'

/** Inventario paginado (vista admin). */
export function useAdminStockResources(
  token: string | null | undefined,
  page: number,
  isRestoring: boolean,
) {
  return useQuery({
    queryKey: queryKeys.stock.adminResources(token, page),
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => listResources(token!, page, PAGE_SIZE),
  })
}

/** Pedidos globales paginados (vista admin). */
export function useAdminStockRequests(
  token: string | null | undefined,
  page: number,
  isRestoring: boolean,
) {
  return useQuery({
    queryKey: queryKeys.stock.adminRequestsGlobal(token, page),
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => listRequests(token!, page, PAGE_SIZE),
  })
}
