import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArchiveX,
  Clock,
  Loader2,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { useFeedback } from '@/hooks/useFeedback'
import { PageHeader } from '@/components/PageHeader'
import { StockRequestStatusBadge } from '@/features/stock/components/StockRequestStatusBadge'
import { ActionButton, ActionIconButton } from '@/components/ActionButton'
import { PaginationControls } from '@/components/data/PaginationControls'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { listRequests } from '@/features/stock/api/requestsApi'
import {
  createResource,
  deleteResource,
  listResources,
  updateResource,
} from '@/features/stock/api/stockApi'
import type {
  RequestStatus,
  ResourceDTO,
  ResourceRequestDTO,
  ResourceType,
} from '@/features/stock/model/types'
import { ApiError } from '@/lib/api/apiClient'
import { cn } from '@/lib/utils'
import { REQUEST_STATUS_ORDER, requestStatusBorderClass as requestBorderClass } from '@/lib/status'
import { useAuth } from '@/hooks/useAuth'

// ── Constants ─────────────────────────────────────────────────

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  returnable: 'Retornable',
  consumable: 'Consumible',
}

type StockSection = 'inventario' | 'pedidos'

const PAGE_SIZE = 10

type FormState = {
  name: string
  type: ResourceType
  total_stock: string
}

const EMPTY_FORM: FormState = { name: '', type: 'returnable', total_stock: '' }

// ── Helpers ────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return 'Sin fecha'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function stockBorderClass(available: number, total: number): string {
  if (available === 0) return 'border-l-destructive'
  const pct = total > 0 ? available / total : 1
  if (pct <= 0.25) return 'border-l-amber-400'
  return 'border-l-emerald-400'
}

// ── Skeleton ───────────────────────────────────────────────────

function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-[72px] rounded-xl bg-muted/40 animate-pulse"
          style={{ opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  )
}

