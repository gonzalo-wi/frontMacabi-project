import { Clock, Search } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StockRequestsList } from '@/features/stock/components/StockRequestsList'
import type { RequestStatus, ResourceRequestDTO } from '@/features/stock/model/types'

export function RequestsSection({
  requestsQ,
  rows,
  search,
  onSearch,
  status,
  onStatus,
  page,
  totalPages,
  onPageChange,
}: {
  requestsQ: { isLoading: boolean; isError: boolean; error: unknown }
  rows: ResourceRequestDTO[]
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

        <StockRequestsList
          requests={rows}
          isLoading={requestsQ.isLoading}
          isError={requestsQ.isError}
          error={requestsQ.error}
          detailBasePath="/app/admin/stock/requests"
          showProject
          emptyMessage="No hay pedidos para los filtros seleccionados."
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </CardContent>
    </Card>
  )
}
