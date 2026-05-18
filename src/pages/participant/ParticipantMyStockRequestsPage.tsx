import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, Package, Plus, Search } from 'lucide-react'
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
  ResourceRequestDTO,
  ResourceType,
} from '@/features/stock/model/types'
import { useMyProjectMemberships } from '@/features/projects/hooks/useMyProjectMemberships'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

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

async function fetchAllMine(token: string): Promise<ResourceRequestDTO[]> {
  const out: ResourceRequestDTO[] = []
  let page = 1
  while (page <= 50) {
    const r = await listMyRequests(token, page, 50)
    out.push(...r.data)
    if (page >= r.total_pages) break
    page++
  }
  return out
}

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
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project') ?? 'all')
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<RequestForm>(EMPTY_FORM)
  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  const q = useQuery({
    queryKey: ['participant-my-stock-requests-global', token],
    queryFn: () => fetchAllMine(token!),
    enabled: Boolean(token) && !isRestoring,
  })

  const resourcesQ = useQuery({
    queryKey: ['stock-resources-all', token],
    queryFn: () => fetchAllResources(token!),
    enabled: Boolean(token) && !isRestoring,
  })

  const membershipsQ = useMyProjectMemberships(token, user?.id, isRestoring)
  const projectOptions = membershipsQ.data ?? []

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
    const order: Record<RequestStatus, number> = {
      PENDIENTE: 0,
      RESERVADO: 1,
      ENTREGADO: 2,
      DEVUELTO: 3,
      RECHAZADO: 4,
    }
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
    onError: (e) =>
      setFeedback({
        text: e instanceof Error ? e.message : 'No se pudo crear el pedido',
        variant: 'error',
      }),
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pedidos globales</CardTitle>
            <CardDescription>
              Cada pedido pertenece a un proyecto. Filtrá por proyecto, estado o ítem sin cambiar de pantalla.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar ítem o proyecto"
                  className="pl-9"
                />
              </div>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full">
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

            {q.isPending && (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!q.isPending && !q.isError && filtered.length > 0 && (
              <div className="rounded-xl border overflow-hidden">
                <div className="divide-y">
                  {filtered.map((req) => (
                    <Link
                      key={req.id}
                      to={`/app/stock/requests/${req.id}`}
                      className="block px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-sm truncate">{req.resource_name}</p>
                            <Badge variant="outline">{req.project_name}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {req.quantity} u. · {formatShort(req.created_at)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {RESOURCE_TYPE_LABELS[req.resource_type]}
                          </p>
                        </div>
                        <StockRequestStatusBadge status={req.status} className="shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {!q.isPending && !q.isError && filtered.length === 0 && (
              <div className="rounded-xl border border-dashed p-8">
                <p className="text-sm text-muted-foreground text-center">
                  No hay pedidos para los filtros seleccionados.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pedir stock</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Proyecto</Label>
                <Select value={form.project_id} onValueChange={(v) => setFormValue('project_id', v)}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Elegí un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ítem de inventario</Label>
                <Select value={form.resource_id} onValueChange={(v) => setFormValue('resource_id', v)}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Elegí un ítem" />
                  </SelectTrigger>
                  <SelectContent>
                    {(resourcesQ.data ?? []).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({RESOURCE_TYPE_LABELS[r.type]} · {r.available_stock} disp.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setFormValue('quantity', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Retiro</Label>
                  <Input
                    type="datetime-local"
                    value={form.withdrawal_date}
                    onChange={(e) => setFormValue('withdrawal_date', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Devolución
                    {selectedResource?.type === 'returnable' ? (
                      <span className="ml-1 text-destructive text-xs">*</span>
                    ) : (
                      <span className="ml-1 text-muted-foreground text-xs">(opcional)</span>
                    )}
                  </Label>
                  <Input
                    type="datetime-local"
                    value={form.return_date}
                    min={form.withdrawal_date}
                    disabled={!form.withdrawal_date}
                    onChange={(e) => setFormValue('return_date', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notas</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setFormValue('notes', e.target.value)}
                  placeholder="Ej: Para el evento del sábado"
                />
              </div>
              <Button
                disabled={createM.isPending || projectOptions.length === 0 || (resourcesQ.data ?? []).length === 0}
                className="w-full"
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