// ── MetricCard ─────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  iconClass,
  title,
  value,
  valueClass,
}: {
  icon: LucideIcon
  iconClass: string
  title: string
  value: string
  valueClass?: string
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', iconClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">{title}</p>
          <p className={cn('mt-0.5 text-2xl font-bold tabular-nums', valueClass)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default function AdminStockPage() {
  const { token, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSection: StockSection = searchParams.get('tab') === 'pedidos' ? 'pedidos' : 'inventario'

  const [resourceSearch, setResourceSearch] = useState('')
  const [requestSearch, setRequestSearch] = useState('')
  const [requestStatus, setRequestStatus] = useState<RequestStatus | 'all'>('all')
  const [resourcePage, setResourcePage] = useState(1)
  const [requestPage, setRequestPage] = useState(1)
  const { feedback, setFeedback } = useFeedback()

  useEffect(() => { setResourcePage(1) }, [resourceSearch])
  useEffect(() => { setRequestPage(1) }, [requestSearch, requestStatus])

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM)
  const [editTarget, setEditTarget] = useState<ResourceDTO | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)

  const resourcesQ = useQuery({
    queryKey: ['admin-stock-resources', token, resourcePage],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => listResources(token!, resourcePage, PAGE_SIZE),
  })

  const requestsQ = useQuery({
    queryKey: ['admin-stock-requests-global', token, requestPage],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => listRequests(token!, requestPage, PAGE_SIZE),
  })

  const filteredResources = useMemo(() => {
    const q = resourceSearch.trim().toLowerCase()
    const rows = resourcesQ.data?.data ?? []
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q))
  }, [resourcesQ.data, resourceSearch])

  const sortedRequests = useMemo(() => {
    const order = REQUEST_STATUS_ORDER
    return [...(requestsQ.data?.data ?? [])].sort((a, b) => {
      const byStatus = order[a.status] - order[b.status]
      if (byStatus !== 0) return byStatus
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [requestsQ.data])

  const filteredRequests = useMemo(() => {
    const term = requestSearch.trim().toLowerCase()
    return sortedRequests.filter((req) => {
      if (requestStatus !== 'all' && req.status !== requestStatus) return false
      if (!term) return true
      return (
        req.resource_name.toLowerCase().includes(term) ||
        req.project_name.toLowerCase().includes(term) ||
        req.requester_name.toLowerCase().includes(term)
      )
    })
  }, [requestSearch, requestStatus, sortedRequests])

  const pendingCount = (requestsQ.data?.data ?? []).filter((req) => req.status === 'PENDIENTE').length
  const outOfStock = (resourcesQ.data?.data ?? []).filter((r) => r.available_stock === 0).length
  const totalItems = resourcesQ.data?.total ?? 0

  const createM = useMutation({
    mutationFn: async () => {
      const stock = Number(createForm.total_stock)
      if (!createForm.name.trim()) throw new Error('El nombre es requerido')
      if (isNaN(stock) || stock <= 0) throw new Error('El stock debe ser un número mayor a 0')
      await createResource(token!, {
        name: createForm.name.trim(),
        type: createForm.type,
        total_stock: stock,
      })
    },
    onSuccess: async () => {
      setFeedback({ text: 'Ítem creado.', variant: 'success' })
      setCreateOpen(false)
      setCreateForm(EMPTY_FORM)
      await qc.invalidateQueries({ queryKey: ['admin-stock-resources'] })
    },
  })

  const editM = useMutation({
    mutationFn: async () => {
      if (!editTarget) return
      const stock = Number(editForm.total_stock)
      if (!editForm.name.trim()) throw new Error('El nombre es requerido')
      if (isNaN(stock) || stock <= 0) throw new Error('El stock debe ser un número mayor a 0')
      await updateResource(token!, editTarget.id, {
        name: editForm.name.trim(),
        type: editForm.type,
        total_stock: stock,
      })
    },
    onSuccess: async () => {
      setFeedback({ text: 'Ítem actualizado.', variant: 'success' })
      setEditTarget(null)
      await qc.invalidateQueries({ queryKey: ['admin-stock-resources'] })
    },
  })

  const delM = useMutation({
    mutationFn: async (id: string) => deleteResource(token!, id),
    onSuccess: async () => {
      setFeedback({ text: 'Ítem eliminado.', variant: 'success' })
      await qc.invalidateQueries({ queryKey: ['admin-stock-resources'] })
    },
    onError: (e) =>
      setFeedback({
        text: e instanceof Error ? e.message : 'Error al eliminar',
        variant: 'error',
      }),
  })

  function setSection(next: StockSection) {
    setSearchParams(next === 'pedidos' ? { tab: 'pedidos' } : {})
  }

  function openEdit(resource: ResourceDTO) {
    setEditForm({
      name: resource.name,
      type: resource.type,
      total_stock: String(resource.total_stock),
    })
    setEditTarget(resource)
  }

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={Package}
        title="Materiales"
        subtitle="Inventario y pedidos de materiales en un solo módulo."
        action={
          activeSection === 'inventario' ? (
            <ActionButton
              intent="primary"
              onClick={() => {
                setFeedback(null)
                setCreateForm(EMPTY_FORM)
                setCreateOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Nuevo ítem
            </ActionButton>
          ) : pendingCount > 0 ? (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              <AlertCircle className="w-3.5 h-3.5" />
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </div>
          ) : null
        }
      />

      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
        {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

        {/* ── Metrics ── */}
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            icon={Package}
            iconClass="bg-primary/10 text-primary"
            title="Ítems en inventario"
            value={String(totalItems)}
          />
          <MetricCard
            icon={ArchiveX}
            iconClass={outOfStock > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}
            title="Sin disponibilidad"
            value={String(outOfStock)}
            valueClass={outOfStock > 0 ? 'text-destructive' : undefined}
          />
          <MetricCard
            icon={Clock}
            iconClass={pendingCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground'}
            title="Pedidos pendientes"
            value={String(pendingCount)}
            valueClass={pendingCount > 0 ? 'text-amber-600' : undefined}
          />
        </div>

        {/* ── Tabs ── */}
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1">
          <div className="flex min-w-max border-b border-border">
            {(['inventario', 'pedidos'] as StockSection[]).map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setSection(section)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                  activeSection === section
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {section === 'inventario' ? 'Inventario' : 'Pedidos'}
                {section === 'pedidos' && pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold px-1">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeSection === 'inventario' ? (
          <InventorySection
            resourcesQ={resourcesQ}
            filteredResources={filteredResources}
            search={resourceSearch}
            onSearch={setResourceSearch}
            onEdit={openEdit}
            onDelete={(id) => delM.mutate(id)}
            page={resourcePage}
            totalPages={resourcesQ.data?.total_pages ?? 1}
            onPageChange={setResourcePage}
          />
        ) : (
          <RequestsSection
            requestsQ={requestsQ}
            filteredRequests={filteredRequests}
            search={requestSearch}
            onSearch={setRequestSearch}
            status={requestStatus}
            onStatus={setRequestStatus}
            page={requestPage}
            totalPages={requestsQ.data?.total_pages ?? 1}
            onPageChange={setRequestPage}
          />
        )}
      </div>

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Package className="w-4 h-4 text-primary" />
              </div>
              Nuevo ítem de inventario
            </DialogTitle>
          </DialogHeader>
          <ResourceForm
            form={createForm}
            onChange={setCreateForm}
            onSubmit={() => {
              setFeedback(null)
              createM.mutate()
            }}
            isPending={createM.isPending}
            submitLabel="Crear ítem"
            error={createM.error instanceof Error ? createM.error.message : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(v: boolean) => { if (!v) setEditTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Pencil className="w-4 h-4 text-primary" />
              </div>
              Editar ítem de inventario
            </DialogTitle>
          </DialogHeader>
          <ResourceForm
            form={editForm}
            onChange={setEditForm}
            onSubmit={() => {
              setFeedback(null)
              editM.mutate()
            }}
            isPending={editM.isPending}
            submitLabel="Guardar cambios"
            error={editM.error instanceof Error ? editM.error.message : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── InventorySection ───────────────────────────────────────────

function InventorySection({
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
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {resourcesQ.error instanceof ApiError
              ? resourcesQ.error.message
              : 'Error al cargar inventario'}
          </div>
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
                    stockBorderClass(r.available_stock, r.total_stock),
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

// ── ResourceActions ────────────────────────────────────────────

function ResourceActions({
  resource,
  onEdit,
  onDelete,
}: {
  resource: ResourceDTO
  onEdit: (resource: ResourceDTO) => void
  onDelete: (id: string) => void
}) {
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ActionIconButton intent="secondary" label={`Acciones: ${resource.name}`}>
            <MoreVertical className="w-4 h-4" />
          </ActionIconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[11rem]">
          <DropdownMenuItem onClick={() => onEdit(resource)}>
            <Pencil className="w-4 h-4" />
            Editar
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(event) => event.preventDefault()}
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar "{resource.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            No se puede deshacer. Si el ítem tiene pedidos activos, el servidor puede rechazar la
            operación.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground"
            onClick={() => onDelete(resource.id)}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── RequestsSection ────────────────────────────────────────────

function RequestsSection({
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
                  requestBorderClass(req.status),
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
                    Retiro: {formatDate(req.withdrawal_date)}
                    {req.return_date ? ` · Dev.: ${formatDate(req.return_date)}` : ''}
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

// ── ResourceForm ───────────────────────────────────────────────

function ResourceForm({
  form,
  onChange,
  onSubmit,
  isPending,
  submitLabel,
  error,
}: {
  form: FormState
  onChange: (f: FormState) => void
  onSubmit: () => void
  isPending: boolean
  submitLabel: string
  error?: string
}) {
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    onChange({ ...form, [key]: value })
  }

  return (
    <div className="space-y-4 pt-1">
      <div className="space-y-1.5">
        <Label
          htmlFor="resource-name"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Nombre
        </Label>
        <Input
          id="resource-name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="h-11"
          placeholder="Ej: Proyector Epson"
        />
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="resource-type"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Tipo
        </Label>
        <Select value={form.type} onValueChange={(v) => set('type', v as ResourceType)}>
          <SelectTrigger id="resource-type" className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="returnable">Retornable</SelectItem>
            <SelectItem value="consumable">Consumible</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="resource-stock"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Stock total (unidades)
        </Label>
        <Input
          id="resource-stock"
          type="number"
          inputMode="numeric"
          min={1}
          value={form.total_stock}
          onChange={(e) => set('total_stock', e.target.value)}
          className="h-11"
          placeholder="Ej: 5"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      <Button disabled={isPending} onClick={onSubmit} className="w-full h-11">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
      </Button>
    </div>
  )
}
