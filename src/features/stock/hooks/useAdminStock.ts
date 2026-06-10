import { useQuery } from '@tanstack/react-query'

import { listRequests } from '@/features/stock/api/requestsApi'
import { listResources } from '@/features/stock/api/stockApi'
import { PAGE_SIZE } from '@/lib/pagination'

/** Inventario paginado (vista admin). */
export function useAdminStockResources(
  token: string | null | undefined,
  page: number,
  isRestoring: boolean,
) {
  return useQuery({
    queryKey: ['admin-stock-resources', token, page],
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
    queryKey: ['admin-stock-requests-global', token, page],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => listRequests(token!, page, PAGE_SIZE),
  })
}
