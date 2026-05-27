import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  RotateCcw,
  Truck,
  User,
  X,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { ActionButton } from '@/components/ActionButton'
import { StockRequestStatusBadge } from '@/components/StatusBadge'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  approveRequest,
  createRequest,
  deliverRequest,
  listProjectRequests,
  rejectRequest,
  returnRequest,
} from '@/features/stock/api/requestsApi'
import { listResources } from '@/features/stock/api/stockApi'
import type {
  RequestStatus,
  ResourceDTO,
  ResourceRequestDTO,
  ResourceType,
} from '@/features/stock/model/types'
import { useMyProjectMemberships } from '@/features/projects/hooks/useMyProjectMemberships'
import { ApiError } from '@/lib/api/apiClient'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// ── Constants ─────────────────────────────────────────────────

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  returnable: 'Retornable',
  consumable: 'Consumible',
}

// ── Helpers ────────────────────────────────────────────────────

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function requestBorderClass(status: RequestStatus): string {
  switch (status) {
    case 'PENDIENTE': return 'border-l-amber-400'
    case 'RESERVADO': return 'border-l-primary'
    case 'ENTREGADO': return 'border-l-emerald-500'
    case 'DEVUELTO':  return 'border-l-slate-400'
    case 'RECHAZADO': return 'border-l-destructive'
    default:          return 'border-l-border'
  }
}

function hasActionable(req: ResourceRequestDTO): boolean {
  if (req.status === 'PENDIENTE') return true
  if (req.status === 'RESERVADO') return true
  if (req.status === 'ENTREGADO' && req.resource_type === 'returnable') return true
  return false
}

async function fetchAllResources(token: string): Promise<ResourceDTO[]> {
  const { data } = await listResources(token, 1, 200)
  return data
}

// ── Form state ────────────────────────────────────────────────

type RequestFormState = {
  resource_id: string
  quantity: string
  withdrawal_date: string
  return_date: string
  notes: string
}

const EMPTY_FORM: RequestFormState = {
  resource_id: '',
  quantity: '1',
  withdrawal_date: '',
  return_date: '',
  notes: '',
}

// ── Skeleton ───────────────────────────────────────────────────

