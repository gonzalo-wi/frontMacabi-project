import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, Package, Plus, Search, Calendar, ClipboardList } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { PageHeader } from '@/components/PageHeader'
import { StockRequestStatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
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
import { listResources } from '@/features/stock/api/stockApi'
import type {
  RequestStatus,
  ResourceDTO,
  ResourceType,
} from '@/features/stock/model/types'
import { ProjectStockPanel } from '@/features/stock/components/ProjectStockPanel'
import { useMyProjectMemberships } from '@/features/projects/hooks/useMyProjectMemberships'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'
import { useSearchParamState } from '@/hooks/useSearchParamState'
import { cn } from '@/lib/utils'
import { PaginationControls } from '@/components/admin/PaginationControls'

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



const PAGE_SIZE = 20

async function fetchAllResources(token: string): Promise<ResourceDTO[]> {
  const out: ResourceDTO[] = []
  let page = 1
  while (page <= 50) {
    const r = await listResources(token, page, 50)
    out.push(...r.data)
    if (page >= r.total_pages) break
    page++
  }
  return out
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

export default function ParticipantMyStockRequestsPage() {
  const { token, user, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project') ?? 'all')
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<RequestForm>(EMPTY_FORM)
  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

  const q = useQuery({
    queryKey: ['participant-my-stock-requests-global', token, page],
    queryFn: () => listMyRequests(token!, page, PAGE_SIZE),
    enabled: Boolean(token) && !isRestoring,
  })

  const resourcesQ = useQuery({
    queryKey: ['stock-resources-all', token],
    queryFn: () => fetchAllResources(token!),
    enabled: Boolean(token) && !isRestoring,
  })

  const membershipsQ = useMyProjectMemberships(token, user?.id, isRestoring)
  const projectOptions = membershipsQ.data ?? []
  const coordinated = projectOptions.filter((p) => p.role === 'coordinator')
  const hasCoordinated = coordinated.length > 0
  const [tab, setTab] = useSearchParamState('tab', 'mis')
  const [proj, setProj] = useSearchParamState('proj', '')
  const activeTab = hasCoordinated ? tab : 'mis'
  const selectedProj = proj || coordinated[0]?.id || ''

  useEffect(() => {
    setProjectFilter(searchParams.get('project') ?? 'all')
  }, [searchParams])

  useEffect(() => {
    setPage(1)
  }, [query, statusFilter, projectFilter])

  const resourcesMap = useMemo(() => {
    const out = new Map<string, ResourceDTO>()
    for (const r of resourcesQ.data ?? []) out.set(r.id, r)
    return out
  }, [resourcesQ.data])

  const selectedResource = resourcesMap.get(form.resource_id) ?? null

  const rows = useMemo(() => {
    const order: Record<RequestStatus, number> = {
      PENDIENTE: 0,
      RESERVADO: 1,
      ENTREGADO: 2,
      DEVUELTO: 3,
      RECHAZADO: 4,
    }
    return [...(q.data?.data ?? [])].sort((a, b) => {
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
      setFeedback({ text: 'Pedido de stock creado correctamente.', variant: 'success' })
      setOpen(false)
      setForm(EMPTY_FORM)
      await qc.invalidateQueries({ queryKey: ['participant-my-stock-requests-global'] })
      await qc.invalidateQueries({ queryKey: ['stock-resources-all'] })
    },
  })

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={Package}
        title="Stock"
        subtitle="Tus pedidos de stock en todos los proyectos, con filtros y proyecto visible."
        action={
          <Button
            size="sm"
            onClick={() => {
              setFeedback(null)
              setOpen(true)
            }}
            disabled={resourcesQ.isLoading || membershipsQ.isLoading}
          >
            <Plus className="w-4 h-4 mr-1" />
            Pedir stock
          </Button>
        }
      />

      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
        {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

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
        {membershipsQ.isError && (
          <p className="text-sm text-destructive">
            {membershipsQ.error instanceof ApiError
              ? membershipsQ.error.message
              : 'No se pudieron cargar tus proyectos'}
          </p>
        )}

        {/* ── Solapas (solo si coordina algún proyecto) ── */}
        {hasCoordinated && (
          <div className="inline-flex rounded-xl border border-border/70 bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setTab('mis')}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors',
                activeTab === 'mis' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Mis pedidos
            </button>
            <button
              type="button"
              onClick={() => setTab('proyecto')}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors',
                activeTab === 'proyecto' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Del proyecto
            </button>
          </div>
        )}

        {/* ── Solapa "Del proyecto": selector + pedidos del proyecto ── */}
        {activeTab === 'proyecto' && hasCoordinated && token && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Proyecto</span>
              <Select value={selectedProj} onValueChange={setProj}>
                <SelectTrigger className="h-9 w-[240px]">
                  <SelectValue placeholder="Elegí un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {coordinated.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProj && <ProjectStockPanel token={token} projectId={selectedProj} />}
          </div>
        )}

        {activeTab === 'mis' && (
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
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full bg-background/50 focus:ring-primary/30">
                  <SelectValue placeholder="Proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proyectos</SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RequestStatus | 'all')}>
                <SelectTrigger className="w-full bg-background/50 focus:ring-primary/30">
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

            {q.isPending && (
              <div className="flex justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
              </div>
            )}

            {!q.isPending && !q.isError && filtered.length > 0 && (
              <div className="space-y-3.5">
                {filtered.map((req) => {
                  const borderCls =
                    req.status === 'ENTREGADO'
                      ? 'border-l-emerald-500/80 dark:border-l-emerald-500'
                      : req.status === 'RECHAZADO'
                        ? 'border-l-red-500/80 dark:border-l-red-500'
                        : req.status === 'PENDIENTE'
                          ? 'border-l-amber-500/80 dark:border-l-amber-500'
                          : req.status === 'RESERVADO'
                            ? 'border-l-sky-500/80 dark:border-l-sky-500'
                            : 'border-l-muted-foreground'

                  return (
                    <Link
                      key={req.id}
                      to={`/app/stock/requests/${req.id}`}
                      className={cn(
                        "flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-xs p-4 sm:p-5 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md hover:border-primary/20 border-l-[5px] block select-none",
                        borderCls
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-extrabold text-sm text-foreground tracking-tight leading-snug truncate">
                              {req.resource_name}
                            </h4>
                            <Badge variant="secondary" className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-secondary/60 border-border/40 text-secondary-foreground">
                              {req.project_name}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-background/50 border-border/50 text-muted-foreground">
                              {RESOURCE_TYPE_LABELS[req.resource_type]}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <ClipboardList className="w-3.5 h-3.5 text-muted-foreground/75" />
                              Cantidad: <span className="font-bold text-foreground">{req.quantity} u.</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground/75" />
                              Pedido el: <span className="font-semibold text-foreground">{formatShort(req.created_at)}</span>
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <StockRequestStatusBadge status={req.status} className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}

            {!q.isPending && !q.isError && filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/80 p-10 text-center">
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  No hay pedidos para los filtros seleccionados.
                </p>
              </div>
            )}

            <PaginationControls
              page={page}
              totalPages={q.data?.total_pages ?? 1}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-border/50 bg-card/95 backdrop-blur-lg shadow-premium">
            <DialogHeader className="pb-2 border-b border-border/40">
              <DialogTitle className="text-base font-extrabold tracking-tight">Pedir stock</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Proyecto</Label>
                <Select value={form.project_id} onValueChange={(v) => setFormValue('project_id', v)}>
                  <SelectTrigger className="w-full h-11 rounded-xl bg-background/50 border-border/60 focus:ring-primary/30">
                    <SelectValue placeholder="Elegí un proyecto" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {projectOptions.map((p) => (
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
                disabled={createM.isPending || projectOptions.length === 0 || (resourcesQ.data ?? []).length === 0}
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
