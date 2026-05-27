import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { Loader2, MoreVertical, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { PageHeader } from '@/components/PageHeader'
import { StockRequestStatusBadge } from '@/components/StatusBadge'
import { ActionButton, ActionIconButton } from '@/components/ActionButton'
import { PaginationControls } from '@/components/admin/PaginationControls'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useAuth } from '@/hooks/useAuth'

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  returnable: 'Retornable',
  consumable: 'Consumible',
}

type StockSection = 'inventario' | 'pedidos'

const PAGE_SIZE = 20

type FormState = {
  name: string
  type: ResourceType
  total_stock: string
}

const EMPTY_FORM: FormState = { name: '', type: 'returnable', total_stock: '' }



function formatDate(iso: string | null | undefined) {
  if (!iso) return 'Sin fecha'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

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
  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

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
    const order: Record<RequestStatus, number> = {
      PENDIENTE: 0,
      RESERVADO: 1,
      ENTREGADO: 2,
      DEVUELTO: 3,
      RECHAZADO: 4,
    }
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
        title="Stock"
        subtitle="Inventario y pedidos de stock en un solo módulo."
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
          ) : null
        }
      />

      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4">
        {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric title="Ítems" value={String(resourcesQ.data?.total ?? 0)} />
          <Metric title="Sin disponibilidad" value={String(outOfStock)} tone={outOfStock > 0 ? 'warn' : 'default'} />
          <Metric title="Pedidos pendientes" value={String(pendingCount)} tone={pendingCount > 0 ? 'warn' : 'default'} />
        </div>

        <Tabs value={activeSection} onValueChange={(v) => setSection(v as StockSection)}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
            <TabsTrigger value="inventario">Inventario</TabsTrigger>
            <TabsTrigger value="pedidos">
              Pedidos
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo ítem de inventario</DialogTitle>
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
            error={createM.error ? (createM.error instanceof Error ? createM.error.message : 'Error al crear') : undefined}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editTarget)} onOpenChange={(v: boolean) => { if (!v) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar ítem de inventario</DialogTitle>
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
            error={editM.error ? (editM.error instanceof Error ? editM.error.message : 'Error al actualizar') : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Inventario</CardTitle>
        <CardDescription>Ítems disponibles y disponibilidad actual.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar ítem"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="h-11 pl-9"
          />
        </div>

        {resourcesQ.isError && (
          <p className="text-sm text-destructive">
            {resourcesQ.error instanceof ApiError ? resourcesQ.error.message : 'Error al cargar inventario'}
          </p>
        )}

        {resourcesQ.isLoading && <div className="h-24 bg-muted/50 rounded-lg animate-pulse" />}

        {!resourcesQ.isLoading && filteredResources.length > 0 && (
          <div className="rounded-xl border overflow-hidden">
            <div className="divide-y">
              {filteredResources.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm">{r.name}</p>
                      <Badge variant={r.type === 'returnable' ? 'secondary' : 'outline'}>
                        {RESOURCE_TYPE_LABELS[r.type]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {r.available_stock} disponible / {r.total_stock} total
                    </p>
                  </div>
                  <ResourceActions resource={r} onEdit={onEdit} onDelete={onDelete} />
                </div>
              ))}
            </div>
          </div>
        )}

        {!resourcesQ.isLoading && filteredResources.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No hay ítems para la búsqueda seleccionada.</p>
          </div>
        )}

        <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  )
}

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
          <AlertDialogTitle>¿Eliminar ítem de inventario?</AlertDialogTitle>
          <AlertDialogDescription>
            No se puede deshacer. Si el ítem tiene pedidos activos, el servidor puede rechazar la operación.
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pedidos</CardTitle>
        <CardDescription>Pedidos globales de stock. Abrí una fila para aprobar, entregar o devolver.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[1fr_190px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar ítem, proyecto o solicitante"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(v) => onStatus(v as RequestStatus | 'all')}>
            <SelectTrigger className="w-full">
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

        {requestsQ.isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {requestsQ.isError && (
          <p className="text-sm text-destructive">
            {requestsQ.error instanceof ApiError ? requestsQ.error.message : 'No se pudieron cargar los pedidos'}
          </p>
        )}

        {!requestsQ.isLoading && filteredRequests.length > 0 && (
          <div className="rounded-xl border overflow-hidden">
            <div className="divide-y">
              {filteredRequests.map((req) => (
                <Link
                  key={req.id}
                  to={`/app/admin/stock/requests/${req.id}`}
                  className="block px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm">{req.resource_name}</p>
                        <Badge variant="outline">{req.project_name}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {req.quantity} u. · {RESOURCE_TYPE_LABELS[req.resource_type]} · {req.requester_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Retiro: {formatDate(req.withdrawal_date)}
                        {req.return_date ? ` · Devolución: ${formatDate(req.return_date)}` : ''}
                      </p>
                    </div>
                    <StockRequestStatusBadge status={req.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!requestsQ.isLoading && filteredRequests.length === 0 && !requestsQ.isError && (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No hay pedidos para los filtros seleccionados.</p>
          </div>
        )}

        <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  )
}

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
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="resource-name">Nombre</Label>
        <Input
          id="resource-name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="h-11"
          placeholder="Ej: Proyector Epson"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="resource-type">Tipo</Label>
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
        <Label htmlFor="resource-stock">Stock total</Label>
        <Input
          id="resource-stock"
          type="number"
          min={1}
          value={form.total_stock}
          onChange={(e) => set('total_stock', e.target.value)}
          className="h-11"
          placeholder="0"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}
      <Button disabled={isPending} onClick={onSubmit} className="w-full">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
      </Button>
    </div>
  )
}

function Metric({ title, value, tone = 'default' }: { title: string; value: string; tone?: 'default' | 'warn' }) {
  return (
    <Card className={tone === 'warn' ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/10' : ''}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}
