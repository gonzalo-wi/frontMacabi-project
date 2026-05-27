import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Package,
  RotateCcw,
  Truck,
  X,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { PageHeader } from '@/components/PageHeader'
import { StockRequestStatusBadge } from '@/components/StatusBadge'
import { ActionButton } from '@/components/ActionButton'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  approveRequest,
  deliverRequest,
  getRequest,
  rejectRequest,
  returnRequest,
} from '@/features/stock/api/requestsApi'
import type { ResourceType } from '@/features/stock/model/types'
import { useMyProjectMemberships } from '@/features/projects/hooks/useMyProjectMemberships'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'

// ── Constants ────────────────────────────────────────────────

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  returnable: 'Retornable',
  consumable: 'Consumible',
}

// ── Helper ───────────────────────────────────────────────────

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

// ── Page ─────────────────────────────────────────────────────

export default function AdminStockRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token, user, isRestoring } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const qc = useQueryClient()
  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

  const requestQ = useQuery({
    queryKey: ['stock-request-detail', id, token],
    enabled: Boolean(token && id) && !isRestoring,
    queryFn: () => getRequest(token!, id!),
  })

  const req = requestQ.data
  const membershipsQ = useMyProjectMemberships(token, user?.id, isRestoring)
  const member = membershipsQ.data?.find((m) => m.id === req?.project_id)

  // ── Transition mutations ────────────────────────────────────

  function makeTransition(
    fn: (token: string, rid: string) => Promise<void>,
    successText: string,
  ) {
    return useMutation({
      mutationFn: () => fn(token!, id!),
      onSuccess: async () => {
        setFeedback({ text: successText, variant: 'success' })
        await qc.invalidateQueries({ queryKey: ['stock-request-detail', id] })
        await qc.invalidateQueries({ queryKey: ['project-stock-requests', req?.project_id] })
        await qc.invalidateQueries({ queryKey: ['admin-stock-resources'] })
      },
      onError: (e) =>
        setFeedback({ text: e instanceof Error ? e.message : 'Error', variant: 'error' }),
    })
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const approveM = makeTransition(approveRequest, 'Pedido aprobado y stock reservado.')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rejectM = makeTransition(rejectRequest, 'Pedido rechazado.')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const deliverM = makeTransition(deliverRequest, 'Pedido marcado como entregado.')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const returnM = makeTransition(returnRequest, 'Ítem marcado como devuelto.')

  const participantView = !pathname.startsWith('/app/admin/')
  const canManageRequest = user?.role === 'admin' || member?.role === 'coordinator'

  const anyPending =
    approveM.isPending || rejectM.isPending || deliverM.isPending || returnM.isPending

  // ── Render ─────────────────────────────────────────────────

  if (!id) return null

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={Package}
        title="Pedido de stock"
        subtitle="Detalle del pedido, proyecto asociado y acciones disponibles."
        action={
          <ActionButton
            intent="back"
            onClick={() => {
              if (participantView) {
                navigate('/app/stock')
                return
              }
              navigate(-1)
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </ActionButton>
        }
      />

      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
        {feedback && (
          <FeedbackBanner message={feedback.text} variant={feedback.variant} />
        )}

        {requestQ.isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {requestQ.isError && (
          <p className="text-sm text-destructive text-center py-8">
            {requestQ.error instanceof ApiError
              ? requestQ.error.message
              : 'No se pudo cargar el pedido.'}
          </p>
        )}

        {req && (
          <>
            {/* Status + resource */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                  {req.resource_name}
                </CardTitle>
                <StockRequestStatusBadge status={req.status} />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Tipo de ítem" value={RESOURCE_TYPE_LABELS[req.resource_type]} />
                <Row label="Cantidad" value={String(req.quantity)} />
                <Row label="Proyecto" value={req.project_name} />
                <Row label="Solicitado por" value={req.requester_name} />
                <Row label="Fecha de retiro" value={formatDate(req.withdrawal_date)} />
                <Row label="Fecha de devolución" value={formatDate(req.return_date)} />
                {req.notes && <Row label="Notas" value={req.notes} />}
                <Row label="Creado el" value={formatDate(req.created_at)} />
              </CardContent>
            </Card>

            {/* Actions */}
            {canManageRequest && req.status !== 'DEVUELTO' && req.status !== 'RECHAZADO' && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Acciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {req.status === 'PENDIENTE' && (
                    <>
                      <ActionButton
                        intent="approve"
                        disabled={anyPending}
                        onClick={() => { setFeedback(null); approveM.mutate() }}
                      >
                        {approveM.isPending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <CheckCircle2 className="w-4 h-4" />}
                        Aprobar
                      </ActionButton>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <ActionButton intent="reject" disabled={anyPending}>
                            {rejectM.isPending
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <X className="w-4 h-4" />}
                            Rechazar
                          </ActionButton>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Rechazar pedido?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se marcará como rechazada y el stock no será reservado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground"
                              onClick={() => { setFeedback(null); rejectM.mutate() }}
                            >
                              Rechazar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}

                  {req.status === 'RESERVADO' && (
                    <ActionButton
                      intent="deliver"
                      disabled={anyPending}
                      onClick={() => { setFeedback(null); deliverM.mutate() }}
                    >
                      {deliverM.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Truck className="w-4 h-4" />}
                      Entregar
                    </ActionButton>
                  )}

                  {req.status === 'ENTREGADO' && req.resource_type === 'returnable' && (
                    <ActionButton
                      intent="return"
                      disabled={anyPending}
                      onClick={() => { setFeedback(null); returnM.mutate() }}
                    >
                      {returnM.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <RotateCcw className="w-4 h-4" />}
                      Devolver
                    </ActionButton>
                  )}
                </CardContent>
              </Card>
            )}

            {!participantView && (
            <div className="flex justify-center">
              <ActionButton
                intent="secondary"
                onClick={() =>
                  navigate(`/app/admin/proyectos/${req.project_id}/recursos`)
                }
              >
                Ver pedidos del proyecto
              </ActionButton>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Row helper ───────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
