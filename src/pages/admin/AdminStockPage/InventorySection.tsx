import { Package, Search } from 'lucide-react'

import { ErrorBanner } from '@/components/data/ErrorBanner'
import { PaginationControls } from '@/components/data/PaginationControls'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { ResourceDTO } from '@/features/stock/model/types'
import { RESOURCE_TYPE_LABELS } from '@/features/stock/lib/stockLabels'
import { resourceStockBorderClass } from '@/features/stock/lib/stockHelpers'
import { ApiError } from '@/lib/api/apiClient'
import { cn } from '@/lib/utils'
import { ResourceActions } from './ResourceActions'
import { SkeletonRows } from './SkeletonRows'

export function InventorySection({
  resourcesQ,
  filteredResources,
  search,
  onSearch,
  onEdit,
  onDelete,
  page,
  totalPages,
  onPageChange,
}: {
  resourcesQ: { isLoading: boolean; isError: boolean; error: unknown }
  filteredResources: ResourceDTO[]
  search: string
  onSearch: (value: string) => void
  onEdit: (resource: ResourceDTO) => void
  onDelete: (id: string) => void
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  return (
    <Card className="rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary shrink-0" />
          <CardTitle className="text-base font-bold">Inventario</CardTitle>
        </div>
        <CardDescription className="text-xs mt-0.5">
          Ítems disponibles y cantidad actual.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-4 sm:px-6 pb-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar ítem…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="h-10 pl-9 bg-muted/30 border-border/60 focus:bg-background"
          />
        </div>

        {resourcesQ.isError && (
          <ErrorBanner
            message={resourcesQ.error instanceof ApiError ? resourcesQ.error.message : 'Error al cargar inventario'}
          />
        )}

        {resourcesQ.isLoading && <SkeletonRows count={4} />}

        {!resourcesQ.isLoading && filteredResources.length > 0 && (
          <div className="space-y-2">
            {filteredResources.map((r) => {
              const pct = r.total_stock > 0 ? (r.available_stock / r.total_stock) * 100 : 0
              return (
                <div
                  key={r.id}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-border/70 bg-card pl-3.5 pr-3 py-3 border-l-[3px] hover:bg-muted/20 transition-colors',
                    resourceStockBorderClass(r.available_stock, r.total_stock),
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm text-foreground">{r.name}</p>
                      <Badge
                        variant={r.type === 'returnable' ? 'secondary' : 'outline'}
                        className="text-[10px] font-medium"
                      >
                        {RESOURCE_TYPE_LABELS[r.type]}
                      </Badge>
                    </div>
                    {/* Stock bar */}
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 sm:w-32 rounded-full bg-muted overflow-hidden shrink-0">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            pct === 0
                              ? 'bg-destructive'
                              : pct <= 25
                              ? 'bg-amber-400'
                              : 'bg-emerald-500',
                          )}
                          style={{ width: `${Math.max(pct, 0)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        <span
                          className={cn(
                            'font-semibold',
                            pct === 0
                              ? 'text-destructive'
                              : pct <= 25
                              ? 'text-amber-600'
                              : 'text-emerald-600',
                          )}
                        >
                          {r.available_stock}
                        </span>{' '}
                        / {r.total_stock}
                      </p>
                    </div>
                  </div>
                  <ResourceActions resource={r} onEdit={onEdit} onDelete={onDelete} />
                </div>
              )
            })}
          </div>
        )}

        {!resourcesQ.isLoading && filteredResources.length === 0 && !resourcesQ.isError && (
          <div className="flex flex-col items-center gap-2.5 py-10 text-center border border-dashed rounded-xl">
            <Package className="w-9 h-9 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">
              No hay ítems para la búsqueda seleccionada.
            </p>
          </div>
        )}

        <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  )
}
