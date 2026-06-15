import { useState } from 'react'
import { Package, Plus, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { listMyRequests } from '@/features/stock/api/requestsApi'
import { fetchAllResources } from '@/features/stock/api/stockApi'
import type { ResourceRequestDTO } from '@/features/stock/model/types'
import { CreateRequestDialog } from '@/features/stock/components/CreateRequestDialog'
import { ProjectStockPanel } from '@/features/stock/components/ProjectStockPanel'
import { StockRequestsList } from '@/features/stock/components/StockRequestsList'
import { ProjectScopeTabs } from '@/features/projects/components/ProjectScopeTabs'
import { useScopedParticipantListPage } from '@/features/projects/hooks/useScopedParticipantListPage'
import { ApiError } from '@/lib/api/apiClient'
import { fetchAllPages } from '@/lib/api/fetchAllPages'
import { queryKeys } from '@/lib/queryKeys'
import { useAuth } from '@/hooks/useAuth'
import { REQUEST_STATUS_ORDER, REQUEST_STATUS_FILTER_OPTIONS } from '@/features/stock/lib/status'
import { SelectFilter } from '@/components/SelectFilter'

function sortStockRequests(a: ResourceRequestDTO, b: ResourceRequestDTO) {
  const order = REQUEST_STATUS_ORDER
  const byStatus = order[a.status] - order[b.status]
  if (byStatus !== 0) return byStatus
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

function requestProjectId(req: ResourceRequestDTO) {
  return req.project_id
}

function requestStatus(req: ResourceRequestDTO) {
  return req.status
}

function requestMatchSearch(req: ResourceRequestDTO, term: string) {
  return (
    req.resource_name.toLowerCase().includes(term) ||
    req.project_name.toLowerCase().includes(term)
  )
}

export default function MisMaterialesPage() {
  const { token, user, isRestoring } = useAuth()
  const [open, setOpen] = useState(false)

  const q = useQuery({
    queryKey: queryKeys.stock.myRequestsGlobal(token),
    queryFn: () => fetchAllPages((p) => listMyRequests(token!, p, 50)),
    enabled: Boolean(token) && !isRestoring,
  })

  const resourcesQ = useQuery({
    queryKey: queryKeys.stock.resourcesAll(token),
    queryFn: () => fetchAllResources(token!),
    enabled: Boolean(token) && !isRestoring,
  })

  const {
    scope,
    projectFilter,
    setProjectFilter,
    statusFilter,
    setStatusFilter,
    query,
    setQuery,
    page,
    setPage,
    totalPages,
    pageItems,
  } = useScopedParticipantListPage({
    token,
    userId: user?.id,
    isRestoring,
    items: q.data ?? [],
    sort: sortStockRequests,
    getProjectId: requestProjectId,
    getStatus: requestStatus,
    matchSearch: requestMatchSearch,
  })

  const misContent = (
    <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-premium rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="text-base font-extrabold tracking-tight">Mis pedidos</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Cada pedido pertenece a un proyecto. Filtrá por proyecto, estado o ítem sin cambiar de pantalla.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-2.5 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ítem o proyecto..."
              className="pl-9 bg-background/50 focus-visible:ring-primary/30"
            />
          </div>
          <SelectFilter
            value={projectFilter}
            onValueChange={setProjectFilter}
            placeholder="Proyecto"
            triggerClassName="w-full bg-background/50 focus:ring-primary/30"
            options={[
              { value: 'all', label: 'Todos los proyectos' },
              ...scope.projectOptions.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <SelectFilter
            value={statusFilter}
            onValueChange={setStatusFilter}
            placeholder="Estado"
            triggerClassName="w-full bg-background/50 focus:ring-primary/30"
            options={REQUEST_STATUS_FILTER_OPTIONS}
          />
        </div>

        <StockRequestsList
          requests={pageItems}
          isLoading={q.isPending}
          isError={q.isError}
          error={q.error}
          detailBasePath="/app/stock/requests"
          showProject
          emptyMessage="No hay pedidos para los filtros seleccionados."
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={Package}
        title="Materiales"
        subtitle="Tus pedidos de materiales en todos los proyectos, con filtros y proyecto visible."
        action={
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            disabled={resourcesQ.isLoading || scope.membershipsQ.isLoading}
          >
            <Plus className="w-4 h-4 mr-1" />
            Solicitar material
          </Button>
        }
      />

      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
        {q.isError && (
          <p className="text-sm text-destructive">
            {q.error instanceof ApiError ? q.error.message : 'No se pudieron cargar tus pedidos'}
          </p>
        )}
        {resourcesQ.isError && (
          <p className="text-sm text-destructive">
            {resourcesQ.error instanceof ApiError ? resourcesQ.error.message : 'No se pudo cargar el catálogo'}
          </p>
        )}
        {scope.membershipsQ.isError && (
          <p className="text-sm text-destructive">
            {scope.membershipsQ.error instanceof ApiError
              ? scope.membershipsQ.error.message
              : 'No se pudieron cargar tus proyectos'}
          </p>
        )}

        <ProjectScopeTabs
          misLabel="Mis pedidos"
          coordinated={scope.coordinated}
          hasCoordinated={scope.hasCoordinated}
          activeTab={scope.activeTab}
          onTabChange={scope.setTab}
          selectedProjectId={scope.selectedProjectId}
          onProjectChange={scope.setProj}
          misContent={misContent}
          projectPanel={
            <ProjectStockPanel token={token!} projectId={scope.selectedProjectId} canManage />
          }
        />

        {token && (
          <CreateRequestDialog
            token={token}
            open={open}
            onOpenChange={setOpen}
            resources={resourcesQ.data ?? []}
            projectOptions={scope.projectOptions.map((p) => ({ id: p.id, name: p.name }))}
            contentClassName="max-w-md rounded-2xl border border-border/50 bg-card/95 backdrop-blur-lg shadow-premium"
          />
        )}
      </div>
    </div>
  )
}
