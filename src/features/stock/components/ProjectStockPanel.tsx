import { useMemo, useState } from 'react'
import { Package, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { ActionButton } from '@/components/ActionButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchAllResources } from '@/features/stock/api/stockApi'
import { CreateRequestDialog } from '@/features/stock/components/CreateRequestDialog'
import { StockRequestsList } from '@/features/stock/components/StockRequestsList'
import { useProjectStockRequests } from '@/features/stock/hooks/useProjectStockRequests'
import type { RequestStatus } from '@/features/stock/model/types'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Pedidos de stock de un proyecto. Vista única para admin y coordinador:
 * lista read-only → detalle (donde se gestionan los estados según permiso).
 * Con `canManage`, suma el botón "Nuevo pedido".
 */
export function ProjectStockPanel({
  token,
  projectId,
  canManage = false,
}: {
  token: string
  projectId: string
  canManage?: boolean
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)

  const requestsQ = useProjectStockRequests(token, projectId, page, false)

  const resourcesQ = useQuery({
    queryKey: queryKeys.stock.resourcesAll(token),
    enabled: Boolean(token) && canManage,
    queryFn: () => fetchAllResources(token),
  })

  const requests = requestsQ.data?.data ?? []
  const totalRequests = requestsQ.data?.total ?? 0

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<RequestStatus, number>> = {}
    for (const req of requests) counts[req.status] = (counts[req.status] ?? 0) + 1
    return counts
  }, [requests])

  return (
    <div className="space-y-4">

      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-primary shrink-0" />
                Pedidos de materiales
              </CardTitle>

              {!requestsQ.isLoading && totalRequests > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {totalRequests} pedido{totalRequests !== 1 ? 's' : ''}
                  </span>
                  {!!statusCounts.PENDIENTE && (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {statusCounts.PENDIENTE} pendiente{statusCounts.PENDIENTE !== 1 ? 's' : ''}
                    </span>
                  )}
                  {!!statusCounts.RESERVADO && (
                    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {statusCounts.RESERVADO} reservado{statusCounts.RESERVADO !== 1 ? 's' : ''}
                    </span>
                  )}
                  {!!statusCounts.ENTREGADO && (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {statusCounts.ENTREGADO} entregado{statusCounts.ENTREGADO !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>

            {canManage && (
              <ActionButton
                intent="primary"
                size="sm"
                onClick={() => setCreateOpen(true)}
                disabled={resourcesQ.isLoading}
              >
                <Plus className="w-4 h-4" />
                Nuevo pedido
              </ActionButton>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-5">
          <StockRequestsList
            requests={requests}
            isLoading={requestsQ.isLoading}
            isError={requestsQ.isError}
            error={requestsQ.error}
            detailBasePath="/app/stock/requests"
            emptyMessage="Todavía no hay pedidos de materiales para este proyecto."
            page={page}
            totalPages={requestsQ.data?.total_pages ?? 1}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {canManage && (
        <CreateRequestDialog
          token={token}
          open={createOpen}
          onOpenChange={setCreateOpen}
          resources={resourcesQ.data ?? []}
          projectId={projectId}
          title="Nuevo pedido de material"
        />
      )}
    </div>
  )
}