function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-[88px] rounded-xl bg-muted/40 animate-pulse"
          style={{ opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────

export default function ProyectoRecursosPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token, user, isRestoring } = useAuth()
  const qc = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  const [form, setForm] = useState<RequestFormState>(EMPTY_FORM)
  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

  const requestsQ = useQuery({
    queryKey: ['project-stock-requests', projectId, token, page],
    enabled: Boolean(token && projectId) && !isRestoring,
    queryFn: () => listProjectRequests(token!, projectId!, page, PAGE_SIZE),
  })

  const resourcesQ = useQuery({
    queryKey: ['stock-resources-all', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => fetchAllResources(token!),
  })

  const membershipsQ = useMyProjectMemberships(token, user?.id, isRestoring)
  const member = membershipsQ.data?.find((m) => m.id === projectId)
  const canManageRequests = user?.role === 'admin' || member?.role === 'coordinator'

  const resourcesMap = useMemo(() => {
    const m = new Map<string, ResourceDTO>()
    for (const r of resourcesQ.data ?? []) m.set(r.id, r)
    return m
  }, [resourcesQ.data])

  const selectedResource = resourcesMap.get(form.resource_id) ?? null

  const sorted = useMemo(() => {
    const STATUS_ORDER: Record<RequestStatus, number> = {
      PENDIENTE: 0,
      RESERVADO: 1,
      ENTREGADO: 2,
      DEVUELTO: 3,
      RECHAZADO: 4,
    }
    return [...(requestsQ.data?.data ?? [])].sort((a, b) => {
      const sd = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (sd !== 0) return sd
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [requestsQ.data])

  // Status summary counts
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<RequestStatus, number>> = {}
    for (const req of requestsQ.data?.data ?? []) {
      counts[req.status] = (counts[req.status] ?? 0) + 1
    }
    return counts
  }, [requestsQ.data])

  // ── Create mutation ────────────────────────────────────────

  const createM = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('Sin proyecto')
      if (!form.resource_id) throw new Error('Seleccioná un ítem de inventario')
      const qty = Number(form.quantity)
      if (!qty || qty < 1) throw new Error('La cantidad debe ser mayor a 0')
      if (!form.withdrawal_date) throw new Error('La fecha de retiro es requerida')
      if (selectedResource?.type === 'returnable' && !form.return_date)
        throw new Error('La fecha de devolución es requerida para recursos retornables')

      await createRequest(token!, {
        project_id: projectId,
        resource_id: form.resource_id,
        quantity: qty,
        withdrawal_date: fromDatetimeLocalValue(form.withdrawal_date),
        return_date: form.return_date ? fromDatetimeLocalValue(form.return_date) : null,
        notes: form.notes.trim() || undefined,
      })
    },
    onSuccess: async () => {
      setFeedback({ text: 'Pedido creado correctamente.', variant: 'success' })
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      await qc.invalidateQueries({ queryKey: ['project-stock-requests', projectId] })
    },
  })

  // ── Transition mutations ───────────────────────────────────

  function makeTransitionMutation(
    fn: (token: string, id: string) => Promise<void>,
    successText: string,
  ) {
    return useMutation({
      mutationFn: (id: string) => fn(token!, id),
      onSuccess: async () => {
        setFeedback({ text: successText, variant: 'success' })
        await qc.invalidateQueries({ queryKey: ['project-stock-requests', projectId] })
        await qc.invalidateQueries({ queryKey: ['admin-stock-resources'] })
      },
      onError: (e) =>
        setFeedback({ text: e instanceof Error ? e.message : 'Error', variant: 'error' }),
    })
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const approveM = makeTransitionMutation(approveRequest, 'Pedido aprobado y stock reservado.')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rejectM = makeTransitionMutation(rejectRequest, 'Pedido rechazado.')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const deliverM = makeTransitionMutation(deliverRequest, 'Pedido marcado como entregado.')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const returnM = makeTransitionMutation(returnRequest, 'Ítem marcado como devuelto.')

  const anyPending =
    approveM.isPending || rejectM.isPending || deliverM.isPending || returnM.isPending

  if (!projectId) return null

  const totalRequests = requestsQ.data?.total ?? 0

  return (
    <div className="space-y-4 sm:space-y-6">
      {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

      {/* ── Main card ── */}
      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-primary shrink-0" />
                Pedidos de stock
              </CardTitle>

              {/* Status chips */}
              {!requestsQ.isLoading && totalRequests > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {totalRequests} pedido{totalRequests !== 1 ? 's' : ''}
                  </span>
                  {!!statusCounts.PENDIENTE && (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {statusCounts.PENDIENTE} pendiente{statusCounts.PENDIENTE !== 1 ? 's' : ''}
                    </span>
                  )}
                  {!!statusCounts.RESERVADO && (
                    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {statusCounts.RESERVADO} reservado{statusCounts.RESERVADO !== 1 ? 's' : ''}
                    </span>
                  )}
                  {!!statusCounts.ENTREGADO && (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {statusCounts.ENTREGADO} entregado{statusCounts.ENTREGADO !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>

            <ActionButton
              intent="primary"
              size="sm"
              onClick={() => {
                setFeedback(null)
                setForm(EMPTY_FORM)
                setCreateOpen(true)
              }}
              disabled={resourcesQ.isLoading}
            >
              <Plus className="w-4 h-4" />
              Nuevo pedido
            </ActionButton>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-5 space-y-2">
          {/* Error */}
          {requestsQ.isError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {requestsQ.error instanceof ApiError
                ? requestsQ.error.message
                : 'Error al cargar los pedidos'}
            </div>
          )}

          {/* Skeleton */}
          {requestsQ.isLoading && <SkeletonRows count={4} />}

          {/* Request rows */}
          {!requestsQ.isLoading && sorted.map((req) => (
            <div
              key={req.id}
              className={cn(
                'rounded-xl border border-border/70 bg-card border-l-[3px] overflow-hidden',
                requestBorderClass(req.status),
              )}
            >
              {/* Main info */}
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2 pl-3.5 pr-3 pt-3 pb-2.5">
                {/* Item + meta */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold text-sm text-foreground leading-tight">
                    {req.resource_name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0">
                      {RESOURCE_TYPE_LABELS[req.resource_type]}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 shrink-0 opacity-60" />
                      {req.requester_name}
                    </span>
                  </div>
                </div>

                {/* Qty pill */}
                <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-6 min-w-[2.25rem] rounded-full bg-muted text-xs font-bold tabular-nums px-2 text-muted-foreground">
                  {req.quantity} u.
                </span>

                {/* Status */}
                <div className="shrink-0 mt-0.5">
                  <StockRequestStatusBadge status={req.status} />
                </div>
              </div>

              {/* Dates */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 pl-3.5 pb-2.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3 h-3 shrink-0 opacity-60" />
                  Retiro:{' '}
                  <span className="font-medium text-foreground/80">
                    {formatDateShort(req.withdrawal_date)}
                  </span>
                </span>
                {req.return_date && (
                  <span className="flex items-center gap-1.5">
                    <RotateCcw className="w-3 h-3 shrink-0 opacity-60" />
                    Dev.:{' '}
                    <span className="font-medium text-foreground/80">
                      {formatDateShort(req.return_date)}
                    </span>
                  </span>
                )}
              </div>

              {/* Actions row — only when there's something to do */}
              {canManageRequests && hasActionable(req) && (
                <div className="border-t border-border/60 bg-muted/20 px-3 py-2 flex justify-end gap-2">
                  <RequestActions
                    req={req}
                    onApprove={() => approveM.mutate(req.id)}
                    onReject={() => rejectM.mutate(req.id)}
                    onDeliver={() => deliverM.mutate(req.id)}
                    onReturn={() => returnM.mutate(req.id)}
                    isPending={anyPending}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Empty */}
          {!requestsQ.isLoading && sorted.length === 0 && !requestsQ.isError && (
            <div className="flex flex-col items-center gap-2.5 py-10 text-center border border-dashed rounded-xl">
              <Package className="w-9 h-9 text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">
                Todavía no hay pedidos de stock para este proyecto.
              </p>
            </div>
          )}

          <PaginationControls
            page={page}
            totalPages={requestsQ.data?.total_pages ?? 1}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {/* ── Dialog: Nuevo pedido ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Package className="w-4 h-4 text-primary" />
              </div>
              Nuevo pedido de stock
            </DialogTitle>
          </DialogHeader>
          <CreateRequestForm
            form={form}
            onChange={setForm}
            resources={resourcesQ.data ?? []}
            selectedResource={selectedResource}
            onSubmit={() => {
              setFeedback(null)
              createM.mutate()
            }}
            isPending={createM.isPending}
            error={createM.error instanceof Error ? createM.error.message : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── RequestActions ────────────────────────────────────────────

type RequestActionsProps = {
  req: ResourceRequestDTO
  onApprove: () => void
  onReject: () => void
  onDeliver: () => void
  onReturn: () => void
  isPending: boolean
}

function RequestActions({
  req,
  onApprove,
  onReject,
  onDeliver,
  onReturn,
  isPending,
}: RequestActionsProps) {
  if (req.status === 'PENDIENTE') {
    return (
      <>
        <ActionButton intent="approve" size="sm" disabled={isPending} onClick={onApprove}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Aprobar
        </ActionButton>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <ActionButton intent="reject" size="sm" disabled={isPending}>
              <X className="w-3.5 h-3.5" />
              Rechazar
            </ActionButton>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Rechazar pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                El pedido de <strong>{req.resource_name}</strong> ({req.quantity} u.) solicitado
                por {req.requester_name} será rechazado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={onReject}
              >
                Rechazar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  if (req.status === 'RESERVADO') {
    return (
      <ActionButton intent="deliver" size="sm" disabled={isPending} onClick={onDeliver}>
        <Truck className="w-3.5 h-3.5" />
        Entregar
      </ActionButton>
    )
  }

  if (req.status === 'ENTREGADO' && req.resource_type === 'returnable') {
    return (
      <ActionButton intent="return" size="sm" disabled={isPending} onClick={onReturn}>
        <RotateCcw className="w-3.5 h-3.5" />
        Devolver
      </ActionButton>
    )
  }

  return null
}

// ── CreateRequestForm ─────────────────────────────────────────

type CreateRequestFormProps = {
  form: RequestFormState
  onChange: (f: RequestFormState) => void
  resources: ResourceDTO[]
  selectedResource: ResourceDTO | null
  onSubmit: () => void
  isPending: boolean
  error?: string
}

function CreateRequestForm({
  form,
  onChange,
  resources,
  selectedResource,
  onSubmit,
  isPending,
  error,
}: CreateRequestFormProps) {
  function set<K extends keyof RequestFormState>(key: K, value: RequestFormState[K]) {
    onChange({ ...form, [key]: value })
  }

  const needsReturn = selectedResource?.type === 'returnable'

  return (
    <div className="space-y-4 pt-1">
      <div className="space-y-1.5">
        <Label
          htmlFor="req-resource"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Ítem de inventario
        </Label>
        <Select value={form.resource_id} onValueChange={(v) => set('resource_id', v)}>
          <SelectTrigger id="req-resource" className="h-11">
            <SelectValue placeholder="Seleccioná un ítem…" />
          </SelectTrigger>
          <SelectContent>
            {resources.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 text-muted-foreground text-xs">
                  ({RESOURCE_TYPE_LABELS[r.type]} · {r.available_stock} disp.)
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="req-quantity"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Cantidad
        </Label>
        <Input
          id="req-quantity"
          type="number"
          inputMode="numeric"
          min={1}
          value={form.quantity}
          onChange={(e) => set('quantity', e.target.value)}
          className="h-11"
          placeholder="1"
        />
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="req-withdrawal"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Fecha de retiro
        </Label>
        <Input
          id="req-withdrawal"
          type="datetime-local"
          value={form.withdrawal_date}
          onChange={(e) => set('withdrawal_date', e.target.value)}
          className="h-11"
        />
      </div>

      {needsReturn && (
        <div className="space-y-1.5">
          <Label
            htmlFor="req-return"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Fecha de devolución
            <span className="ml-1 text-destructive">*</span>
          </Label>
          <Input
            id="req-return"
            type="datetime-local"
            value={form.return_date}
            onChange={(e) => set('return_date', e.target.value)}
            className="h-11"
            disabled={!form.withdrawal_date}
            min={form.withdrawal_date}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label
          htmlFor="req-notes"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Notas{' '}
          <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
        </Label>
        <Textarea
          id="req-notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          placeholder="Ej: Para el evento del sábado"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      <Button disabled={isPending} onClick={onSubmit} className="w-full h-11">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear pedido'}
      </Button>
    </div>
  )
}
