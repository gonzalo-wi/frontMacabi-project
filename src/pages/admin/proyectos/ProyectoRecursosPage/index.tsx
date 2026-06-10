import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Package, Plus } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { useFeedback } from '@/hooks/useFeedback'
import { ActionButton } from '@/components/ActionButton'
import { PaginationControls } from '@/components/data/PaginationControls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { fromDatetimeLocalValue } from '@/features/events/lib/datetimeLocal'
import {
  approveRequest,
  createRequest,
  deliverRequest,
  rejectRequest,
  returnRequest,
} from '@/features/stock/api/requestsApi'
import { listResources } from '@/features/stock/api/stockApi'
import { useProjectStockRequests } from '@/features/stock/hooks/useProjectStockRequests'
import type { RequestStatus, ResourceDTO } from '@/features/stock/model/types'
import { useProjectRole } from '@/hooks/useProjectRole'
import { ApiError } from '@/lib/api/apiClient'
import { REQUEST_STATUS_ORDER } from '@/lib/status'
import { useAuth } from '@/hooks/useAuth'

import { CreateRequestForm, type RequestFormState } from './CreateRequestForm'
import { RequestRow } from './RequestRow'
import { SkeletonRows } from './SkeletonRows'

const EMPTY_FORM: RequestFormState = {
  resource_id: '',
  quantity: '1',
  withdrawal_date: '',
  return_date: '',
  notes: '',
}

async function fetchAllResources(token: string): Promise<ResourceDTO[]> {
  const { data } = await listResources(token, 1, 200)
  return data
}

export default function ProyectoRecursosPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()
  const qc = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<RequestFormState>(EMPTY_FORM)
  const { feedback, setFeedback } = useFeedback()

  const requestsQ = useProjectStockRequests(token, projectId, page, isRestoring)

  const resourcesQ = useQuery({
    queryKey: ['stock-resources-all', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => fetchAllResources(token!),
  })

  const { canManage: canManageRequests } = useProjectRole(projectId)

  const resourcesMap = useMemo(() => {
    const m = new Map<string, ResourceDTO>()
    for (const r of resourcesQ.data ?? []) m.set(r.id, r)
    return m
  }, [resourcesQ.data])

  const selectedResource = resourcesMap.get(form.resource_id) ?? null

  const sorted = useMemo(() => {
    return [...(requestsQ.data?.data ?? [])].sort((a, b) => {
      const sd = REQUEST_STATUS_ORDER[a.status] - REQUEST_STATUS_ORDER[b.status]
      if (sd !== 0) return sd
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [requestsQ.data])

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<RequestStatus, number>> = {}
    for (const req of requestsQ.data?.data ?? []) {
      counts[req.status] = (counts[req.status] ?? 0) + 1
    }
    return counts
  }, [requestsQ.data])

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

  function makeTransitionMutation(
    fn: (token: string, id: string) => Promise<void>,
    successText: string,
  ) {
    return useMutation({
      mutationFn: (id: string) => fn(token!, id),
      onSuccess: async () => {
        setFeedback({ text: successText, variant: 'success' })
        await qc.invalidateQueries({ queryKey: ['project-stock-requests', projectId] })
        // Esta página lista recursos con la key 'stock-resources-all'; tras reservar/
        // devolver stock hay que invalidarla para refrescar el disponible en pantalla.
        await qc.invalidateQueries({ queryKey: ['stock-resources-all'] })
      },
      onError: (e) =>
        setFeedback({ text: e instanceof Error ? e.message : 'Error', variant: 'error' }),
    })
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const approveM = makeTransitionMutation(approveRequest, 'Pedido aprobado y material reservado.')
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

      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-primary shrink-0" />
                Pedidos de materiales
              </CardTitle>

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
          {requestsQ.isError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {requestsQ.error instanceof ApiError
                ? requestsQ.error.message
                : 'Error al cargar los pedidos'}
            </div>
          )}

          {requestsQ.isLoading && <SkeletonRows count={4} />}

          {!requestsQ.isLoading &&
            sorted.map((req) => (
              <RequestRow
                key={req.id}
                req={req}
                canManage={canManageRequests}
                isPending={anyPending}
                onApprove={() => approveM.mutate(req.id)}
                onReject={() => rejectM.mutate(req.id)}
                onDeliver={() => deliverM.mutate(req.id)}
                onReturn={() => returnM.mutate(req.id)}
              />
            ))}

          {!requestsQ.isLoading && sorted.length === 0 && !requestsQ.isError && (
            <div className="flex flex-col items-center gap-2.5 py-10 text-center border border-dashed rounded-xl">
              <Package className="w-9 h-9 text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">
                Todavía no hay pedidos de materiales para este proyecto.
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Package className="w-4 h-4 text-primary" />
              </div>
              Nuevo pedido de material
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
