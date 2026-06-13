import { useMemo, useState } from 'react'
import { Package, Plus } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ActionButton } from '@/components/ActionButton'
import { FeedbackBanner } from '@/components/FeedbackBanner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createRequest } from '@/features/stock/api/requestsApi'
import { fetchAllResources } from '@/features/stock/api/stockApi'
import { CreateRequestForm, type RequestFormState } from '@/features/stock/components/CreateRequestForm'
import { StockRequestsList } from '@/features/stock/components/StockRequestsList'
import { useProjectStockRequests } from '@/features/stock/hooks/useProjectStockRequests'
import type { RequestStatus, ResourceDTO } from '@/features/stock/model/types'
import { fromDatetimeLocalValue } from '@/features/events/lib/datetimeLocal'
import { useFeedback } from '@/hooks/useFeedback'

const EMPTY_FORM: RequestFormState = {
  resource_id: '',
  quantity: '1',
  withdrawal_date: '',
  return_date: '',
  notes: '',
}

/**
 * Pedidos de stock de un proyecto. Vista única para admin y coordinador:
 * lista read-only → detalle (donde se gestionan los estados según permiso).
 * Con `canManage`, suma el botón "Nuevo pedido".
 */
export function ProjectStockPanel({
  token,
  projectId,
  canManage = false,
}: {
  token: string
  projectId: string
  canManage?: boolean
}) {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<RequestFormState>(EMPTY_FORM)
  const { feedback, setFeedback } = useFeedback()

  const requestsQ = useProjectStockRequests(token, projectId, page, false)

  const resourcesQ = useQuery({
    queryKey: ['stock-resources-all', token],
    enabled: Boolean(token) && canManage,
    queryFn: () => fetchAllResources(token),
  })

  const resourcesMap = useMemo(() => {
    const m = new Map<string, ResourceDTO>()
    for (const r of resourcesQ.data ?? []) m.set(r.id, r)
    return m
  }, [resourcesQ.data])
  const selectedResource = resourcesMap.get(form.resource_id) ?? null

  const requests = requestsQ.data?.data ?? []
  const totalRequests = requestsQ.data?.total ?? 0

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<RequestStatus, number>> = {}
    for (const req of requests) counts[req.status] = (counts[req.status] ?? 0) + 1
    return counts
  }, [requests])

  const createM = useMutation({
    mutationFn: async () => {
      if (!form.resource_id) throw new Error('Seleccioná un ítem de inventario')
      const qty = Number(form.quantity)
      if (!qty || qty < 1) throw new Error('La cantidad debe ser mayor a 0')
      if (!form.withdrawal_date) throw new Error('La fecha de retiro es requerida')
      if (selectedResource?.type === 'returnable' && !form.return_date)
        throw new Error('La fecha de devolución es requerida para recursos retornables')

      await createRequest(token, {
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

  return (
    <div className="space-y-4">
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

            {canManage && (
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
            )}
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-5">
          <StockRequestsList
            requests={requests}
            isLoading={requestsQ.isLoading}
            isError={requestsQ.isError}
            error={requestsQ.error}
            detailBasePath="/app/stock/requests"
            emptyMessage="Todavía no hay pedidos de materiales para este proyecto."
            page={page}
            totalPages={requestsQ.data?.total_pages ?? 1}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {canManage && (
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
      )}
    </div>
  )
}
