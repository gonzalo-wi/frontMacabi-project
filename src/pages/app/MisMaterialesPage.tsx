import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, Package, Plus, Search } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { fromDatetimeLocalValue } from '@/features/events/lib/datetimeLocal'
import { createRequest, listMyRequests } from '@/features/stock/api/requestsApi'
import { fetchAllResources } from '@/features/stock/api/stockApi'
import type {
  RequestStatus,
  ResourceDTO,
  ResourceType,
} from '@/features/stock/model/types'
import { ProjectStockPanel } from '@/features/stock/components/ProjectStockPanel'
import { StockRequestsList } from '@/features/stock/components/StockRequestsList'
import { ProjectScopeTabs } from '@/features/projects/components/ProjectScopeTabs'
import { useProjectScope } from '@/features/projects/hooks/useProjectScope'
import { ApiError } from '@/lib/api/apiClient'
import { fetchAllPages } from '@/lib/api/fetchAllPages'
import { useAuth } from '@/hooks/useAuth'
import { useClientPagination } from '@/hooks/useClientPagination'
import { REQUEST_STATUS_ORDER, REQUEST_STATUS_FILTER_OPTIONS } from '@/lib/status'
import { SelectFilter } from '@/components/SelectFilter'

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  returnable: 'Retornable',
  consumable: 'Consumible',
}

type RequestForm = {
  project_id: string
  resource_id: string
  quantity: string
  withdrawal_date: string
  return_date: string
  notes: string
}

const EMPTY_FORM: RequestForm = {
  project_id: '',
  resource_id: '',
  quantity: '1',
  withdrawal_date: '',
  return_date: '',
  notes: '',
}

export default function MisMaterialesPage() {
  const { token, user, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project') ?? 'all')
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<RequestForm>(EMPTY_FORM)

  const scope = useProjectScope(token, user?.id, isRestoring)

  const q = useQuery({
    queryKey: ['participant-my-stock-requests-global', token],
    queryFn: () => fetchAllPages((p) => listMyRequests(token!, p, 50)),
    enabled: Boolean(token) && !isRestoring,
  })

  const resourcesQ = useQuery({
    queryKey: ['stock-resources-all', token],
    queryFn: () => fetchAllResources(token!),
    enabled: Boolean(token) && !isRestoring,
  })

  useEffect(() => {
    setProjectFilter(searchParams.get('project') ?? 'all')
  }, [searchParams])

  const resourcesMap = useMemo(() => {
    const out = new Map<string, ResourceDTO>()
    for (const r of resourcesQ.data ?? []) out.set(r.id, r)
    return out
  }, [resourcesQ.data])

  const selectedResource = resourcesMap.get(form.resource_id) ?? null

  const rows = useMemo(() => {
    const order = REQUEST_STATUS_ORDER
    return [...(q.data ?? [])].sort((a, b) => {
      const byStatus = order[a.status] - order[b.status]
      if (byStatus !== 0) return byStatus
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [q.data])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter((req) => {
      if (projectFilter !== 'all' && req.project_id !== projectFilter) return false
      if (statusFilter !== 'all' && req.status !== statusFilter) return false
      if (!term) return true
      return (
        req.resource_name.toLowerCase().includes(term) ||
        req.project_name.toLowerCase().includes(term)
      )
    })
  }, [projectFilter, query, rows, statusFilter])

  const { page, setPage, totalPages, pageItems } = useClientPagination(filtered, {
    resetKey: `${projectFilter}|${statusFilter}|${query}`,
  })

  function setFormValue<K extends keyof RequestForm>(key: K, value: RequestForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const createM = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Sin sesión')
      if (!form.project_id) throw new Error('Elegí un proyecto')
      if (!form.resource_id) throw new Error('Elegí un ítem de inventario')
      const qty = Number(form.quantity)
      if (!qty || qty < 1) throw new Error('La cantidad debe ser mayor a 0')
      if (!form.withdrawal_date) throw new Error('Ingresá la fecha de retiro')
      if (selectedResource?.type === 'returnable' && !form.return_date) {
        throw new Error('La fecha de devolución es obligatoria para recursos retornables')
      }

      await createRequest(token, {
        project_id: form.project_id,
        resource_id: form.resource_id,
        quantity: qty,
        withdrawal_date: fromDatetimeLocalValue(form.withdrawal_date),
        return_date: form.return_date ? fromDatetimeLocalValue(form.return_date) : null,
        notes: form.notes.trim() || undefined,
      })
    },
    onSuccess: async () => {
      toast.success('Pedido de materiales creado correctamente.')
      setOpen(false)
      setForm(EMPTY_FORM)
      await qc.invalidateQueries({ queryKey: ['participant-my-stock-requests-global'] })
      await qc.invalidateQueries({ queryKey: ['stock-resources-all'] })
    },
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
            onValueChange={(v) => setStatusFilter(v as RequestStatus | 'all')}
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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-border/50 bg-card/95 backdrop-blur-lg shadow-premium">
            <DialogHeader className="pb-2 border-b border-border/40">
              <DialogTitle className="text-base font-extrabold tracking-tight">Solicitar material</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Proyecto</Label>
                <Select value={form.project_id} onValueChange={(v) => setFormValue('project_id', v)}>
                  <SelectTrigger className="w-full h-11 rounded-xl bg-background/50 border-border/60 focus:ring-primary/30">
                    <SelectValue placeholder="Elegí un proyecto" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {scope.projectOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ítem de inventario</Label>
                <Select value={form.resource_id} onValueChange={(v) => setFormValue('resource_id', v)}>
                  <SelectTrigger className="w-full h-11 rounded-xl bg-background/50 border-border/60 focus:ring-primary/30">
                    <SelectValue placeholder="Elegí un ítem" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {(resourcesQ.data ?? []).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({RESOURCE_TYPE_LABELS[r.type]} · {r.available_stock} disp.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setFormValue('quantity', e.target.value)}
                  className="h-11 rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Retiro</Label>
                  <Input
                    type="datetime-local"
                    value={form.withdrawal_date}
                    onChange={(e) => setFormValue('withdrawal_date', e.target.value)}
                    className="h-11 rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary/30"
                  />
                </div>
                {selectedResource?.type === 'returnable' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Devolución
                      <span className="ml-1 text-destructive font-bold">*</span>
                    </Label>
                    <Input
                      type="datetime-local"
                      value={form.return_date}
                      min={form.withdrawal_date}
                      disabled={!form.withdrawal_date}
                      onChange={(e) => setFormValue('return_date', e.target.value)}
                      className="h-11 rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary/30 disabled:opacity-50"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notas</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setFormValue('notes', e.target.value)}
                  placeholder="Ej: Para el evento del sábado..."
                  className="rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary/30 resize-none"
                />
              </div>
              {createM.error && (
                <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  {createM.error instanceof Error ? createM.error.message : 'No se pudo crear el pedido'}
                </p>
              )}
              <Button
                disabled={createM.isPending || scope.projectOptions.length === 0 || (resourcesQ.data ?? []).length === 0}
                className="w-full h-11 rounded-xl font-bold transition-transform active:scale-[0.98] shadow-sm cursor-pointer mt-1"
                onClick={() => createM.mutate()}
              >
                {createM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear pedido'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
