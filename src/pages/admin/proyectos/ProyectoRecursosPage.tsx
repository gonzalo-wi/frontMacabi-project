import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  RotateCcw,
  Truck,
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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { useAuth } from '@/hooks/useAuth'

// ── Constants ────────────────────────────────────────────────

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  returnable: 'Retornable',
  consumable: 'Consumible',
}

// ── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function fetchAllResources(token: string): Promise<ResourceDTO[]> {
  const { data } = await listResources(token, 1, 200)
  return data
}

// ── Form state ───────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────

export default function ProyectoRecursosPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token, user, isRestoring } = useAuth()
  const qc = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
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

  // Map resource_id → ResourceDTO for quick lookup
  const resourcesMap = useMemo(() => {
    const m = new Map<string, ResourceDTO>()
    for (const r of resourcesQ.data ?? []) m.set(r.id, r)
    return m
  }, [resourcesQ.data])

  const selectedResource = resourcesMap.get(form.resource_id) ?? null

  // Sort: pending first, then by created_at desc
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
        return_date:
          form.return_date ? fromDatetimeLocalValue(form.return_date) : null,
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
        setFeedback({
          text: e instanceof Error ? e.message : 'Error',
          variant: 'error',
        }),
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

  if (!projectId) return null

  return (
    <div className="space-y-6">
      {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Pedidos de stock</h2>
          {!requestsQ.isLoading && requestsQ.data && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {canManageRequests
                ? `${requestsQ.data.total} pedido${requestsQ.data.total === 1 ? '' : 's'} en total`
                : 'Tus pedidos dentro de este proyecto'}
            </p>
          )}
        </div>
        <ActionButton
          intent="primary"
          onClick={() => {
            setFeedback(null)
            setForm(EMPTY_FORM)
            setCreateOpen(true)
          }}
          disabled={resourcesQ.isLoading}
        >
          <Plus className="w-4 h-4 mr-1" />
          Nuevo pedido
        </ActionButton>
      </div>

      {requestsQ.isError && (
        <p className="text-sm text-destructive">
          {requestsQ.error instanceof ApiError
            ? requestsQ.error.message
            : 'Error al cargar los pedidos'}
        </p>
      )}

      {requestsQ.isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Desktop table */}
      {!requestsQ.isLoading && sorted.length > 0 && (
        <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="font-medium px-4 py-3">Ítem</th>
                <th className="font-medium px-4 py-3 text-center">Cant.</th>
                <th className="font-medium px-4 py-3">Retiro</th>
                <th className="font-medium px-4 py-3 hidden lg:table-cell">Devolución</th>
                <th className="font-medium px-4 py-3">Solicitante</th>
                <th className="font-medium px-4 py-3">Estado</th>
                {canManageRequests && (
                  <th className="font-medium px-4 py-3 text-right w-[1%] whitespace-nowrap">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((req) => (
                <tr
                  key={req.id}
                  className="border-b border-border/80 last:border-0 hover:bg-muted/25 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{req.resource_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {RESOURCE_TYPE_LABELS[req.resource_type]}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">{req.quantity}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {formatDate(req.withdrawal_date)}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap hidden lg:table-cell">
                    {formatDate(req.return_date)}
                  </td>
                  <td className="px-4 py-3 text-xs">{req.requester_name}</td>
                  <td className="px-4 py-3">
                    <StockRequestStatusBadge status={req.status} />
                  </td>
                  {canManageRequests && (
                    <td className="px-4 py-3">
                      <RequestActions
                        req={req}
                        onApprove={() => approveM.mutate(req.id)}
                        onReject={() => rejectM.mutate(req.id)}
                        onDeliver={() => deliverM.mutate(req.id)}
                        onReturn={() => returnM.mutate(req.id)}
                        isPending={
                          approveM.isPending ||
                          rejectM.isPending ||
                          deliverM.isPending ||
                          returnM.isPending
                        }
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      {!requestsQ.isLoading && sorted.length > 0 && (
        <div className="md:hidden space-y-3">
          {sorted.map((req) => (
            <Card key={req.id}>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{req.resource_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {RESOURCE_TYPE_LABELS[req.resource_type]} · {req.quantity} unid.
                    </p>
                  </div>
                  <StockRequestStatusBadge status={req.status} />
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Retiro: {formatDate(req.withdrawal_date)}</p>
                  {req.return_date && <p>Devolución: {formatDate(req.return_date)}</p>}
                  <p>Solicitado por: {req.requester_name}</p>
                  {req.notes && <p className="italic">"{req.notes}"</p>}
                </div>
                {canManageRequests && (
                  <RequestActions
                    req={req}
                    onApprove={() => approveM.mutate(req.id)}
                    onReject={() => rejectM.mutate(req.id)}
                    onDeliver={() => deliverM.mutate(req.id)}
                    onReturn={() => returnM.mutate(req.id)}
                    isPending={
                      approveM.isPending ||
                      rejectM.isPending ||
                      deliverM.isPending ||
                      returnM.isPending
                    }
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!requestsQ.isLoading && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Package className="w-10 h-10 text-muted-foreground/50" />
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

      {/* ── Dialog: Nuevo pedido ─────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo pedido de stock</DialogTitle>
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
            error={createM.error ? (createM.error instanceof Error ? createM.error.message : 'Error al crear') : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Action buttons per request ───────────────────────────────

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
      <div className="flex justify-end items-center gap-1">
        <ActionButton
          intent="approve"
          disabled={isPending}
          onClick={onApprove}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Aprobar
        </ActionButton>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <ActionButton intent="reject" disabled={isPending}>
              <X className="w-4 h-4" />
              Rechazar
            </ActionButton>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Rechazar pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                El pedido de <strong>{req.resource_name}</strong> ({req.quantity} unid.) solicitado por{' '}
                {req.requester_name} será rechazado.
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
      </div>
    )
  }

  if (req.status === 'RESERVADO') {
    return (
      <div className="flex justify-end">
        <ActionButton
          intent="deliver"
          disabled={isPending}
          onClick={onDeliver}
        >
          <Truck className="w-3.5 h-3.5" />
          Entregar
        </ActionButton>
      </div>
    )
  }

  if (req.status === 'ENTREGADO' && req.resource_type === 'returnable') {
    return (
      <div className="flex justify-end">
        <ActionButton
          intent="return"
          disabled={isPending}
          onClick={onReturn}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Devolver
        </ActionButton>
      </div>
    )
  }

  return null
}

// ── Create request form ──────────────────────────────────────

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
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="req-resource">Ítem de inventario</Label>
        <Select value={form.resource_id} onValueChange={(v) => set('resource_id', v)}>
          <SelectTrigger id="req-resource" className="h-11">
            <SelectValue placeholder="Seleccioná un ítem…" />
          </SelectTrigger>
          <SelectContent>
            {resources.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
                <span className="ml-2 text-muted-foreground text-xs">
                  ({RESOURCE_TYPE_LABELS[r.type]} · {r.available_stock} disp.)
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="req-quantity">Cantidad</Label>
        <Input
          id="req-quantity"
          type="number"
          min={1}
          value={form.quantity}
          onChange={(e) => set('quantity', e.target.value)}
          className="h-11"
          placeholder="1"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="req-withdrawal">Fecha de retiro</Label>
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
          <Label htmlFor="req-return">
            Fecha de devolución
            <span className="ml-1 text-destructive text-xs">*</span>
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
        <Label htmlFor="req-notes">Notas</Label>
        <Textarea
          id="req-notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          placeholder="Ej: Para el evento del sábado"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}
      <Button disabled={isPending} onClick={onSubmit} className="w-full">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear pedido'}
      </Button>
    </div>
  )
}
