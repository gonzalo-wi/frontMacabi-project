import { Link } from 'react-router-dom'
import { Calendar, ChevronRight, ClipboardList, Package } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { ErrorBanner } from '@/components/data/ErrorBanner'
import { PaginationControls } from '@/components/data/PaginationControls'
import { SkeletonRows } from '@/components/data/SkeletonRows'
import { StockRequestStatusBadge } from '@/features/stock/components/StockRequestStatusBadge'
import { RESOURCE_TYPE_LABELS } from '@/features/stock/lib/stockLabels'
import type { ResourceRequestDTO } from '@/features/stock/model/types'
import { ApiError } from '@/lib/api/apiClient'
import { formatShort } from '@/lib/date'
import { requestStatusBorderClass } from '@/features/stock/lib/status'
import { cn } from '@/lib/utils'

/**
 * Lista de pedidos de stock compartida por todas las vistas (admin global, proyecto, mis pedidos).
 * Es read-only: cada fila navega al detalle, donde se aprueba/rechaza/entrega/devuelve según permiso.
 * Los filtros/encabezados los pone cada página; este componente solo pinta filas + estados + paginado.
 */
export function StockRequestsList({
  requests,
  isLoading,
  isError,
  error,
  detailBasePath,
  showProject = false,
  emptyMessage = 'No hay pedidos de materiales.',
  page,
  totalPages,
  onPageChange,
}: {
  requests: ResourceRequestDTO[]
  isLoading: boolean
  isError: boolean
  error?: unknown
  /** Base del link al detalle, p. ej. '/app/stock/requests' o '/app/admin/stock/requests'. */
  detailBasePath: string
  /** Mostrar el badge de proyecto (vistas globales / mis pedidos). */
  showProject?: boolean
  emptyMessage?: string
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  return (
    <div className="space-y-2.5">
      {isError && (
        <ErrorBanner
          message={error instanceof ApiError ? error.message : 'No se pudieron cargar los pedidos'}
        />
      )}

      {isLoading && <SkeletonRows count={4} className="h-20" />}

      {!isLoading && !isError && requests.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-xl">
          <Package className="w-10 h-10 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )}

      {!isLoading &&
        requests.map((req) => (
          <Link
            key={req.id}
            to={`${detailBasePath}/${req.id}`}
            className={cn(
              'block rounded-xl border border-border/70 bg-card border-l-[3px] p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/20',
              requestStatusBorderClass(req.status),
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground leading-snug truncate">
                    {req.resource_name}
                  </h4>
                  {showProject && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    >
                      {req.project_name}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-muted-foreground"
                  >
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
                <StockRequestStatusBadge
                  status={req.status}
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5"
                />
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </Link>
        ))}

      <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
