import { Link } from 'react-router-dom'
import { Clock, Search } from 'lucide-react'

import { PaginationControls } from '@/components/data/PaginationControls'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StockRequestStatusBadge } from '@/features/stock/components/StockRequestStatusBadge'
import type { RequestStatus, ResourceRequestDTO } from '@/features/stock/model/types'
import { RESOURCE_TYPE_LABELS } from '@/features/stock/lib/stockLabels'
import { formatStockDate } from '@/features/stock/lib/stockHelpers'
import { ApiError } from '@/lib/api/apiClient'
import { requestStatusBorderClass } from '@/lib/status'
import { cn } from '@/lib/utils'
import { SkeletonRows } from './SkeletonRows'

export function RequestsSection({
  requestsQ,
  filteredRequests,
  search,
  onSearch,
  status,
  onStatus,
  page,
  totalPages,
  onPageChange,
}: {
  requestsQ: { isLoading: boolean; isError: boolean; error: unknown }
  filteredRequests: ResourceRequestDTO[]
  search: string
  onSearch: (value: string) => void
  status: RequestStatus | 'all'
  onStatus: (value: RequestStatus | 'all') => void
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  return (
    <Card className="rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <CardTitle className="text-base font-bold">Pedidos</CardTitle>
        </div>
        <CardDescription className="text-xs mt-0.5">
          Pedidos globales de materiales. Tocá una fila para aprobar, entregar o devolver.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-4 sm:px-6 pb-5">
        {/* Filters */}
        <div className="grid gap-2 md:grid-cols-[1fr_190px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar ítem, proyecto o solicitante…"
              className="h-10 pl-9 bg-muted/30 border-border/60 focus:bg-background"
            />
          </div>
          <Select value={status} onValueChange={(v) => onStatus(v as RequestStatus | 'all')}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              <SelectItem value="RESERVADO">Reservado</SelectItem>
              <SelectItem value="ENTREGADO">Entregado</SelectItem>
              <SelectItem value="DEVUELTO">Devuelto</SelectItem>
              <SelectItem value="RECHAZADO">Rechazado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {requestsQ.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {requestsQ.error instanceof ApiError
              ? requestsQ.error.message
              : 'No se pudieron cargar los pedidos'}
          </div>
        )}

        {requestsQ.isLoading && <SkeletonRows count={5} />}

        {!requestsQ.isLoading && filteredRequests.length > 0 && (
          <div className="space-y-2">
            {filteredRequests.map((req) => (
              <Link
                key={req.id}
                to={`/app/admin/stock/requests/${req.id}`}
                className={cn(
                  'flex flex-wrap items-start justify-between gap-x-3 gap-y-2 rounded-xl border border-border/70 bg-card pl-3.5 pr-3 py-3 border-l-[3px] hover:bg-muted/20 transition-colors',
                  requestStatusBorderClass(req.status),
                )}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{req.resource_name}</p>
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {req.project_name}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {req.quantity} u. · {RESOURCE_TYPE_LABELS[req.resource_type]} ·{' '}
                    {req.requester_name}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Retiro: {formatStockDate(req.withdrawal_date)}
                    {req.return_date ? ` · Dev.: ${formatStockDate(req.return_date)}` : ''}
                  </p>
                </div>
                <StockRequestStatusBadge status={req.status} />
              </Link>
            ))}
          </div>
        )}

        {!requestsQ.isLoading && filteredRequests.length === 0 && !requestsQ.isError && (
          <div className="flex flex-col items-center gap-2.5 py-10 text-center border border-dashed rounded-xl">
            <Clock className="w-9 h-9 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">
              No hay pedidos para los filtros seleccionados.
            </p>
          </div>
        )}

        <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  )
}
