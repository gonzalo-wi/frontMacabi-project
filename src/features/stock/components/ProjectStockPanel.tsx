import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ChevronRight, ClipboardList, Package } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { StockRequestStatusBadge } from '@/components/StatusBadge'
import { PaginationControls } from '@/components/admin/PaginationControls'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { listProjectRequests } from '@/features/stock/api/requestsApi'
import type { RequestStatus, ResourceType } from '@/features/stock/model/types'
import { ApiError } from '@/lib/api/apiClient'
import { PAGE_SIZE } from '@/lib/pagination'
import { cn } from '@/lib/utils'

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  returnable: 'Retornable',
  consumable: 'Consumible',
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function borderClass(status: RequestStatus): string {
  switch (status) {
    case 'ENTREGADO': return 'border-l-emerald-500/80 dark:border-l-emerald-500'
    case 'RECHAZADO': return 'border-l-red-500/80 dark:border-l-red-500'
    case 'PENDIENTE': return 'border-l-amber-500/80 dark:border-l-amber-500'
    case 'RESERVADO': return 'border-l-sky-500/80 dark:border-l-sky-500'
    default:          return 'border-l-muted-foreground'
  }
}

/** Pedidos de stock de un proyecto (vista coordinador/admin). Filas → detalle donde se aprueba. */
export function ProjectStockPanel({ token, projectId }: { token: string; projectId: string }) {
  const [page, setPage] = useState(1)

  const q = useQuery({
    queryKey: ['project-stock-requests', projectId, token, page],
    queryFn: () => listProjectRequests(token, projectId, page, PAGE_SIZE),
    enabled: Boolean(token && projectId),
  })

  const requests = q.data?.data ?? []

  return (
    <Card className="rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-start gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <CardTitle className="text-base font-bold">Pedidos del proyecto</CardTitle>
          <CardDescription className="mt-0.5 text-xs leading-snug">
            Tocá un pedido para verlo y aprobar, rechazar, entregar o devolver.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 sm:px-6 pb-5">
        {q.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {q.error instanceof ApiError ? q.error.message : 'No se pudieron cargar los pedidos'}
          </div>
        )}

        {q.isLoading && (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" style={{ opacity: 1 - i * 0.25 }} />
            ))}
          </div>
        )}

        {!q.isLoading && !q.isError && requests.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-xl">
            <Package className="w-10 h-10 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">No hay pedidos de materiales en este proyecto.</p>
          </div>
        )}

        {requests.map((req) => (
          <Link
            key={req.id}
            to={`/app/stock/requests/${req.id}`}
            className={cn(
              'block rounded-xl border border-border/70 bg-card border-l-[3px] p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/20',
              borderClass(req.status),
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground leading-snug truncate">
                    {req.resource_name}
                  </h4>
                  <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-muted-foreground">
                    {RESOURCE_TYPE_LABELS[req.resource_type]}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-muted-foreground/75" />
                    {req.quantity} u.
                  </span>
                  <span>{req.requester_name}</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/75" />
                    {formatShort(req.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StockRequestStatusBadge status={req.status} className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5" />
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </Link>
        ))}

        <PaginationControls page={page} totalPages={q.data?.total_pages ?? 1} onPageChange={setPage} />
      </CardContent>
    </Card>
  )
}
